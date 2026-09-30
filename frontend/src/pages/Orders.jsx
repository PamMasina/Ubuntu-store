import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { Spinner, ErrorState, EmptyState } from '../components/States'
import StatusBadge, { orderHint } from '../components/StatusBadge'
import StarRating from '../components/StarRating'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'In progress' },
  { value: 'collected', label: 'Collected' },
  { value: 'cancelled', label: 'Cancelled' }
]

function matches(order, filter) {
  if (filter === 'all') return true
  if (filter === 'active') return ['pending', 'confirmed', 'ready'].includes(order.status)
  return order.status === filter
}

export default function Orders() {
  const { session } = useAuth()
  const [orders, setOrders] = useState([])
  const [pendingReviews, setPendingReviews] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Which order each dialog is editing, and the draft state.
  const [reviewing, setReviewing] = useState(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [reviewError, setReviewError] = useState('')
  const [savingReview, setSavingReview] = useState(false)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [orderData, reviewData] = await Promise.all([
        api.getMyOrders(session.access_token),
        api.getPendingReviews(session.access_token).catch(() => [])
      ])
      setOrders(orderData)
      setPendingReviews(reviewData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [session.access_token])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  const openReview = (order) => {
    setReviewing(order)
    setRating(0)
    setComment('')
    setReviewError('')
  }

  const submitReview = async (e) => {
    e.preventDefault()
    setReviewError('')

    if (rating < 1) {
      setReviewError('Choose a star rating.')
      return
    }

    setSavingReview(true)
    try {
      await api.createReview(
        { order_id: reviewing.id, rating, comment: comment.trim() || null },
        session.access_token
      )
      setReviewing(null)
      await fetchOrders()
    } catch (err) {
      setReviewError(err.message)
    } finally {
      setSavingReview(false)
    }
  }

  const visible = orders.filter((order) => matches(order, filter))

  return (
    <>
      <Header />
      <main className="page page-medium">
        <h2>My orders</h2>

        {pendingReviews.length > 0 && (
          <div className="banner banner-info">
            You have {pendingReviews.length} completed{' '}
            {pendingReviews.length === 1 ? 'purchase' : 'purchases'} you have not
            reviewed yet. Find the review option on each order below.
          </div>
        )}

        <div className="chips" style={{ marginTop: '1rem' }}>
          {FILTERS.map((option) => (
            <button
              key={option.value}
              className={`chip ${filter === option.value ? 'active' : ''}`}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState error={error} onRetry={fetchOrders} />
        ) : visible.length === 0 ? (
          <EmptyState
            title="No orders here"
            action={<Link className="btn" to="/">Find something to buy</Link>}
          >
            {filter === 'all'
              ? 'You have not bought anything yet.'
              : 'Nothing matches this filter.'}
          </EmptyState>
        ) : (
          <div className="stack">
            {visible.map((order) => {
              const needsReview =
                order.status === 'collected' &&
                pendingReviews.some((pending) => pending.id === order.id)

              return (
                <div key={order.id} className="card" style={{ padding: '1.1rem' }}>
                  <div className="row-between">
                    <div>
                      <Link
                        to={`/orders/${order.id}`}
                        className="mono"
                        style={{ fontWeight: 700 }}
                      >
                        {order.reference}
                      </Link>
                      <p className="muted small" style={{ margin: '0.15rem 0 0' }}>
                        {new Date(order.created_at).toLocaleDateString()} &middot;{' '}
                        {order.meetup_point} &middot; {order.meetup_slot}
                      </p>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <p className="small" style={{ margin: '0.6rem 0 0' }}>
                    {order.items?.map((item) => `${item.title} x${item.quantity}`).join(', ')}
                  </p>
                  <p className="muted small">{orderHint(order.status)}</p>

                  <div className="row-between" style={{ marginTop: '0.75rem' }}>
                    <strong>R{Number(order.total).toFixed(2)}</strong>
                    <div className="actions">
                      {needsReview && (
                        <button className="btn btn-quiet" onClick={() => openReview(order)}>
                          Leave a review
                        </button>
                      )}
                      <Link className="btn btn-ghost" to={`/orders/${order.id}`}>
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {reviewing && (
          <div className="modal-overlay" onClick={() => setReviewing(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>Review your purchase</h3>
              <p className="muted small">
                Order <span className="mono">{reviewing.reference}</span>. Reviews
                are tied to a completed collection, and there is one per order.
              </p>

              <form onSubmit={submitReview}>
                <div className="field">
                  <label>Rating</label>
                  <StarRating value={rating} onChange={setRating} />
                </div>

                <div className="field">
                  <label htmlFor="review-comment">Comment (optional)</label>
                  <textarea
                    id="review-comment"
                    className="input"
                    rows={3}
                    maxLength={1000}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>

                {reviewError && <p className="error-text">{reviewError}</p>}

                <div className="actions">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setReviewing(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn" disabled={savingReview}>
                    {savingReview ? 'Submitting...' : 'Submit review'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
