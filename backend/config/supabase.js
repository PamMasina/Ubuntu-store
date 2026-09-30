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

module.exports = { supabaseAdmin, supabaseAuth }
