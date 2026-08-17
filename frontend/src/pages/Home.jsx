import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import './Home.css'

const CATEGORIES = ['All', 'Textbooks', 'Electronics', 'Clothing', 'Services', 'Other']
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' }
]

export default function Home({ session }) {
  const [listings, setListings] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [sort, setSort] = useState('newest')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  const fetchListings = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (error) {
      setError('Failed to load listings.')
    } else {
      setListings(data)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const filtered = listings
    .filter(l => {
      const matchSearch = l.title.toLowerCase().includes(search.toLowerCase())
      const matchCategory = category === 'All' || l.category === category
      return matchSearch && matchCategory
    })
    .sort((a, b) => {
      switch (sort) {
        case 'price-low': return a.price - b.price
        case 'price-high': return b.price - a.price
        case 'oldest': return new Date(a.created_at) - new Date(b.created_at)
        default: return new Date(b.created_at) - new Date(a.created_at)
      }
    })

  return (
    <div className="home-container">
      <div className="home-header">
        <h2>Ubuntu Store</h2>
        <div className="home-header-right">
          <span className="home-email">{session.user.email}</span>
          <button className="home-logout" onClick={handleLogout}>Log Out</button>
        </div>
      </div>

      <div className="home-search-row">
        <input
          className="home-search-input"
          type="text"
          placeholder="Search listings..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="home-sort-select"
          value={sort}
          onChange={e => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="home-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`home-cat-btn ${category === cat ? 'active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="home-loading">Loading listings...</p>
      ) : error ? (
        <p className="home-error">{error}</p>
      ) : filtered.length === 0 ? (
        <div className="home-empty">
          <div className="home-empty-icon">&#128269;</div>
          <p>No listings found.</p>
        </div>
      ) : (
        <div className="home-grid">
          {filtered.map(listing => (
            <div
              key={listing.id}
              className="home-card"
              onClick={() => setSelected(listing)}
            >
              <div className="home-card-image">
                {listing.image_url
                  ? <img src={listing.image_url} alt={listing.title} />
                  : <span className="home-card-no-img">No image</span>
                }
              </div>
              <div className="home-card-body">
                <p className="home-card-title">{listing.title}</p>
                <p className="home-card-price">R{listing.price}</p>
                <p className="home-card-category">{listing.category}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="detail-overlay" onClick={() => setSelected(null)}>
          <div className="detail-modal" onClick={e => e.stopPropagation()}>
            <div className="detail-image">
              {selected.image_url
                ? <img src={selected.image_url} alt={selected.title} />
                : <span className="detail-no-img">No image available</span>
              }
            </div>
            <div className="detail-body">
              <h2 className="detail-title">{selected.title}</h2>
              <p className="detail-price">R{selected.price}</p>
              <p className="detail-category">{selected.category}</p>

              {selected.description && (
                <>
                  <div className="detail-divider" />
                  <p className="detail-description-label">Description</p>
                  <p className="detail-description">{selected.description}</p>
                </>
              )}

              <div className="detail-divider" />
              <p className="detail-seller">
                Listed by <strong>{selected.seller_id?.slice(0, 8)}...</strong>
              </p>

              <div className="detail-actions">
                <button
                  className="detail-contact-btn"
                  onClick={() => window.location.href = `mailto:?subject=Ubuntu Store: ${selected.title}`}
                >
                  Contact Seller
                </button>
                <button className="detail-close-btn" onClick={() => setSelected(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
