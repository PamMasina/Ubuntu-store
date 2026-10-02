import { useEffect, useState, useCallback } from 'react'
import Header from '../components/Header'
import { Spinner, ErrorState, Banner } from '../components/States'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

function Stars({ value }) {
  return (
    <span aria-label={`${value} out of 5`}>
      {'\u2605'.repeat(Math.round(value))}
      <span className="muted">{'\u2606'.repeat(5 - Math.round(value))}</span>
    </span>
  )
}

export default function Profile() {
  const { session, isVendor } = useAuth()
  const [details, setDetails] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  const fetchDetails = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getMyDetails(session.access_token)
      setDetails(data)
      setForm({
        full_name: data.profile.full_name,
        phone: data.profile.phone || '',
        whatsapp: data.profile.whatsapp || '',
        bio: data.profile.bio || '',
        university: data.profile.university || '',
        avatar_url: data.profile.avatar_url || ''
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [session.access_token])

  useEffect(() => {
    fetchDetails()
  }, [fetchDetails])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNotice('')
    try {
      const updated = await api.updateMyProfile(
        {
          full_name: form.full_name,
          phone: form.phone || null,
          whatsapp: form.whatsapp || null,
          bio: form.bio || null,
          university: form.university || null,
          avatar_url: form.avatar_url || null
        },
        session.access_token
      )
      setDetails((current) => ({ ...current, profile: updated }))
      setEditing(false)
      setNotice('Profile updated.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (<><Header /><main className="page page-narrow"><Spinner /></main></>)
  }

  if (error || !details) {
    return (
      <>
        <Header />
        <main className="page page-narrow">
          <ErrorState error={error || 'Your profile is not ready'} onRetry={fetchDetails} />
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="page page-narrow">
        <h1>Your profile</h1>
        <p className="muted small">{details.email}</p>

        <Banner kind="success">{notice}</Banner>
        {error && <Banner kind="error">{error}</Banner>}

        <div className="grid-stat" style={{ margin: '1.25rem 0' }}>
          <div className="card stat-card">
            <p className="stat-number">{details.stats.purchases}</p>
            <p className="stat-label">Purchases</p>
          </div>
          {/* Sales and listings only mean something for a vendor. A student is
              a buyer, so showing them a permanent zero looks like a bug. */}
          {isVendor ? (
            <>
              <div className="card stat-card">
                <p className="stat-number">{details.stats.sales}</p>
                <p className="stat-label">Sales</p>
              </div>
              <div className="card stat-card">
                <p className="stat-number">{details.stats.listings}</p>
                <p className="stat-label">Listings</p>
              </div>
              <div className="card stat-card">
                <p className="stat-number">{details.averageRating.toFixed(1)}</p>
                <p className="stat-label">{details.reviewCount} reviews</p>
              </div>
            </>
          ) : (
            <div className="card stat-card">
              <p className="stat-number">{details.stats.reviewsWritten}</p>
              <p className="stat-label">Reviews written</p>
            </div>
          )}
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="row-between">
            <h3 style={{ margin: 0 }}>Profile details</h3>
            <button className="btn btn-ghost" onClick={() => setEditing((v) => !v)}>
              {editing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          {editing ? (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="full_name">Full name</label>
                <input
                  id="full_name"
                  className="input"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="whatsapp">WhatsApp</label>
                <input
                  id="whatsapp"
                  className="input"
                  value={form.whatsapp}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="university">University</label>
                <input
                  id="university"
                  className="input"
                  value={form.university}
                  onChange={(e) => setForm((f) => ({ ...f, university: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  className="input"
                  rows={3}
                  value={form.bio}
                  onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                />
              </div>
              <div className="actions">
                <button type="submit" className="btn" disabled={saving}>
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          ) : (
            <dl className="stack" style={{ margin: '1rem 0 0' }}>
              <div>
                <dt className="small muted">Name</dt>
                <dd style={{ margin: 0 }}>{details.profile.full_name}</dd>
              </div>
              {details.profile.university && (
                <div>
                  <dt className="small muted">University</dt>
                  <dd style={{ margin: 0 }}>{details.profile.university}</dd>
                </div>
              )}
              {details.profile.phone && (
                <div>
                  <dt className="small muted">Phone</dt>
                  <dd style={{ margin: 0 }}>{details.profile.phone}</dd>
                </div>
              )}
              {details.profile.whatsapp && (
                <div>
                  <dt className="small muted">WhatsApp</dt>
                  <dd style={{ margin: 0 }}>{details.profile.whatsapp}</dd>
                </div>
              )}
              {details.profile.bio && (
                <div>
                  <dt className="small muted">Bio</dt>
                  <dd style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{details.profile.bio}</dd>
                </div>
              )}
              <div>
                <dt className="small muted">Role</dt>
                <dd style={{ margin: 0, textTransform: 'capitalize' }}>{details.profile.role}</dd>
              </div>
              {isVendor && details.reviewCount > 0 && (
                <div className="row">
                  <Stars value={details.averageRating} />
                  <span className="small muted">({details.reviewCount})</span>
                </div>
              )}
            </dl>
          )}
        </div>
      </main>
    </>
  )
}
