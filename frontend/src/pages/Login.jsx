import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [showForgot, setShowForgot] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const validate = () => {
    const errors = {}
    if (!email) errors.email = 'Email is required'
    if (!password) errors.password = 'Password is required'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage(error.message)
      setMessageType('error')
    }
    setLoading(false)
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!resetEmail) return

    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin
    })
    setLoading(false)
    if (!error) setResetSent(true)
  }

  if (showForgot) {
    return (
      <div className="login-container">
        <h2 className="login-title">Ubuntu Store</h2>
        <p className="login-subtitle">Reset your password</p>

        {resetSent ? (
          <div style={{ textAlign: 'center' }}>
            <p className="login-success">Reset link sent! Check your email.</p>
            <button
              className="login-btn login-btn-secondary"
              style={{ marginTop: '1rem' }}
              onClick={() => { setShowForgot(false); setResetSent(false); setResetEmail('') }}
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleForgotPassword}>
            <input
              className="login-input"
              type="email"
              placeholder="Enter your email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
            <button type="submit" className="login-btn login-btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <button
              type="button"
              className="login-btn login-btn-secondary"
              onClick={() => { setShowForgot(false); setResetEmail('') }}
            >
              Back to Login
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div className="login-container">
      <h2 className="login-title">Ubuntu Store</h2>
      <p className="login-subtitle">Campus Marketplace</p>

      <form className="login-form" onSubmit={handleLogin}>
        <div>
          <input
            className={`login-input ${fieldErrors.email ? 'has-error' : ''}`}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {fieldErrors.email && <p className="login-error">{fieldErrors.email}</p>}
        </div>

        <div>
          <input
            className={`login-input ${fieldErrors.password ? 'has-error' : ''}`}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {fieldErrors.password && <p className="login-error">{fieldErrors.password}</p>}
        </div>

        {message && <p className={messageType === 'error' ? 'login-error' : 'login-success'}>{message}</p>}

        <button type="submit" className="login-btn login-btn-primary" disabled={loading}>
          {loading ? 'Please wait...' : 'Log In'}
        </button>
      </form>

      <div className="login-divider" style={{ margin: '1rem 0' }}>
        New here?
      </div>

      <Link to="/signup" style={{ textDecoration: 'none' }}>
        <button className="login-btn login-btn-secondary">Create Account</button>
      </Link>

      <div className="login-forgot" style={{ marginTop: '1rem' }}>
        <button onClick={() => setShowForgot(true)}>Forgot password?</button>
      </div>
    </div>
  )
}
