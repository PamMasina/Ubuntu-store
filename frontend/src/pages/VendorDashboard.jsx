import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { Spinner, ErrorState, EmptyState, Banner } from '../components/States'
import StatusBadge, { orderHint } from '../components/StatusBadge'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'ready', label: 'Ready' },
  { value: 'collected', label: 'Collected' }
]

function matches(order, filter) {
  return filter === 'all' || order.status === filter
}

export default function VendorDashboard() {
  const { session, profile } = useAuth()
  const [listings, setListings] = useState([])
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [contact, setContact] = useState(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [listingData, orderData] = await Promise.all([
        api.getMyListings(session.access_token),
        api.getIncomingOrders(session.access_token)
      ])
      setListings(listingData)
      setOrders(orderData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [session.access_token])

  useEffect(() => { fetchData() }, [fetchData])

  const changeStatus = async (orderId, status) => {
    setActionError('')
    setBusy(true)
    try {
      await api.updateOrderStatus(orderId, status, session.access_token)
      await fetchData()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const showContact = async (orderId) => {
    try {
      const c = await api.getOrderContact(orderId, session.access_token)
      setContact(c)
    } catch (err) {
      setActionError(err.message)
    }
  }

  const activeListings = listings.filter((l) => l.status === 'active')
  const soldListings = listings.filter((l) => l.status === 'sold')
  const stockOut = listings.filter((l) => l.stock < 1).length
  const pendingOrders = orders.filter((o) => o.status === 'pending')
  const readyOrders = orders.filter((o) => o.status === 'ready')

  const visibleOrders = orders.filter((o) => matches(o, filter))

  return (
    <>
      <Header />
      <main className="page">
        <div className="section-head">
          <div>
            <h1>Vendor dashboard</h1>
            <p className="muted small">{profile?.full_name}</p>
          </div>
          <div className="actions">
            <Link className="btn" to="/vendor/listings/new">New listing</Link>
          </div>
        </div>

        <Banner kind={actionError ? 'error' : 'info'}>{actionError}</Banner>

        <div className="grid-stat">
          <div className="card stat-card">
            <p className="stat-number">{listings.length}</p>
            <p className="stat-label">Total listings</p>
          </div>
          <div className="card stat-card">
            <p className="stat-number">{activeListings.length}</p>
            <p className="stat-label">Active</p>
          </div>
          <div className="card stat-card">
            <p className="stat-number">{soldListings.length}</p>
            <p className="stat-label">Sold</p>
          </div>
          <div className="card stat-card">
            <p className="stat-number">{stockOut}</p>
            <p className="stat-label">Out of stock</p>
          </div>
          <div className="card stat-card">
            <p className="stat-number">{pendingOrders.length}</p>
            <p className="stat-label">Pending orders</p>
          </div>
          <div className="card stat-card">
            <p className="stat-number">{readyOrders.length}</p>
            <p className="stat-label">Ready for pickup</p>
          </div>
        </div>

        {loading ? <Spinner /> : error ? <ErrorState error={error} onRetry={fetchData} /> : null}

        <h2>Incoming orders</h2>
        <div className="chips" style={{ marginTop: '0.5rem' }}>
          {FILTERS.map((f) => (
            <button
              key={f.value}
              className={`chip ${filter === f.value ? 'active' : ''}`}
              onClick={() => setFilter(f.value)}
            >{f.value}</button>
          ))}
        </div>

        {visibleOrders.length === 0 ? (
          <EmptyState title="No orders" />
        ) : (
          <div className="stack">
            {visibleOrders.map((order) => (
              <div key={order.id} className="card" style={{ padding: '1rem' }}>
                <div className="row-between">
                  <div>
                    <Link to={`/orders/${order.id}`} className="mono">{order.reference}</Link>
                    <p className="muted small">{new Date(order.created_at).toLocaleDateString()} &middot; {order.meetup_point} &middot; {order.meetup_slot}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <p className="small">{order.items?.map((i) => `${i.title} x${i.quantity}`).join(', ')}</p>
                <p className="muted small">{orderHint(order.status)}</p>
                <div className="actions" style={{ marginTop: '0.75rem' }}>
                  {order.status === 'pending' && <button className="btn" disabled={busy} onClick={() => changeStatus(order.id, 'confirmed')}>Confirm</button>}
                  {order.status === 'confirmed' && <button className="btn" disabled={busy} onClick={() => changeStatus(order.id, 'ready')}>Mark ready</button>}
                  <button className="btn btn-ghost" onClick={() => showContact(order.id)}>Contact buyer</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 style={{ marginTop: '2rem' }}>My listings</h2>
        {listings.length === 0 ? <EmptyState title="No listings" action={<Link className="btn" to="/vendor/listings/new">New listing</Link>} /> : (
          <div className="grid">
            {listings.map((l) => (
              <div key={l.id} className="card listing-card">
                <div className="listing-image">{l.image_url ? <img src={l.image_url} alt="" /> : <span className="no-image">No image</span>}</div>
                <div className="listing-body">
                  <p className="listing-title">{l.title}</p>
                  <p className="listing-price">R{Number(l.price).toFixed(2)}</p>
                  <p className="listing-meta"><span>{l.category}</span><span>{l.stock} in stock</span></p>
                  <StatusBadge status={l.status} kind="listing" />
                  <div className="actions" style={{ marginTop: '0.75rem' }}>
                    <Link className="btn btn-quiet" to={`/vendor/listings/${l.id}/edit`}>Edit</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {contact && (
          <div className="modal-overlay" onClick={() => setContact(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Buyer contact</h3>
              <p><strong>{contact.profile.full_name}</strong></p>
              {contact.profile.phone && <p><a href={`tel:${contact.profile.phone}`}>{contact.profile.phone}</a></p>}
              {contact.profile.whatsapp && <p>WhatsApp: {contact.profile.whatsapp}</p>}
              <button className="btn btn-ghost" onClick={() => setContact(null)}>Close</button>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
