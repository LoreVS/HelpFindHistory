import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Dropzone from './components/Dropzone'
import FragmentCanvas from './components/FragmentCanvas'
import ProtectedRoute, { PublicOnlyRoute } from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import { useRole } from './hooks/useRole'
import useAuthStore from './store/authStore'
import './App.css'

// Original canvas — kept at /canvas for backwards compat (D-03)
function CanvasApp() {
  const role = useRole()
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  function handleEndSession() {
    logout()
    navigate('/login')
  }

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">PUZZLE FORGE</h1>
        <span className="tagline">// відновлення форми з уламків</span>
        {role === 'admin' && (
          <span className="admin-badge">ADMIN</span>
        )}
        {role === 'user' && (
          <span className="score-chip">&#9733; {user?.score ?? 0}</span>
        )}
        <div className="header-hint">
          <kbd>drag</kbd> переміщення &nbsp;·&nbsp; <kbd>corner</kbd> масштаб &nbsp;·&nbsp; <kbd>↻</kbd> ротація
        </div>
        {token && (
          <button
            className="btn-end-session"
            onClick={handleEndSession}
            type="button"
          >
            END SESSION
          </button>
        )}
      </header>
      <main className="main">
        <Dropzone />
        <FragmentCanvas />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        {/* D-01: / redirects to /projects */}
        <Route path="/" element={<Navigate to="/projects" replace />} />
        {/* D-02: primary project routes */}
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        {/* D-03: original canvas kept for backwards compat */}
        <Route path="/canvas" element={<CanvasApp />} />
      </Route>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}
