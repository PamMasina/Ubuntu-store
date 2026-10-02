// Thin fetch wrapper around the API. Every call goes through here so the
// Authorization header and error shape are handled in exactly one place.

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body, token, headers: extra } = {}) {
  const headers = { ...(extra || {}) }
  if (body !== undefined && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch {
    // Network-level failure: server down, CORS rejection, offline.
    throw new ApiError('Could not reach the server. Check your connection.', 0)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ApiError(data.error || `Request failed (${res.status})`, res.status)
  }
  return data
}

// Small helper so each method reads as a plain call site.
const get = (path, token) => request(path, { token })
const post = (path, body, token) => request(path, { method: 'POST', body, token })
const put = (path, body, token) => request(path, { method: 'PUT', body, token })
const patch = (path, body, token) => request(path, { method: 'PATCH', body, token })
const del = (path, token) => request(path, { method: 'DELETE', token })

const qs = (params) => {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  })
  const str = search.toString()
  return str ? `?${str}` : ''
}

export const api = {
  // Auth
  register: (payload) => post('/auth/register', payload),
  login: (email, password) => post('/auth/login', { email, password }),
  me: (token) => get('/auth/me', token),
  resendVerification: (email, redirectTo) =>
    post('/auth/verify', { email, redirectTo }),

  // Profile
  getMyDetails: (token) => get('/profiles/me/details', token),
  getProfile: (id) => get(`/profiles/${id}`),
  updateMyProfile: (payload, token) => put('/profiles/me', payload, token),

  // Listings
  getListings: (params) => get(`/listings${qs(params)}`),
  getListing: (id, token) => get(`/listings/${id}`, token),
  getMyListings: (token) => get('/listings/mine/all', token),
  createListing: (payload, token) => post('/listings', payload, token),
  updateListing: (id, payload, token) => put(`/listings/${id}`, payload, token),
  deleteListing: (id, token) => del(`/listings/${id}`, token),

  // Orders
  getMyOrders: (token) => get('/orders', token),
  getIncomingOrders: (token) => get('/orders/incoming', token),
  getOrder: (id, token) => get(`/orders/${id}`, token),
  placeOrder: (payload, token) => post('/orders', payload, token),
  updateOrderStatus: (id, status, token) =>
    patch(`/orders/${id}/status`, { status }, token),
  getOrderContact: (id, token) => get(`/orders/${id}/contact`, token),

  // Payments
  initiatePayment: (orderId, method, token) =>
    post('/payments/initiate', { order_id: orderId, method }, token),
  getPayment: (orderId, token) => get(`/payments/${orderId}`, token),

  // Reviews
  getReviews: (sellerId) => get(`/reviews/${sellerId}`),
  createReview: (payload, token) => post('/reviews', payload, token),
  getPendingReviews: (token) => get('/reviews/pending/mine', token),

  // Meta
  getMeta: () => get('/meta'),

  // Uploads
  uploadListingImage: (base64, contentType, token) =>
    request('/uploads/listing-images', {
      method: 'POST',
      body: { file: base64, contentType },
      token
    })
}
