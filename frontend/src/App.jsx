import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ResetPassword from './pages/ResetPassword'
import Home from './pages/Home'
import ListingDetail from './pages/ListingDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'
import Profile from './pages/Profile'
import VendorDashboard from './pages/VendorDashboard'
import VendorListingForm from './pages/VendorListingForm'
import SellerProfile from './pages/SellerProfile'
import Board from './pages/Board'
import NotFound from './pages/NotFound'

function FullPageLoader() {
  return <div className="page-loader">Loading...</div>
}

// Signed in, and we know the role. The wait on `loading` is what stops the
// login flash on a hard refresh.
function ProtectedRoute({ children, vendorOnly = false }) {
  const { session, profile, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader />
  if (!session) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  // The role has not loaded yet, or the user has no profile row yet. Wait
  // rather than bouncing them to a page they may be allowed to see.
  if (!profile) return <FullPageLoader />

  if (vendorOnly && profile.role !== 'vendor') {
    return <Navigate to="/" replace />
  }
  return children
}

function PublicOnlyRoute({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (session) return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <Signup />
          </PublicOnlyRoute>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/listing/:id"
        element={
          <ProtectedRoute>
            <ListingDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cart"
        element={
          <ProtectedRoute>
            <Cart />
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout"
        element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute>
            <Orders />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/:id"
        element={
          <ProtectedRoute>
            <OrderDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/seller/:id"
        element={
          <ProtectedRoute>
            <SellerProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/board"
        element={
          <ProtectedRoute>
            <Board />
          </ProtectedRoute>
        }
      />

      {/* Vendors get their own addressable dashboard rather than a route-less
          conditional swap on the home page. */}
      <Route
        path="/vendor"
        element={
          <ProtectedRoute vendorOnly>
            <VendorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/listings/new"
        element={
          <ProtectedRoute vendorOnly>
            <VendorListingForm />
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendor/listings/:id/edit"
        element={
          <ProtectedRoute vendorOnly>
            <VendorListingForm />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  )
}

export default App
