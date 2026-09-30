import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import Header from '../components/Header'
import { Spinner, Banner } from '../components/States'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'

const MAX_BYTES = 5 * 1024 * 1024

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read that file'))
    reader.readAsDataURL(file)
  })

export default function VendorListingForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { session } = useAuth()

  const [meta, setMeta] = useState({ categories: [] })
  const [form, setForm] = useState({
    title: '',
    price: '',
    category: 'Textbooks',
    description: '',
    stock: 1
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  // Kept separately: removing a new upload must not silently keep the old URL.
  const [existingImage, setExistingImage] = useState(null)
  const [loading, setLoading] = useState(isEdit)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const objectUrl = useRef(null)

  const update = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.value }))

  useEffect(() => {
    api.getMeta().then(setMeta).catch(() => {})
  }, [])

  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
  }, [])

  const fetchListing = useCallback(async () => {
    if (!isEdit) return
    setLoading(true)
    try {
      const data = await api.getListing(id, session.access_token)
      setForm({
        title: data.title,
        price: String(data.price),
        category: data.category,
        description: data.description || '',
        stock: data.stock
      })
      setExistingImage(data.image_url || null)
      setImagePreview(data.image_url || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id, isEdit, session.access_token])

  useEffect(() => { fetchListing() }, [fetchListing])

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > MAX_BYTES) {
      setError('Images must be under 5MB')
      e.target.value = ''
      return
    }

    setError('')
    setImageFile(file)
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(file)
    setImagePreview(objectUrl.current)
  }

  const removeImage = () => {
    setImageFile(null)
    setExistingImage(null)
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current)
      objectUrl.current = null
    }
    setImagePreview(null)
  }

  const uploadImage = async () => {
    if (!imageFile) return existingImage
    const base64 = await fileToBase64(imageFile)
    const result = await api.uploadListingImage(
      base64,
      imageFile.type,
      session.access_token
    )
    return result.url
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      // Upload first, so a storage failure aborts before anything is created.
      const imageUrl = await uploadImage()

      const payload = {
        title: form.title.trim(),
        price: Number(form.price),
        category: form.category,
        description: form.description.trim() || null,
        stock: Number(form.stock),
        image_url: imageUrl || null
      }

      if (isEdit) {
        await api.updateListing(id, payload, session.access_token)
      } else {
        await api.createListing(payload, session.access_token)
      }
      navigate('/vendor')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (<><Header /><main className="page"><Spinner /></main></>)
  }

  return (
    <>
      <Header />
      <main className="page page-narrow">
        <h1>{isEdit ? 'Edit listing' : 'New listing'}</h1>

        <Banner kind="error">{error}</Banner>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              className="input"
              value={form.title}
              onChange={update('title')}
              minLength={3}
              maxLength={120}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="price">Price (R)</label>
            <input
              id="price"
              className="input"
              type="number"
              step="0.01"
              min="0.01"
              value={form.price}
              onChange={update('price')}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              className="input"
              value={form.category}
              onChange={update('category')}
            >
              {meta.categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="stock">Stock</label>
            <input
              id="stock"
              className="input"
              type="number"
              min="0"
              value={form.stock}
              onChange={update('stock')}
            />
            <p className="hint">
              How many are available. Setting this to 0 marks the listing sold
              automatically.
            </p>
          </div>

          <div className="field">
            <label>Image</label>
            {imagePreview ? (
              <div className="image-preview">
                <img src={imagePreview} alt="" />
                <button
                  type="button"
                  className="btn btn-quiet"
                  onClick={removeImage}
                >
                  Remove image
                </button>
              </div>
            ) : (
              <label className="upload-label">
                <input type="file" accept="image/*" onChange={handleImage} hidden />
                + Add image
              </label>
            )}
          </div>

          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="input"
              rows={4}
              maxLength={2000}
              value={form.description}
              onChange={update('description')}
              placeholder="Condition, size, anything a buyer would ask."
            />
          </div>

          <div className="actions">
            <Link className="btn btn-ghost" to="/vendor">Cancel</Link>
            <button className="btn" type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save changes' : 'Create listing'}
            </button>
          </div>
        </form>
      </main>
    </>
  )
}
