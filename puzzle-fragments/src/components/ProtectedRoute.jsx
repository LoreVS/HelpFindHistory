import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../store/authStore'

/**
 * ProtectedRoute — per D-04
 * Redirects to /login if no valid token in store.
 * While store is not yet initialized (app boot), renders null (blank screen ~0ms).
 * Once initialized: token absent → /login; token present → <Outlet />.
 */
export default function ProtectedRoute() {
  const token = useAuthStore((state) => state.token)
  const initialized = useAuthStore((state) => state.initialized)

  if (!initialized) return null
  return token ? <Outlet /> : <Navigate to="/login" replace />
}

/**
 * PublicOnlyRoute — per UI-SPEC Interaction Contracts
 * Redirects to / if user is already authenticated.
 * Prevents logged-in users from visiting /login or /register.
 */
export function PublicOnlyRoute() {
  const token = useAuthStore((state) => state.token)
  const initialized = useAuthStore((state) => state.initialized)

  if (!initialized) return null
  return token ? <Navigate to="/" replace /> : <Outlet />
}
