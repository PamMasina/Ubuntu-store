import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { Banner } from '../components/States'

const UNIVERSITY_DOMAINS = ['.ac.za', '.edu']

const SOUTH_AFRICAN_UNIVERSITIES = [
  'University of Cape Town',
  'University of Cape Town (Graduate School of Business)',
  'University of Stellenbosch',
  'University of the Western Cape',
  'University of Pretoria',
  'University of Johannesburg',
  'University of KwaZulu-Natal',
  'North-West University',
  'University of the Witwatersrand',
  'University of Limpopo',
  'University of Mpumalanga',
  'University of Fort Hare',
  'University of Venda',
  'Walter Sisulu University',
  'Nelson Mandela University',
  'University of the Free State',
  'University of KwaZulu-Natal (Howard College)',
  'Vaal University of Technology',
  'DUT - Durban University of Technology',
  'Tshwane University of Technology'
]

const isUniversityEmail = (value) =>
  UNIVERSITY_DOMAINS.some((domain) => value.toLowerCase().endsWith(domain))

const getPasswordChecks = (value) => [
  { label: 'At least 8 characters', ok: value.length >= 8 },
  { label: 'One uppercase letter', ok: /[A-Z]/.test(value) },
  { label: 'One lowercase letter', ok: /[a-z]/.test(value) },
  { label: 'One number', ok: /\d/.test(value) }
]

export default function Signup() {
  const [role, setRole] = useState('student')
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    university: '',
    password: '',
    confirm: '',
    terms: false
  })
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState('info')
  const [busy, setBusy] = useState(false)
  const [awaitingEmail, setAwaitingEmail] = useState(false)

  const navigate = useNavigate()
  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((current) => ({ ...current, [field]: value }))
  }

  const validate = () => {
    const next = {}
    const email = form.email.trim()

    if (form.full_name.trim().length < 2) next.full_name = 'Enter your full name'
    if (!email) {
      next.email = 'Enter your email'
    } else if (role === 'student' && !isUniversityEmail(email)) {
      // Client-side comfort only. The server is the authority; this is here to
      // save the user a round trip.
      next.email = 'Use your university email address'
    }
    if (role === 'student' && !form.university) next.university = 'Choose your university'
    if (!form.password) {
      next.password = 'Choose a password'
    } else {
      const failed = getPasswordChecks(form.password).filter((check) => !check.ok)
      if (failed.length) next.password = failed[0].label
    }
    if (form.password !== form.confirm) next.confirm = 'Passwords do not match'
    if (!form.terms) next.terms = 'You must accept the terms'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    if (!validate()) return

    setBusy(true)
    try {
      const result = await api.register({
        email: form.email.trim(),
        password: form.password,
        full_name: form.full_name.trim(),
        role,
        university: form.university,
        emailRedirectTo: `${window.location.origin}/`
      })

      // Email confirmation on: wait for the link. Confirmation off: Supabase
      // hands back a live session, so go straight in rather than showing a
      // "check your inbox" screen the user does not need.
      if (result.session) {
        navigate('/', { replace: true })
      } else {
        setAwaitingEmail(true)
      }
    } catch (err) {
      setMessage(err.message)
      setMessageKind('error')
    } finally {
      setBusy(false)
    }
  }

  if (awaitingEmail) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Check your inbox</h1>
          <p className="muted">
            We sent a verification link to <strong>{form.email.trim()}</strong>.
            Confirm your address, then log in.
          </p>
          <Link className="btn" to="/login">Go to login</Link>
        </div>
      </div>
    )
  }

  const passwordChecks = getPasswordChecks(form.password)

  return (
    <div className="auth-page">
      <form className="auth-card auth-card-wide" onSubmit={handleSubmit} noValidate>
        <h1>Create your account</h1>

        <Banner kind={messageKind}>{message}</Banner>

        <div className="field">
          <label htmlFor="role">I want to</label>
          <select
            id="role"
            className="input"
            value={role}
            onChange={(e) => { setRole(e.target.value); setErrors({}) }}
          >
            <option value="student">Buy things from other students</option>
            <option value="vendor">Sell things to other students</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="full_name">Full name</label>
          <input
            id="full_name"
            className={`input ${errors.full_name ? 'has-error' : ''}`}
            value={form.full_name}
            onChange={update('full_name')}
            autoComplete="name"
          />
          {errors.full_name && <p className="error-text">{errors.full_name}</p>}
        </div>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            className={`input ${errors.email ? 'has-error' : ''}`}
            type="email"
            value={form.email}
            onChange={update('email')}
            autoComplete="email"
          />
          {errors.email
            ? <p className="error-text">{errors.email}</p>
            : <p className="hint">Students: use your university address.</p>}
        </div>

        {role === 'student' && (
          <div className="field">
            <label htmlFor="university">University</label>
            <select
              id="university"
              className={`input ${errors.university ? 'has-error' : ''}`}
              value={form.university}
              onChange={update('university')}
            >
              <option value="">Select your university</option>
              {SOUTH_AFRICAN_UNIVERSITIES.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {errors.university && <p className="error-text">{errors.university}</p>}
          </div>
        )}

        <div className="field">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            className={`input ${errors.password ? 'has-error' : ''}`}
            type="password"
            value={form.password}
            onChange={update('password')}
            autoComplete="new-password"
          />
          {errors.password
            ? <p className="error-text">{errors.password}</p>
            : (
              <ul className="check-list">
                {passwordChecks.map((check) => (
                  <li key={check.label} className={check.ok ? 'check-ok' : 'check-no'}>
                    {check.ok ? '\u2713' : '\u25CB'} {check.label}
                  </li>
                ))}
              </ul>
            )}
        </div>

        <div className="field">
          <label htmlFor="confirm">Confirm password</label>
          <input
            id="confirm"
            className={`input ${errors.confirm ? 'has-error' : ''}`}
            type="password"
            value={form.confirm}
            onChange={update('confirm')}
            autoComplete="new-password"
          />
          {errors.confirm && <p className="error-text">{errors.confirm}</p>}
        </div>

        <div className="field">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.terms}
              onChange={update('terms')}
            />
            <span>
              I agree to the <Link to="/board">community rules</Link>: no
              counterfeit goods, and meet where it is safe.
            </span>
          </label>
          {errors.terms && <p className="error-text">{errors.terms}</p>}
        </div>

        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Creating account...' : 'Create account'}
        </button>

        <p className="muted small auth-alt">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  )
}
