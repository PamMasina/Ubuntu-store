import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import VendorHome from './pages/VendorHome'

function HomeRouter({ session }) {
  const role = session.user.user_metadata?.role
  if (role === 'vendor') return <VendorHome session={session} />
  return <Home session={session} />
}

function App() {
  const [session, setSession] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={session ? <HomeRouter session={session} /> : <Navigate to="/login" />}
        />
        <Route
          path="/login"
          element={session ? <Navigate to="/" /> : <Login />}
        />
        <Route
          path="/signup"
          element={session ? <Navigate to="/" /> : <Signup />}
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
