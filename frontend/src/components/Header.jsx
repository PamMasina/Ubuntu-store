import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

// One header for the whole app. Previously every page rolled its own header,
// duplicated logout, and hid the cart entirely.
export default function Header({ title = 'Ubuntu Store' }) {
  const { user, isVendor, signOut } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const handleSignOut = async () => {
    setBusy(true)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="app-header">
      <Link to="/" className="app-brand">{title}</Link>

      <nav className="app-nav">
        {isVendor ? (
          <>
            <NavLink to="/vendor" end>Dashboard</NavLink>
            <NavLink to="/board">Board</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/" end>Browse</NavLink>
            <NavLink to="/orders">My Orders</NavLink>
            <NavLink to="/board">Board</NavLink>
          </>
        )}
      </nav>

      <div className="app-header-right">
        {!isVendor && (
          <NavLink to="/cart" className="app-cart">
            Cart
            {count > 0 && <span className="app-cart-badge">{count}</span>}
          </NavLink>
        )}
        <NavLink to="/profile" className="app-email" title={user?.email}>
          {user?.email}
        </NavLink>
        <button className="app-logout" onClick={handleSignOut} disabled={busy}>
          {busy ? 'Signing out...' : 'Log Out'}
        </button>
      </div>
    </header>
  )
}
