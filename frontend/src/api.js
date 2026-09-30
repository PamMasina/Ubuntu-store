const API_BASE = '/api'

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),

  // Listings
  getListings: () => request('/listings'),
  getListing: (id) => request(`/listings/${id}`),
  createListing: (listing, token) =>
    request('/listings', { method: 'POST', body: listing, token }),
  updateListing: (id, listing, token) =>
    request(`/listings/${id}`, { method: 'PUT', body: listing, token }),
  deleteListing: (id, token) =>
    request(`/listings/${id}`, { method: 'DELETE', token }),

  // Board
  getBoardPosts: () => request('/board'),
  createBoardPost: (post, token) =>
    request('/board', { method: 'POST', body: post, token }),

  // Reviews
  getReviews: (sellerId) => request(`/reviews/${sellerId}`),
  createReview: (review, token) =>
    request('/reviews', { method: 'POST', body: review, token }),
}
