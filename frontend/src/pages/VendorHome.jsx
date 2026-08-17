import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import './VendorHome.css'

const CATEGORIES = ['Textbooks', 'Electronics', 'Clothing', 'Services', 'Other']

export default function VendorHome({ session }) {
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ title: '', price: '', category: 'Textbooks', description: '' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [saving, setSaving] = useState(false)

  const fetchListings = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('seller_id', session.user.id)
      .order('created_at', { ascending: false })
    if (!error) setListings(data)
    setLoading(false)
  }, [session.user.id])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const openCreate = () => {
    setEditingId(null)
    setForm({ title: '', price: '', category: 'Textbooks', description: '' })
    setImageFile(null)
    setImagePreview(null)
    setShowModal(true)
  }

  const openEdit = (listing) => {
    setEditingId(listing.id)
    setForm({
      title: listing.title,
      price: String(listing.price),
      category: listing.category,
      description: listing.description || ''
    })
    setImageFile(null)
    setImagePreview(listing.image_url || null)
    setShowModal(true)
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const uploadImage = async () => {
    if (!imageFile) return imagePreview
    const fileExt = imageFile.name.split('.').pop()
    const fileName = `${session.user.id}/${Date.now()}.${fileExt}`
    const { error } = await supabase.storage
      .from('listing-images')
      .upload(fileName, imageFile)
    if (error) return null
    const { data } = supabase.storage.from('listing-images').getPublicUrl(fileName)
    return data.publicUrl
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.title || !form.price) return

    setSaving(true)

    let imageUrl = imagePreview
    if (imageFile) {
      imageUrl = await uploadImage()
    }

    const payload = {
      title: form.title.trim(),
      price: Number(form.price),
      category: form.category,
      image_url: imageUrl || null,
      description: form.description.trim() || null
    }

    if (editingId) {
      await supabase
        .from('listings')
        .update(payload)
        .eq('id', editingId)
    } else {
      await supabase
        .from('listings')
        .insert({ ...payload, seller_id: session.user.id, status: 'active' })
    }

    setShowModal(false)
    setSaving(false)
    fetchListings()
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this listing?')) return
    await supabase.from('listings').delete().eq('id', id)
    fetchListings()
  }

  const activeCount = listings.filter(l => l.status === 'active').length
  const soldCount = listings.filter(l => l.status === 'sold').length

  return (
    <div className="vendor-container">
      <div className="vendor-header">
        <h2>Ubuntu Store</h2>
        <div className="vendor-header-right">
          <span className="vendor-email">Vendor &middot; {session.user.email}</span>
          <button className="vendor-logout" onClick={handleLogout}>Log Out</button>
        </div>
      </div>

      <div className="vendor-stats">
        <div className="vendor-stat-card">
          <p className="vendor-stat-number">{listings.length}</p>
          <p className="vendor-stat-label">Total Listings</p>
        </div>
        <div className="vendor-stat-card">
          <p className="vendor-stat-number">{activeCount}</p>
          <p className="vendor-stat-label">Active</p>
        </div>
        <div className="vendor-stat-card">
          <p className="vendor-stat-number">{soldCount}</p>
          <p className="vendor-stat-label">Sold</p>
        </div>
      </div>

      <div className="vendor-section-header">
        <h3>My Listings</h3>
        <button className="vendor-add-btn" onClick={openCreate}>+ New Listing</button>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#888' }}>Loading...</p>
      ) : listings.length === 0 ? (
        <div className="vendor-empty">
          <p>No listings yet. Click "+ New Listing" to get started.</p>
        </div>
      ) : (
        <div className="vendor-listing-grid">
          {listings.map(listing => (
            <div key={listing.id} className="vendor-listing-card">
              <div className="vendor-listing-image">
                {listing.image_url
                  ? <img src={listing.image_url} alt={listing.title} />
                  : <span className="vendor-no-image">No image</span>
                }
              </div>
              <div className="vendor-listing-body">
                <span className={`vendor-listing-status ${listing.status === 'active' ? 'vendor-status-active' : 'vendor-status-sold'}`}>
                  {listing.status}
                </span>
                <p className="vendor-listing-title">{listing.title}</p>
                <p className="vendor-listing-price">R{listing.price}</p>
                <p className="vendor-listing-category">{listing.category}</p>
                <div className="vendor-listing-actions">
                  <button className="vendor-btn-edit" onClick={() => openEdit(listing)}>Edit</button>
                  <button className="vendor-btn-delete" onClick={() => handleDelete(listing.id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="vendor-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="vendor-modal" onClick={(e) => e.stopPropagation()}>
            <h3>{editingId ? 'Edit Listing' : 'New Listing'}</h3>
            <form className="vendor-modal-form" onSubmit={handleSave}>
              <input
                className="vendor-modal-input"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <input
                className="vendor-modal-input"
                type="number"
                placeholder="Price (R)"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                required
              />
              <select
                className="vendor-modal-input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <div className="vendor-image-upload">
                {imagePreview ? (
                  <div className="vendor-image-preview">
                    <img src={imagePreview} alt="Preview" />
                    <button type="button" className="vendor-image-remove" onClick={() => { setImageFile(null); setImagePreview(null) }}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="vendor-image-label">
                    <input type="file" accept="image/*" onChange={handleImageChange} hidden />
                    <span>+ Add Image</span>
                  </label>
                )}
              </div>

              <textarea
                className="vendor-modal-input"
                placeholder="Description (optional)"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div className="vendor-modal-actions">
                <button type="button" className="vendor-modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="vendor-modal-save" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
