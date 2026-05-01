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
      setError('необхідно вказати пошту та пароль')
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
        setError(data.error ?? 'сервер недоступний — спробуйте знову')
        return
      }
      login(data.token, data.user)
      navigate('/')
    } catch {
      setError('сервер недоступний — спробуйте знову')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="logo">ARCHEO-FIT</span>
          <span className="auth-tagline">// відновлення форми з уламків</span>
        </div>
        <h2 className="auth-heading">ВХІД ДО СИСТЕМИ</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="auth-fields">
            {error && (
              <div className="auth-error-banner" role="alert">
                {error}
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-email">Електронна пошта</label>
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
              <label className="auth-label" htmlFor="login-password">Пароль</label>
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
              {loading ? 'ВХІД…' : 'УВІЙТИ'}
            </button>
          </div>
        </form>

        <p className="auth-nav-link">
          Немає акаунту?{' '}
          <Link to="/register" className="auth-link">Реєстрація →</Link>
        </p>
      </div>
    </div>
  )
}
