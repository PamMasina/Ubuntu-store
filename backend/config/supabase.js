const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_KEY
const anonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment')
  process.exit(1)
}

// Two clients, deliberately separate.
//
// supabaseAdmin uses the service_role key and therefore bypasses row level
// security. Every route is responsible for checking ownership itself.
//
// supabaseAuth uses the anon key and is only for identity: verifying bearer
// tokens and creating sessions. Using the service key for auth would let this
// process mint or read any user's session.
const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

const supabaseAuth = createClient(supabaseUrl, anonKey || serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})

// A third client, bound to the caller's own JWT.
//
// The SECURITY DEFINER RPCs (place_order, update_order_status) read auth.uid()
// to decide who is ordering and who is allowed to move an order along. Under
// supabaseAdmin that resolves to NULL, because the request carries the
// service_role JWT rather than a user one, and both functions then bail out with
// "Not authenticated" no matter who is actually signed in. Forwarding the
// caller's token makes auth.uid() resolve to them.
//
// anon key + user JWT is the right pairing: the functions are SECURITY DEFINER,
// so they still run with the owner's privileges and bypass RLS.
function supabaseAsUser(token) {
  return createClient(supabaseUrl, anonKey || serviceKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  })
}

module.exports = { supabaseAdmin, supabaseAuth, supabaseAsUser }
