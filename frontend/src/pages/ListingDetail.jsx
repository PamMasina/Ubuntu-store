import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { Spinner, ErrorState, Banner } from '../components/States'
import StatusBadge from '../components/StatusBadge'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

function Stars({ value }) {
  if (!value) return <span className="muted small">No reviews yet</span>
  return (
    <span className="row" style={{ gap: '0.4rem' }}>
      <span aria-label={`${value} out of 5`}>
        {'\u2605'.repeat(Math.round(value))}
        <span className="muted">
          {'\u2606'.repeat(5 - Math.round(value))}
        </span>
      </span>
      <span className="small muted">{Number(value).toFixed(1)}</span>
    </span>
  )
}

export default function ListingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session, profile } = useAuth()
  const { add } = useCart()

  const [listing, setListing] = useState(null)
  const [reviews, setReviews] = useState({ reviews: [], averageRating: 0, reviewCount: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [quantity, setQuantity] = useState(1)

  const fetchListing = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getListing(id, session.access_token)
      setListing(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id, session.access_token])

  useEffect(() => {
    fetchListing()
  }, [fetchListing])

  useEffect(() => {
    if (!listing?.seller_id) return
    api
      .getReviews(listing.seller_id)
      .then(setReviews)
      .catch(() => setReviews({ reviews: [], averageRating: 0, reviewCount: 0 }))
  }, [listing?.seller_id])

  const isOwnListing = listing && profile && listing.seller_id === profile.id
  const soldOut = listing && listing.stock < 1

  const handleAddToCart = () => {
    add(
      {
        id: listing.id,
        title: listing.title,
        price: Number(listing.price),
        imageUrl: listing.image_url,
        stock: listing.stock,
        sellerId: listing.seller_id,
        sellerName: listing.seller?.full_name || 'Student'
      },
      quantity
    )
    setNotice(`Added ${quantity} to your cart.`)
  }

  const handleBuyNow = () => {
    add(
      {
        id: listing.id,
        title: listing.title,
        price: Number(listing.price),
        imageUrl: listing.image_url,
        stock: listing.stock,
        sellerId: listing.seller_id,
        sellerName: listing.seller?.full_name || 'Student'
      },
      quantity
    )
    navigate('/checkout')
  }

  if (loading) {
    return (<><Header /><main className="page"><Spinner /></main></>)
  }

  if (error || !listing) {
    return (
      <>
        <Header />
        <main className="page page-narrow">
          <ErrorState error={error || 'Listing not found'} onRetry={fetchListing} />
          <p className="right" style={{ marginTop: '1rem' }}>
            <Link to="/">Back to the marketplace</Link>
          </p>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="page">
        <p className="small muted">
          <Link to="/">Marketplace</Link> / {listing.category}
        </p>

        <div className="split" style={{ marginTop: '1rem' }}>
          <div>
            <div className="card detail-image">
              {listing.image_url
                ? <img src={listing.image_url} alt={listing.title} />
                : <span className="no-image">No image</span>}
            </div>

            <div className="card" style={{ padding: '1.25rem', marginTop: '1rem' }}>
              <h2>Seller reviews ({reviews.reviewCount})</h2>
              {reviews.reviews.length === 0 ? (
                <p className="muted small">
                  This seller has not been reviewed yet.
                </p>
              ) : (
                <div className="stack">
                  {reviews.reviews.map((review) => (
                    <div key={review.id} className="review-row">
                      <div className="row-between">
                        <strong>{review.reviewer?.full_name || 'Student'}</strong>
                        <span className="small muted nowrap">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <Stars value={review.rating} />
                      {review.comment && <p className="small">{review.comment}</p>}
                      <hr className="divider" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="card" style={{ padding: '1.25rem' }}>
            <div className="row-between" style={{ marginBottom: '0.5rem' }}>
              <span className="status-badge status-listing-active">
                {listing.category}
              </span>
              <StatusBadge status={listing.status} kind="listing" />
            </div>

            <h1 style={{ fontSize: '1.5rem' }}>{listing.title}</h1>
            <p className="listing-price" style={{ fontSize: '1.6rem' }}>
              R{Number(listing.price).toFixed(2)}
            </p>

            <p className="muted small">
              {listing.stock} in stock &middot; listed{' '}
              {new Date(listing.created_at).toLocaleDateString()}
            </p>

            <Banner kind="success">{notice}</Banner>

            {listing.description && (
              <>
                <hr className="divider" />
                <p className="small muted">Description</p>
                <p style={{ whiteSpace: 'pre-wrap' }}>{listing.description}</p>
              </>
            )}

            <hr className="divider" />

            <p className="small muted">Sold by</p>
            <p style={{ margin: 0 }}>
              <Link to={`/seller/${listing.seller_id}`}>
                {listing.seller?.full_name || 'Student'}
              </Link>
            </p>
            {listing.seller?.university && (
              <p className="muted small" style={{ margin: 0 }}>{listing.seller.university}</p>
            )}
            <Stars value={reviews.averageRating} />

            <hr className="divider" />

            {isOwnListing ? (
              <Banner kind="info">This is your listing. You cannot buy it yourself.</Banner>
            ) : soldOut ? (
              <Banner kind="error">Sold out. Nothing left in stock.</Banner>
            ) : (
              <div className="stack">
                <div className="field">
                  <label htmlFor="qty">Quantity</label>
                  <select
                    id="qty"
                    className="input"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                  >
                    {Array.from({ length: Math.min(listing.stock, 10) }, (_, i) => i + 1)
                      .map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <button className="btn" onClick={handleAddToCart}>Add to cart</button>
                <button className="btn btn-ghost" onClick={handleBuyNow}>Buy now</button>
                <p className="muted small" style={{ margin: 0 }}>
                  You will pick a meetup point and time at checkout, and pay the
                  seller in cash when you collect.
                </p>
              </div>
            )}
          </aside>
        </div>
      </main>
    </>
  )
}
