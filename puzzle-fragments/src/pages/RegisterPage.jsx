import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  function handleChange() {
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim() || !password || !confirmPassword) {
      setError('email and password are required')
      return
    }
    if (password !== confirmPassword) {
      setError('passwords do not match')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'server unavailable — try again')
        return
      }
      // D-10: auto-login after successful register
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
        <h2 className="auth-heading">CREATE ACCOUNT</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-fields">
            {error && (
              <div className="auth-error-banner" role="alert">
                {error}
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-email">email</label>
              <input
                id="reg-email"
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
              <label className="auth-label" htmlFor="reg-password">password</label>
              <input
                id="reg-password"
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => { setPassword(e.target.value); handleChange() }}
                disabled={loading}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="reg-confirm">confirm password</label>
              <input
                id="reg-confirm"
                type="password"
                className="auth-input"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); handleChange() }}
                disabled={loading}
                autoComplete="new-password"
                required
              />
            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
            >
              {loading ? 'REGISTERING…' : 'REGISTER ACCOUNT'}
            </button>
          </div>
        </form>

        <p className="auth-nav-link">
          Already have an account?{' '}
          <Link to="/login" className="auth-link">Login →</Link>
        </p>
      </div>
    </div>
  )
}
