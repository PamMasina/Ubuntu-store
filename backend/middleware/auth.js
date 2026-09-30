const { supabaseAuth, supabaseAdmin } = require('../config/supabase')

// Verifies the bearer token and attaches req.user plus req.profile.
//
// The role is read from the profiles table rather than user_metadata, because
// user_metadata is writable by the account holder: a student could set
// role: 'vendor' on their own token and the server would believe them.
async function auth(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = header.slice('Bearer '.length)
  const { data, error } = await supabaseAuth.auth.getUser(token)

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, university')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    return res.status(500).json({ error: 'Could not load profile' })
  }

  // A brand new user can hold a valid token before the signup trigger has
  // finished, so an absent profile is a transient state, not a rejection.
  if (!profile) {
    return res.status(403).json({ error: 'Profile not initialised yet' })
  }

  req.user = data.user
  req.profile = profile
  next()
}

// Guards a route to one role. Must run after auth.
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.profile) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    if (!roles.includes(req.profile.role)) {
      return res.status(403).json({ error: 'You do not have access to this resource' })
    }
    next()
  }
}

module.exports = { auth, requireRole }
