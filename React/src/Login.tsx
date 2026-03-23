import { useState, type FormEvent } from 'react'
import { API_BASE_URL } from './api'

type UserRole = 'admin' | 'user'

interface LoginUser {
  id: number
  email: string
  role: UserRole
  profile_image?: string | null
}

interface LoginSession {
  token: string
  user: LoginUser
}

interface LoginResponseShape {
  success?: boolean
  token?: string
  accessToken?: string
  message?: string
  user?: {
    id?: number | string
    email?: string
    role?: string
    profile_image?: string | null
  }
  id?: number | string
  email?: string
  role?: string
  profile_image?: string | null
}

function normalizeUser(raw: LoginResponseShape['user'] | LoginResponseShape | null | undefined, fallbackEmail: string): LoginUser | null {
  const email = String(raw?.email ?? fallbackEmail ?? '').trim()
  const role: UserRole = raw?.role === 'admin' ? 'admin' : 'user'
  const id = Number(raw?.id)
  if (!email) return null
  return {
    id: Number.isFinite(id) ? id : 0,
    email,
    role,
    profile_image: typeof raw?.profile_image === 'string' ? raw.profile_image : null,
  }
}

function normalizeSession(data: LoginResponseShape, credentials: { username: string }): LoginSession | null {
  const user = normalizeUser(data?.user ?? data, credentials.username)
  if (!user) return null
  const token = String(data?.token || data?.accessToken || '').trim() || 'dev-token'
  return { token, user }
}

export default function Login({ onLogin }: { onLogin?: (session: LoginSession) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      let data: LoginResponseShape = {}
      try {
        data = await res.json()
      } catch {
        // ignore
      }
      if (res.ok && data.success) {
        const session = normalizeSession(data, { username })
        if (!session) {
          setError('Login response is missing user details. Please try again or contact support.')
        } else {
          onLogin?.(session)
        }
      } else if (res.status === 401) {
        setError('Invalid credentials. Please check your email/password.')
      } else {
        setError(data.message || `Login failed (HTTP ${res.status})`)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Cannot reach the API. Make sure the backend server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h1>Welcome</h1>
      <p className="subtitle">Good Day!</p>
      <form onSubmit={handleSubmit} autoComplete="off">
        <input
          type="text"
          name="fake-username"
          autoComplete="username"
          tabIndex={-1}
          aria-hidden="true"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
        />
        <input
          type="password"
          name="fake-password"
          autoComplete="current-password"
          tabIndex={-1}
          aria-hidden="true"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }}
        />
        <div className="field">
          <label htmlFor="username">Email or username</label>
          <input
            id="username"
            className="input"
            name="login-email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Email or username"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="password-input-wrap">
            <input
              id="password"
              className="input password-input"
              name="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                const nextPassword = e.target.value
                setPassword(nextPassword)
                if (!nextPassword) {
                  setShowPassword(false)
                }
              }}
              placeholder="Password"
              autoComplete="new-password"
              spellCheck={false}
            />
            {password.length > 0 && (
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M1.5 12s3.8-6.5 10.5-6.5S22.5 12 22.5 12s-3.8 6.5-10.5 6.5S1.5 12 1.5 12Z" />
                  <circle cx="12" cy="12" r="3.2" />
                  {!showPassword && <path d="M3 21 21 3" />}
                </svg>
              </button>
            )}
          </div>
        </div>
        <p style={{ color: '#6c757d', fontSize: '12px', marginBottom: '16px' }}>
          
        </p>
        {error && <p style={{ color: '#ff6b6b', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}
        <button className="btn-signin" type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>

    </div>
  )
}
