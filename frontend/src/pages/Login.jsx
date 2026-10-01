import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'
import { supabase } from '../supabaseClient'
import { Banner } from '../components/States'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState('info')
  const [busy, setBusy] = useState(false)

  const navigate = useNavigate()
  const location = useLocation()

  const validate = () => {
    const next = {}
    if (!email.trim()) next.email = 'Enter your email'
    if (!password) next.password = 'Enter your password'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setMessage('')
    if (!validate()) return

    setBusy(true)
    try {
      const result = await api.login(email.trim(), password)
      if (result.session) {
        await supabase.auth.setSession(result.session)
      }
      // sendTo is where ProtectedRoute bounced them from, so a deep link
      // survives a login.
      navigate(location.state?.from || '/', { replace: true })
    } catch (err) {
      setMessage(err.message)
      setMessageKind('error')
    } finally {
      setBusy(false)
    }
  }

  // The old version swallowed the Supabase error entirely, so an invalid or
  // rate-limited address produced no feedback at all.
  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setMessage('')
    if (!resetEmail.trim()) {
      setMessage('Enter the email you signed up with')
      setMessageKind('error')
      return
    }

    setBusy(true)
    try {
      await api.resendVerification(
        resetEmail.trim(),
        `${window.location.origin}/reset-password`
      )
      setMessage('If that address has an account, a reset link is on its way.')
      setMessageKind('success')
    } catch (err) {
      setMessage(err.message)
      setMessageKind('error')
    } finally {
      setBusy(false)
    }
  }

  if (showForgot) {
    return (
      <div className="auth-page">
        <form className="auth-card" onSubmit={handleForgotPassword}>
          <h1>Reset your password</h1>
          <p className="muted small">
            We will email you a link to choose a new one.
          </p>
          <Banner kind={messageKind}>{message}</Banner>
          <div className="field">
            <label htmlFor="reset-email">Email</label>
            <input
              id="reset-email"
              className="input"
              type="email"
              autoComplete="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
          </div>
          <button className="btn" type="submit" disabled={busy}>
            {busy ? 'Sending...' : 'Send reset link'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => { setShowForgot(false); setMessage('') }}
          >
            Back to login
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleLogin} noValidate>
        <h1>Ubuntu Store</h1>
        <p className="muted">The campus marketplace.</p>

        <Banner kind={messageKind}>{message}</Banner>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className={`input ${errors.email ? 'has-error' : ''}`}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <p className="error-text">{errors.email}</p>}
        </div>

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className={`input ${errors.password ? 'has-error' : ''}`}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <p className="error-text">{errors.password}</p>}
        </div>

        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Signing in...' : 'Log In'}
        </button>

        <div className="row-between auth-alt">
          <Link to="/signup">Create an account</Link>
          <button
            type="button"
            className="link-button"
            onClick={() => { setShowForgot(true); setMessage('') }}
          >
            Forgot password?
          </button>
        </div>
      </form>
    </div>
  )
}
