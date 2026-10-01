const express = require('express')
const router = express.Router()
const { supabaseAuth } = require('../config/supabase')
const { auth } = require('../middleware/auth')
const { requireString, badRequest } = require('../utils/validate')
const { ROLES } = require('../config/constants')

// Runs on the anon-key client. Registering or logging in with the service key
// would hand this process the ability to read and create any session.
router.post('/register', async (req, res) => {
  const email = requireString(req.body.email, 'Email', { max: 254 })
  const password = requireString(req.body.password, 'Password', { max: 200 })
  const fullName = requireString(req.body.full_name, 'Full name', { min: 2, max: 120 })
  const role = requireString(req.body.role || 'student', 'Role')
  const university = role === 'student'
    ? requireString(req.body.university, 'University', { max: 160 })
    : (req.body.university || '')

  if (!ROLES.includes(role)) {
    throw badRequest(`Role must be one of: ${ROLES.join(', ')}`)
  }
  if (password.length < 8) {
    throw badRequest('Password must be at least 8 characters')
  }

  // The profile row itself is created by the on_auth_user_created trigger, so
  // role and full_name travel as signup metadata and cannot be forged later.
  const { data, error } = await supabaseAuth.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role, university },
      emailRedirectTo: req.body.emailRedirectTo || undefined
    }
  })

  if (error) {
    // Supabase reports a duplicate signup with a 422 and a leaky message.
    const message = /already registered|already exists/i.test(error.message)
      ? 'An account with that email already exists'
      : error.message
    return res.status(400).json({ error: message })
  }

  res.status(201).json({
    user: { id: data.user.id, email: data.user.email },
    // Null when Supabase email confirmation is switched on.
    session: data.session
  })
})

router.post('/login', async (req, res) => {
  const email = requireString(req.body.email, 'Email', { max: 254 })
  const password = requireString(req.body.password, 'Password', { max: 200 })

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password })
  if (error) return res.status(401).json({ error: 'Incorrect email or password' })

  res.json({
    session: data.session,
    user: { id: data.user.id, email: data.user.email }
  })
})

// Lets the client confirm a fresh session before it starts calling protected
// routes, avoiding a redirect flash on a hard refresh.
router.get('/me', auth, (req, res) => {
  res.json({ user: { id: req.user.id, email: req.user.email }, profile: req.profile })
})

router.post('/verify', async (req, res) => {
  const email = requireString(req.body.email, 'Email', { max: 254 })
  const redirectTo = req.body.redirectTo

  const { error } = await supabaseAuth.auth.resend({
    type: 'signup',
    email,
    options: redirectTo ? { emailRedirectTo: redirectTo } : undefined
  })

  if (error) throw badRequest(error.message)
  res.json({ message: 'Verification email sent' })
})

module.exports = router
