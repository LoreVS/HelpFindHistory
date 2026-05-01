import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useProjectStore from '../store/useProjectStore'
import useAuthStore from '../store/authStore'
import { useRole } from '../hooks/useRole'
import { useTheme } from '../hooks/useTheme'
import './ProjectsPage.css'

function uaPlural(n, one, few, many) {
  const m = n % 100
  const d = n % 10
  if (m >= 11 && m <= 19) return many
  if (d === 1) return one
  if (d >= 2 && d <= 4) return few
  return many
}

export default function ProjectsPage() {
  const navigate  = useNavigate()
  const role      = useRole()
  const logout    = useAuthStore((state) => state.logout)
  const user      = useAuthStore((state) => state.user)

  const { theme, toggleTheme } = useTheme()

  const { projects, loading, error, fetchProjects, createProject, myAttempts, fetchMyAttempts, fetchUserScore } = useProjectStore()

  const finishedProjectIds = new Set(myAttempts.map((a) => a.project_id))
  const visibleProjects = role === 'admin'
    ? projects
    : projects.filter((p) => !finishedProjectIds.has(p.id))

  // New Project form state
  const [showForm, setShowForm]       = useState(false)
  const [newName, setNewName]         = useState('')
  const [newDesc, setNewDesc]         = useState('')
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState(null)
  const [newReward, setNewReward]     = useState(1)

  useEffect(() => {
    fetchProjects()
    if (role !== 'admin') {
      fetchMyAttempts()
      fetchUserScore()
    }
  }, [fetchProjects, fetchMyAttempts, fetchUserScore, role])

  function attemptStatusLabel(status) {
    if (status === 'published') return 'на перевірці'
    return status  // 'approved' | 'rejected' pass through as-is
  }

  async function handleCreate(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const project = await createProject(newName.trim(), newDesc.trim(), Number(newReward))
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
          <h1 className="logo">ARCHEO-FIT</h1>
          <span className="tagline">// відновлення форми з уламків</span>
        </div>
        <div className="projects-header-right">
          {role === 'admin' && <span className="admin-badge">АДМІН</span>}
          {role === 'user' && (
            <span className="score-chip">&#9733; {user?.score ?? 0}</span>
          )}
          <button
            className="btn-theme-toggle"
            onClick={toggleTheme}
            type="button"
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button className="btn-end-session" onClick={handleEndSession} type="button">
            ЗАВЕРШИТИ СЕСІЮ
          </button>
        </div>
      </header>

      {/* ── Page title + New Project button (admin only, D-05, D-06) ── */}
      <div className="projects-toolbar">
        <h2 className="projects-title">Проєкти</h2>
        {role === 'admin' && (
          <button
            className="btn-new-project"
            onClick={() => { setShowForm((v) => !v); setCreateError(null) }}
            type="button"
          >
            {showForm ? 'Скасувати' : '+ Новий проєкт'}
          </button>
        )}
      </div>

      {/* ── New Project form (D-05) ── */}
      {showForm && role === 'admin' && (
        <form className="new-project-form" onSubmit={handleCreate}>
          <div className="form-group">
            <label htmlFor="proj-name">Назва проєкту</label>
            <input
              id="proj-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="напр. Відновлення амфори 2024"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="proj-desc">Опис</label>
            <textarea
              id="proj-desc"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Короткий опис артефакту..."
              rows={3}
            />
          </div>
          <div className="form-group">
            <label htmlFor="proj-reward">Нагорода (бали)</label>
            <input
              id="proj-reward"
              type="number"
              min={1}
              value={newReward}
              onChange={(e) => setNewReward(e.target.value)}
              placeholder="напр. 5"
              required
            />
          </div>
          {createError && <p className="form-error">{createError}</p>}
          <div className="form-actions">
            <button type="submit" className="btn-create" disabled={creating || !newName.trim()}>
              {creating ? 'Створення…' : 'Створити проєкт'}
            </button>
          </div>
        </form>
      )}

      {/* ── State feedback ── */}
      {loading && <p className="projects-loading">Завантаження проєктів…</p>}
      {error && <p className="projects-error">{error}</p>}

      {/* ── Card grid (D-04, D-06) ── */}
      {!loading && visibleProjects.length === 0 && (
        <p className="projects-empty">Проєктів ще немає. Створіть перший вище.</p>
      )}

      <div className="projects-grid">
        {visibleProjects.map((project) => (
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
                {role === 'admin'
                  ? (() => { const n = project.attempt_count ?? 0; return `${n} ${uaPlural(n, 'спроба', 'спроби', 'спроб')}` })()
                  : (() => { const n = project.fragment_count ?? 0; return `${n} ${uaPlural(n, 'уламок', 'уламки', 'уламків')}` })()}
              </span>
              <span className="card-date">
                {new Date(project.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── My Finished Projects (COLLAB-04/06: non-admin users with submitted attempts) ── */}
      {role !== 'admin' && myAttempts.length > 0 && (
        <section className="finished-section">
          <h2 className="finished-title">Мої завершені проєкти</h2>
          <div className="projects-grid finished-grid">
            {myAttempts.map((attempt) => (
              <div
                key={attempt.id}
                className="project-card"
                onClick={() => navigate(`/projects/${attempt.project_id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/projects/${attempt.project_id}`)}
              >
                <div className="card-header">
                  <h3 className="card-name">{attempt.project_name}</h3>
                  <span className={`card-status card-status--${attempt.project_status}`}>
                    {attempt.project_status}
                  </span>
                </div>
                <div className="card-footer">
                  <span className={`attempt-pill attempt-pill--${attempt.status}`}>
                    {attemptStatusLabel(attempt.status)}
                  </span>
                  <span className="card-date">
                    {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
