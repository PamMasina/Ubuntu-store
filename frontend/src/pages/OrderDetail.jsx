import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import Header from '../components/Header'
import { Spinner, ErrorState, Banner } from '../components/States'
import StatusBadge, { orderHint } from '../components/StatusBadge'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

// The student-facing timeline. The vendor has the mirror image of this in
// VendorDashboard, and both are driven by the same allowed transitions in the
// database, so neither screen can offer an action the server will reject.
const STEPS = [
  { status: 'pending', label: 'Order placed' },
  { status: 'confirmed', label: 'Seller confirmed' },
  { status: 'ready', label: 'Ready for pickup' },
  { status: 'collected', label: 'Collected and paid' }
]

export default function OrderDetail() {
  const { id } = useParams()
  const { session, profile } = useAuth()

  const [order, setOrder] = useState(null)
  const [contact, setContact] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [cancelling, setCancelling] = useState(false)

  const fetchOrder = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getOrder(id, session.access_token)
      setOrder(data)
      // Contact details only matter once there is a meetup to get to.
      if (['confirmed', 'ready'].includes(data.status)) {
        api.getOrderContact(id, session.access_token).then(setContact).catch(() => {})
      } else {
        setContact(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id, session.access_token])

  useEffect(() => {
    fetchOrder()
  }, [fetchOrder])

  const changeStatus = async (status) => {
    setActionError('')
    setBusy(true)
    try {
      const updated = await api.updateOrderStatus(id, status, session.access_token)
      setOrder((current) => ({ ...current, ...updated }))
      await fetchOrder()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (<><Header /><main className="page page-narrow"><Spinner /></main></>)
  }

  if (error || !order) {
    return (
      <>
        <Header />
        <main className="page page-narrow">
          <ErrorState error={error || 'Order not found'} onRetry={fetchOrder} />
          <p className="right" style={{ marginTop: '1rem' }}>
            <Link to="/orders">Back to my orders</Link>
          </p>
        </main>
      </>
    )
  }

  const isBuyer = order.buyer_id === profile?.id
  const currentStep = STEPS.findIndex((step) => step.status === order.status)
  const isLive = !['collected', 'cancelled'].includes(order.status)

  const canCancel = isBuyer && ['pending', 'confirmed'].includes(order.status)
  const canCollect = isBuyer && order.status === 'ready'

  return (
    <>
      <Header />
      <main className="page page-medium">
        <p className="small muted"><Link to="/orders">My orders</Link></p>

        <div className="row-between" style={{ margin: '0.5rem 0 1.25rem' }}>
          <h1 className="mono" style={{ margin: 0 }}>{order.reference}</h1>
          <StatusBadge status={order.status} />
        </div>

        <Banner kind={actionError ? 'error' : 'info'}>
          {actionError || orderHint(order.status)}
        </Banner>

        <div className="card" style={{ padding: '1.25rem' }}>
          <h3>Items</h3>
          <table className="table">
            <tbody>
              {order.items?.map((item) => (
                <tr key={item.id}>
                  <td data-label="Item">
                    {item.listing_id
                      ? <Link to={`/listing/${item.listing_id}`}>{item.title}</Link>
                      : item.title}
                    <span className="muted small"> &times;{item.quantity}</span>
                  </td>
                  <td data-label="Unit price" className="right nowrap">
                    R{Number(item.unit_price).toFixed(2)}
                  </td>
                  <td data-label="Total" className="right nowrap">
                    R{(Number(item.unit_price) * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <hr className="divider" />
          <div className="row-between">
            <span>Total</span>
            <strong>R{Number(order.total).toFixed(2)}</strong>
          </div>
          <p className="muted small">
            {order.payment_status === 'paid'
              ? 'Paid in cash at collection.'
              : 'Pay the seller in cash when you collect.'}
          </p>
        </div>

        <div className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
          <h3>Meetup</h3>
          <dl className="stack" style={{ margin: 0 }}>
            <div>
              <dt className="small muted">Where</dt>
              <dd style={{ margin: 0 }}><strong>{order.meetup_point}</strong></dd>
            </div>
            <div>
              <dt className="small muted">When</dt>
              <dd style={{ margin: 0 }}><strong>{order.meetup_slot}</strong></dd>
            </div>
            {order.note && (
              <div>
                <dt className="small muted">Your note</dt>
                <dd style={{ margin: 0 }}>{order.note}</dd>
              </div>
            )}
          </dl>

          {contact && (
            <>
              <hr className="divider" />
              <p className="small muted" style={{ margin: 0 }}>
                {contact.role === 'seller' ? 'Seller' : 'Buyer'} contact
              </p>
              <p style={{ margin: '0.15rem 0 0' }}>
                <strong>{contact.profile.full_name}</strong>
              </p>
              {contact.profile.phone && (
                <p className="small" style={{ margin: '0.15rem 0 0' }}>
                  <a href={`tel:${contact.profile.phone}`}>{contact.profile.phone}</a>
                </p>
              )}
              {contact.profile.whatsapp && (
                <p className="small" style={{ margin: '0.15rem 0 0' }}>
                  WhatsApp: {contact.profile.whatsapp}
                </p>
              )}
            </>
          )}
        </div>

        {isLive && currentStep >= 0 && (
          <div className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
            <h3>Progress</h3>
            <ol className="timeline">
              {STEPS.map((step, index) => (
                <li
                  key={step.status}
                  className={`timeline-step ${index <= currentStep ? 'timeline-done' : ''}`}
                >
                  <span className="timeline-dot" aria-hidden="true" />
                  {step.label}
                </li>
              ))}
            </ol>

            <div className="actions" style={{ marginTop: '1rem' }}>
              {canCollect && (
                <button
                  className="btn"
                  disabled={busy}
                  onClick={() => changeStatus('collected')}
                >
                  {busy ? 'Updating...' : 'I have collected this'}
                </button>
              )}
              {canCancel && !cancelling && (
                <button
                  className="btn btn-quiet"
                  onClick={() => setCancelling(true)}
                >
                  Cancel order
                </button>
              )}
            </div>

            {cancelling && (
              <div className="banner banner-info" style={{ marginTop: '0.75rem' }}>
                <p style={{ margin: '0 0 0.5rem' }}>
                  Cancelling puts the item back on sale. This cannot be undone.
                </p>
                <div className="actions">
                  <button
                    className="btn btn-danger"
                    disabled={busy}
                    onClick={() => changeStatus('cancelled')}
                  >
                    Yes, cancel it
                  </button>
                  <button
                    className="btn btn-ghost"
                    onClick={() => setCancelling(false)}
                  >
                    Keep it
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {order.status === 'collected' && isBuyer && (
          <p className="muted small" style={{ marginTop: '1.25rem' }}>
            Enjoy it. You can leave a review from{' '}
            <Link to="/orders">My orders</Link>.
          </p>
        )}
      </main>
    </>
  )
}
