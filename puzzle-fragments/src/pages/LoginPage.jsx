import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  function handleChange() {
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password) {
      setError('email and password are required')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'server unavailable — try again')
        return
      }
      login(data.token, data.user)
      navigate('/')
    } catch {
      setError('server unavailable — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="logo">PUZZLE FORGE</span>
          <span className="auth-tagline">// відновлення форми з уламків</span>
        </div>
        <h2 className="auth-heading">ACCESS TERMINAL</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-fields">
            {error && (
              <div className="auth-error-banner" role="alert">
                {error}
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">email</label>
              <input
                id="login-email"
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => { setEmail(e.target.value); handleChange() }}
                disabled={loading}
                autoComplete="email"
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-password">password</label>
              <input
                id="login-password"
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => { setPassword(e.target.value); handleChange() }}
                disabled={loading}
                autoComplete="current-password"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
            >
              {loading ? 'AUTHENTICATING…' : 'AUTHENTICATE'}
            </button>
          </div>
        </form>

        <p className="auth-nav-link">
          Don't have an account?{' '}
          <Link to="/register" className="auth-link">Register →</Link>
        </p>
      </div>
    </div>
  )
}
