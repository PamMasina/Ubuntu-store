import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import { Spinner, ErrorState } from '../components/States'
import { api } from '../api'

function Stars({ value, count }) {
  if (!count) return <span className="muted small">No reviews yet</span>
  return (
    <span className="row" style={{ gap: '0.4rem' }}>
      {'\u2605'.repeat(Math.round(value))}
      <span className="muted">{'\u2606'.repeat(5 - Math.round(value))}</span>
      <span className="small muted">{Number(value).toFixed(1)} ({count})</span>
    </span>
  )
}

export default function SellerProfile() {
  const { id } = useParams()
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState({ reviews: [], averageRating: 0, reviewCount: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetch = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [p, r] = await Promise.all([api.getProfile(id), api.getReviews(id)])
      setProfile(p)
      setReviews(r)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  if (loading) return (<><Header /><main className="page"><Spinner /></main></>)
  if (error || !profile) return (<><Header /><main className="page page-narrow"><ErrorState error={error || 'Not found'} /></main></>)

  return (
    <>
      <Header />
      <main className="page page-narrow">
        <h1>{profile.full_name}</h1>
        {profile.university && <p className="muted">{profile.university}</p>}
        <Stars value={reviews.averageRating} count={reviews.reviewCount} />
        {profile.bio && <p style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}>{profile.bio}</p>}

        <h2 style={{ marginTop: '2rem' }}>Reviews</h2>
        {reviews.reviews.length === 0 ? (
          <p className="muted small">No reviews yet.</p>
        ) : (
          <div className="stack">
            {reviews.reviews.map((review) => (
              <div key={review.id} className="card" style={{ padding: '0.85rem' }}>
                <div className="row-between">
                  <strong>{review.reviewer?.full_name || 'Student'}</strong>
                  <span className="small muted">{new Date(review.created_at).toLocaleDateString()}</span>
                </div>
                <Stars value={review.rating} />
                {review.comment && <p className="small">{review.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
