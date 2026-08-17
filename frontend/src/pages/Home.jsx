import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Home() {
  const [listings, setListings] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)

  const categories = ['All', 'Textbooks', 'Electronics', 'Clothing', 'Services', 'Other']

  useEffect(() => {
    fetchListings()
  }, [])

  const fetchListings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
    if (!error) setListings(data)
    setLoading(false)
  }

  const filtered = listings.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase())
    const matchCategory = category === 'All' || l.category === category
    return matchSearch && matchCategory
  })

  return (
    <div style={{ fontFamily: 'Arial', maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '1rem', background: '#1F4E79', borderRadius: '8px' }}>
        <h2 style={{ color: 'white', margin: 0 }}>Ubuntu Store</h2>
        <span style={{ color: '#D6E4F0', fontSize: '13px' }}>Campus Marketplace</span>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search listings..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', marginBottom: '1rem', boxSizing: 'border-box' }}
      />

      {/* Category filters */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            style={{
              padding: '6px 14px', borderRadius: '20px', border: '1px solid #1F4E79', cursor: 'pointer', fontSize: '13px',
              background: category === cat ? '#1F4E79' : 'white',
              color: category === cat ? 'white' : '#1F4E79'
            }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Listings grid */}
      {loading ? (
        <p style={{ textAlign: 'center', color: '#888' }}>Loading listings...</p>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#888' }}>No listings found.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {filtered.map(listing => (
            <div key={listing.id} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer' }}>
              <div style={{ height: '120px', background: '#D6E4F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {listing.image_url
                  ? <img src={listing.image_url} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ color: '#888', fontSize: '13px' }}>No image</span>
                }
              </div>
              <div style={{ padding: '10px' }}>
                <p style={{ margin: '0 0 4px', fontWeight: '500', fontSize: '14px' }}>{listing.title}</p>
                <p style={{ margin: '0 0 4px', color: '#1F4E79', fontWeight: 'bold', fontSize: '14px' }}>R{listing.price}</p>
                <p style={{ margin: 0, color: '#888', fontSize: '12px' }}>{listing.category}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}