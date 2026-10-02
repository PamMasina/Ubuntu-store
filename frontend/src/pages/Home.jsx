import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { Spinner, ErrorState, EmptyState } from '../components/States'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' }
]

const PAGE_SIZE = 24

export default function Home() {
  const { session, isVendor } = useAuth()
  const [meta, setMeta] = useState({ categories: ['All'], meetupPoints: [] })
  const [listings, setListings] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getMeta().then(setMeta).catch(() => {})
  }, [])

  const fetchListings = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.getListings({
        category,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE
      })
      setListings(data.listings)
      setTotal(data.total)
    } catch (err) {
      // The old version swallowed the error and rendered the empty state, so a
      // failure looked identical to having no listings.
      setError(err.message)
      setListings([])
    } finally {
      setLoading(false)
    }
  }, [category, page])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  // Any change of filter should land back on page one, or the user is looking
  // at page four of a list that now has two pages.
  useEffect(() => {
    setPage(0)
  }, [category, sort])

  // Sorting is cheapest to do here: the API returns a page at a time, so
  // sorting only the visible page keeps the two honest.
  const visible = [...listings].sort((a, b) => {
    if (sort === 'price-low') return a.price - b.price
    if (sort === 'price-high') return b.price - a.price
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const matchesSearch = (listing) =>
    listing.title.toLowerCase().includes(search.toLowerCase())

  const shown = visible.filter(matchesSearch)
  const maxPage = Math.max(Math.ceil(total / PAGE_SIZE) - 1, 0)

  return (
    <>
      <Header />
      <main className="page">
        <div className="section-head">
          <div>
            <h2>Marketplace</h2>
            <p className="muted small" style={{ margin: 0 }}>
              {total} {total === 1 ? 'listing' : 'listings'} &middot; meet on campus,
              pay in cash
            </p>
          </div>
          {isVendor && (
            <Link className="btn" to="/vendor">Vendor dashboard</Link>
          )}
        </div>

        <div className="filter-row">
          <input
            className="input"
            type="search"
            placeholder="Search listings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search listings"
          />
          <select
            className="input"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort listings"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="chips">
          {['All', ...meta.categories].map((item, i) => (
            <button
              key={`${item}-${i}`}
              className={`chip ${category === item ? 'active' : ''}`}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>

        {loading ? (
          <Spinner label="Loading listings..." />
        ) : error ? (
          <ErrorState error={error} onRetry={fetchListings} />
        ) : shown.length === 0 ? (
          <EmptyState
            title="No listings found"
            action={
              isVendor ? (
                <Link className="btn" to="/vendor/listings/new">List something</Link>
              ) : null
            }
          >
            {search
              ? `Nothing matches "${search}" in this category.`
              : 'Nothing has been listed in this category yet.'}
          </EmptyState>
        ) : (
          <>
            <div className="grid">
              {shown.map((listing) => (
                <Link
                  key={listing.id}
                  to={`/listing/${listing.id}`}
                  className="card listing-card"
                >
                  <div className="listing-image">
                    {listing.image_url
                      ? <img src={listing.image_url} alt="" />
                      : <span className="no-image">No image</span>}
                  </div>
                  <div className="listing-body">
                    <p className="listing-title">{listing.title}</p>
                    <p className="listing-price">R{Number(listing.price).toFixed(2)}</p>
                    <p className="listing-meta">
                      <span>{listing.category}</span>
                      <span>{listing.seller?.full_name || 'Student'}</span>
                    </p>
                    {listing.stock < 1 && (
                      <p className="listing-sold-out">Sold out</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {maxPage > 0 && (
              <div className="row" style={{ justifyContent: 'center', marginTop: '2rem' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </button>
                <span className="muted small">
                  Page {page + 1} of {maxPage + 1}
                </span>
                <button
                  className="btn btn-ghost"
                  onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                  disabled={page >= maxPage}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        <p className="muted small" style={{ marginTop: '3rem' }}>
          Signed in as {session.user.email}
        </p>
      </main>
    </>
  )
}
