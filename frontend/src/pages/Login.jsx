import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Login successful!')
    setLoading(false)
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setMessage(error.message)
    else setMessage('Account created! You can now log in.')
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', padding: '2rem', fontFamily: 'Arial' }}>
      <h2 style={{ color: '#1F4E79', textAlign: 'center' }}>Ubuntu Store</h2>
      <p style={{ textAlign: 'center', color: '#888' }}>Campus Marketplace</p>
      <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem' }}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
        />
        {message && <p style={{ color: message.includes('successful') || message.includes('created') ? 'green' : 'red', fontSize: '13px' }}>{message}</p>}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ padding: '10px', background: '#1F4E79', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
          {loading ? 'Please wait...' : 'Log In'}
        </button>
        <button
          onClick={handleRegister}
          disabled={loading}
          style={{ padding: '10px', background: 'white', color: '#1F4E79', border: '1px solid #1F4E79', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
          {loading ? 'Please wait...' : 'Create Account'}
        </button>
      </form>
    </div>
  )
}