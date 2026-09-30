import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import { api } from '../api'

const AuthContext = createContext(null)

// Single source of truth for "who is signed in and what is their role".
//
// role comes from the profiles table via /api/auth/me, not from
// user_metadata. user_metadata is writable by the account holder, so treating
// it as authoritative would let any student claim to be a vendor.
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  // The old code initialised session to null and resolved it in an effect,
  // so every hard refresh rendered the login screen for a frame before
  // bouncing back. This flag gates rendering until we actually know.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    // Returns the unsubscribe function, which the old code discarded. Under
    // StrictMode the effect runs twice and leaked a duplicate listener.
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!active) return
        setSession(nextSession)
        if (!nextSession) setProfile(null)
      }
    )

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  // Pull the authoritative profile whenever the identity changes.
  useEffect(() => {
    if (!session) {
      setProfile(null)
      return
    }

    let active = true
    api
      .me(session.access_token)
      .then((data) => {
        if (active) setProfile(data.profile)
      })
      .catch(() => {
        // A missing profile right after signup is expected: the database
        // trigger runs a moment after the auth row appears.
        if (active) setProfile(null)
      })

    return () => {
      active = false
    }
  }, [session])

  const value = useMemo(
    () => ({
      session,
      profile,
      loading,
      user: session?.user || null,
      role: profile?.role || null,
      isVendor: profile?.role === 'vendor',
      async signOut() {
        await supabase.auth.signOut()
        setProfile(null)
      }
    }),
    [session, profile, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
