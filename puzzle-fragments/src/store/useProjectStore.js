import { create } from 'zustand'
import useAuthStore from './authStore'

const API = 'http://localhost:3001'

function authHeaders() {
  const token = useAuthStore.getState().token
  return {
    Authorization: `Bearer ${token}`,
  }
}

const useProjectStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  projects: [],          // ProjectRow[] (list view)
  currentProject: null,  // ProjectRow & { fragments: FragmentRow[], attempts: AttemptRow[] }
  loading: false,
  error: null,

  // ── Actions ────────────────────────────────────────────────────────────────

  /** GET /api/projects — load project list */
  async fetchProjects() {
    set({ loading: true, error: null })
    try {
      const res = await fetch(`${API}/api/projects`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const projects = await res.json()
      set({ projects, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  /** GET /api/projects/:id — load one project with fragments + attempts */
  async fetchProject(id) {
    set({ loading: true, error: null, currentProject: null })
    try {
      const res = await fetch(`${API}/api/projects/${id}`, { headers: authHeaders() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const project = await res.json()
      set({ currentProject: project, loading: false })
    } catch (err) {
      set({ error: err.message, loading: false })
    }
  },

  /** POST /api/projects — create project, returns new project row */
  async createProject(name, description) {
    const res = await fetch(`${API}/api/projects`, {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `HTTP ${res.status}`)
    }
    const project = await res.json()
    // Prepend to list
    set((state) => ({ projects: [{ ...project, fragment_count: 0 }, ...state.projects] }))
    return project
  },

  /**
   * POST /api/projects/:id/fragments — upload one processed blob
   * blob: Blob (transparent PNG from background removal pipeline)
   * filename: original filename string
   * Returns the created fragment row from server.
   */
  async uploadFragment(projectId, blob, filename) {
    const formData = new FormData()
    formData.append('file', blob, filename)
    const res = await fetch(`${API}/api/projects/${projectId}/fragments`, {
      method: 'POST',
      headers: authHeaders(), // No Content-Type — browser sets multipart boundary
      body: formData,
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `HTTP ${res.status}`)
    }
    const fragment = await res.json()
    // Append to currentProject.fragments if it's the active project
    set((state) => {
      if (!state.currentProject || state.currentProject.id !== projectId) return {}
      return {
        currentProject: {
          ...state.currentProject,
          fragments: [...state.currentProject.fragments, fragment],
        },
      }
    })
    return fragment
  },

  /**
   * PATCH /api/projects/:id/layout — persist canvas positions
   * fragmentUpdates: Array<{ id: number, metadata: { x, y, rotation, scaleX, scaleY } }>
   */
  async saveLayout(projectId, fragmentUpdates) {
    const res = await fetch(`${API}/api/projects/${projectId}/layout`, {
      method: 'PATCH',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ fragments: fragmentUpdates }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `HTTP ${res.status}`)
    }
    return await res.json()
  },

  /** POST /api/projects/:id/close — close the project */
  async closeProject(projectId) {
    const res = await fetch(`${API}/api/projects/${projectId}/close`, {
      method: 'POST',
      headers: authHeaders(),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `HTTP ${res.status}`)
    }
    const updated = await res.json()
    // Update in list and currentProject
    set((state) => ({
      projects: state.projects.map((p) => p.id === projectId ? { ...p, status: 'closed', closed_at: updated.closed_at } : p),
      currentProject: state.currentProject?.id === projectId
        ? { ...state.currentProject, status: 'closed', closed_at: updated.closed_at }
        : state.currentProject,
    }))
    return updated
  },

  /** Update a single fragment's canvas position in currentProject state (local, not persisted) */
  updateLocalFragment(fragmentId, updates) {
    set((state) => {
      if (!state.currentProject) return {}
      return {
        currentProject: {
          ...state.currentProject,
          fragments: state.currentProject.fragments.map((f) =>
            f.id === fragmentId ? { ...f, metadata: { ...f.metadata, ...updates } } : f
          ),
        },
      }
    })
  },
}))

export default useProjectStore
