import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import './Signup.css'

const UNIVERSITY_DOMAINS = ['.ac.za', '.edu']
const SOUTH_AFRICAN_UNIVERSITIES = [
  'University of Cape Town',
  'Stellenbosch University',
  'University of the Witwatersrand',
  'University of Pretoria',
  'University of KwaZulu-Natal',
  'University of Johannesburg',
  'Rhodes University',
  'University of the Free State',
  'North-West University',
  'University of South Africa',
  'Cape Peninsula University of Technology',
  'Durban University of Technology',
  'Tshwane University of Technology',
  'Central University of Technology',
  'Walter Sisulu University',
  'University of Venda',
  'University of Limpopo',
  'University of Fort Hare',
  'Mangosuthu University of Technology',
  'Sefako Makgatho University'
]

function isUniversityEmail(email) {
  return UNIVERSITY_DOMAINS.some(domain => email.toLowerCase().endsWith(domain))
}

function getPasswordChecks(password) {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) }
  ]
}

export default function Signup() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('student')
  const [university, setUniversity] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [agreed, setAgreed] = useState(false)

  const pwChecks = getPasswordChecks(password)
  const allPwMet = pwChecks.every(c => c.met)

  const validate = () => {
    const errors = {}

    if (!fullName.trim()) errors.fullName = 'Full name is required'

    if (!email) {
      errors.email = 'Email is required'
    } else if (role === 'student' && !isUniversityEmail(email)) {
      errors.email = 'Students must use a university email (.ac.za or .edu)'
    }

    if (role === 'student' && !university) {
      errors.university = 'Select your university'
    }

    if (!password) {
      errors.password = 'Password is required'
    } else if (!allPwMet) {
      errors.password = 'Password does not meet requirements'
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    if (!agreed) errors.agreed = 'You must agree to the terms'

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSignup = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          role,
          university: role === 'student' ? university : null
        }
      }
    })

    if (error) {
      setMessage(error.message)
      setMessageType('error')
    } else {
      setMessage('Account created! Check your email to verify your account, then log in.')
      setMessageType('success')
    }
    setLoading(false)
  }

  if (messageType === 'success') {
    return (
      <div className="signup-container">
        <h2 className="signup-title">Ubuntu Store</h2>
        <p className="signup-subtitle">Account created</p>
        <p className="signup-success">{message}</p>
        <Link to="/login" style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem', color: '#1F4E79', fontSize: '14px' }}>
          Go to Login
        </Link>
      </div>
    )
  }

  return (
    <div className="signup-container">
      <h2 className="signup-title">Ubuntu Store</h2>
      <p className="signup-subtitle">Create your account</p>

      <form className="signup-form" onSubmit={handleSignup}>
        <div className="signup-field">
          <label>Full Name</label>
          <input
            className={`signup-input ${fieldErrors.fullName ? 'has-error' : ''}`}
            type="text"
            placeholder="e.g. Thabo Mokoena"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          {fieldErrors.fullName && <p className="signup-error">{fieldErrors.fullName}</p>}
        </div>

        <div className="signup-field">
          <label>Email</label>
          <input
            className={`signup-input ${fieldErrors.email ? 'has-error' : ''}`}
            type="email"
            placeholder={role === 'student' ? 'you@university.ac.za' : 'your@email.com'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {fieldErrors.email && <p className="signup-error">{fieldErrors.email}</p>}
        </div>

        <div className="signup-field">
          <label>I am a</label>
          <select
            className={`signup-select ${fieldErrors.role ? 'has-error' : ''}`}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="student">Student</option>
            <option value="vendor">Vendor</option>
          </select>
        </div>

        {role === 'student' && (
          <div className="signup-field">
            <label>University</label>
            <select
              className={`signup-select ${fieldErrors.university ? 'has-error' : ''}`}
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
            >
              <option value="">Select your university</option>
              {SOUTH_AFRICAN_UNIVERSITIES.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            {fieldErrors.university && <p className="signup-error">{fieldErrors.university}</p>}
          </div>
        )}

        <div className="signup-field">
          <label>Password</label>
          <input
            className={`signup-input ${fieldErrors.password ? 'has-error' : ''}`}
            type="password"
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {password && (
            <ul className="signup-pw-requirements">
              {pwChecks.map(check => (
                <li key={check.label} className={check.met ? 'met' : ''}>
                  {check.met ? '\u2713' : '\u25CB'} {check.label}
                </li>
              ))}
            </ul>
          )}
          {fieldErrors.password && <p className="signup-error">{fieldErrors.password}</p>}
        </div>

        <div className="signup-field">
          <label>Confirm Password</label>
          <input
            className={`signup-input ${fieldErrors.confirmPassword ? 'has-error' : ''}`}
            type="password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          {fieldErrors.confirmPassword && <p className="signup-error">{fieldErrors.confirmPassword}</p>}
        </div>

        <label className="signup-check">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span>I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></span>
        </label>
        {fieldErrors.agreed && <p className="signup-error">{fieldErrors.agreed}</p>}

        {message && messageType === 'error' && <p className="signup-error">{message}</p>}

        <button type="submit" className="signup-btn signup-btn-primary" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="signup-divider" style={{ margin: '1rem 0' }}>
        Already have an account?
      </div>

      <Link to="/login" style={{ textDecoration: 'none' }}>
        <button className="signup-btn signup-btn-secondary">Log In</button>
      </Link>
    </div>
  )
}
