import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useProjectStore from '../store/useProjectStore'
import useAuthStore from '../store/authStore'
import { useRole } from '../hooks/useRole'
import './ProjectsPage.css'

export default function ProjectsPage() {
  const navigate  = useNavigate()
  const role      = useRole()
  const logout    = useAuthStore((state) => state.logout)

  const { projects, loading, error, fetchProjects, createProject } = useProjectStore()

  // New Project form state
  const [showForm, setShowForm]       = useState(false)
  const [newName, setNewName]         = useState('')
  const [newDesc, setNewDesc]         = useState('')
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState(null)

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const project = await createProject(newName.trim(), newDesc.trim())
      // D-05: navigate to /projects/:id after creation
      navigate(`/projects/${project.id}`)
    } catch (err) {
      setCreateError(err.message)
      setCreating(false)
    }
  }

  function handleEndSession() {
    logout()
    navigate('/login')
  }

  return (
    <div className="projects-page">
      {/* ── Header ── */}
      <header className="projects-header">
        <div className="projects-header-left">
          <h1 className="logo">PUZZLE FORGE</h1>
          <span className="tagline">// відновлення форми з уламків</span>
        </div>
        <div className="projects-header-right">
          {role === 'admin' && <span className="admin-badge">ADMIN</span>}
          <button className="btn-end-session" onClick={handleEndSession} type="button">
            END SESSION
          </button>
        </div>
      </header>

      {/* ── Page title + New Project button (admin only, D-05, D-06) ── */}
      <div className="projects-toolbar">
        <h2 className="projects-title">Projects</h2>
        {role === 'admin' && (
          <button
            className="btn-new-project"
            onClick={() => { setShowForm((v) => !v); setCreateError(null) }}
            type="button"
          >
            {showForm ? 'Cancel' : '+ New Project'}
          </button>
        )}
      </div>

      {/* ── New Project form (D-05) ── */}
      {showForm && role === 'admin' && (
        <form className="new-project-form" onSubmit={handleCreate}>
          <div className="form-group">
            <label htmlFor="proj-name">Project Name</label>
            <input
              id="proj-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Amphora Restoration 2024"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="proj-desc">Description</label>
            <textarea
              id="proj-desc"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Brief description of the artifact..."
              rows={3}
            />
          </div>
          {createError && <p className="form-error">{createError}</p>}
          <div className="form-actions">
            <button type="submit" className="btn-create" disabled={creating || !newName.trim()}>
              {creating ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      )}

      {/* ── State feedback ── */}
      {loading && <p className="projects-loading">Loading projects…</p>}
      {error && <p className="projects-error">{error}</p>}

      {/* ── Card grid (D-04, D-06) ── */}
      {!loading && projects.length === 0 && (
        <p className="projects-empty">No projects yet. Create one above.</p>
      )}

      <div className="projects-grid">
        {projects.map((project) => (
          <div
            key={project.id}
            className="project-card"
            onClick={() => navigate(`/projects/${project.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/projects/${project.id}`)}
          >
            <div className="card-header">
              <h3 className="card-name">{project.name}</h3>
              {/* D-04: status badge */}
              <span className={`card-status card-status--${project.status}`}>
                {project.status}
              </span>
            </div>
            {project.description && (
              <p className="card-description">
                {project.description.length > 120
                  ? project.description.slice(0, 120) + '…'
                  : project.description}
              </p>
            )}
            <div className="card-footer">
              <span className="card-fragments">
                {project.fragment_count ?? 0} fragment{project.fragment_count !== 1 ? 's' : ''}
              </span>
              <span className="card-date">
                {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
