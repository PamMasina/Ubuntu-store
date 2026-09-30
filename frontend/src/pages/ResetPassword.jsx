import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Banner } from '../components/States'

// Supabase sends the user here with a recovery token in the URL hash, and the
// client picks up a PASSWORD_RECOVERY session automatically. The old app sent
// people to "/" instead, so the flow could never be completed.
export default function ResetPassword() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // If the URL has no recovery token, getSession() returns null and this
    // page would otherwise sit there forever.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(Boolean(session))
    })
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setBusy(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      // The recovery session expires quickly, so the likeliest cause by far is
      // an expired link. Say so instead of showing a raw Supabase message.
      setError(
        /session|token|expired/i.test(updateError.message)
          ? 'This reset link has expired. Request a new one from the login page.'
          : updateError.message
      )
    } else {
      setDone(true)
      setTimeout(() => navigate('/', { replace: true }), 1500)
    }
    setBusy(false)
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Password updated</h1>
          <p className="muted">Taking you to the marketplace...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <h1>Choose a new password</h1>

        <Banner kind="error">{error}</Banner>

        {!ready && !error && (
          <Banner kind="info">
            Open this page from the link in your reset email, then set a new
            password here.
          </Banner>
        )}

        <div className="field">
          <label htmlFor="new-password">New password</label>
          <input
            id="new-password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={!ready}
          />
          <p className="hint">At least 8 characters.</p>
        </div>

        <div className="field">
          <label htmlFor="new-confirm">Confirm new password</label>
          <input
            id="new-confirm"
            className="input"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            disabled={!ready}
          />
        </div>

        <button className="btn" type="submit" disabled={busy || !ready}>
          {busy ? 'Updating...' : 'Update password'}
        </button>

        <p className="muted small auth-alt">
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </div>
  )
}
