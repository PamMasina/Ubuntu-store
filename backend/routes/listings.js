const express = require('express')
const router = express.Router()
const { supabaseAdmin, supabaseAuth } = require('../config/supabase')
const { auth, requireRole } = require('../middleware/auth')
const {
  requireString,
  optionalString,
  requireNumber,
  requireInt,
  requireOneOf,
  requireUuid,
  notFound,
  badRequest
} = require('../utils/validate')
const { LISTING_CATEGORIES, LISTING_STATUSES } = require('../config/constants')

const SELLER_FIELDS = 'id, full_name, university, avatar_url'
const MAX_LIMIT = 60

// Marketplace feed. Public, so it is capped and paginated rather than dumping
// the whole table to an anonymous caller.
router.get('/', async (req, res) => {
  const limit = Math.min(
    Number.parseInt(req.query.limit, 10) || 24,
    MAX_LIMIT
  )
  const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0)
  const category = req.query.category
  const sellerId = req.query.seller

  let query = supabaseAdmin
    .from('listings')
    .select(`*, seller:profiles (${SELLER_FIELDS})`, { count: 'exact' })
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (category && category !== 'All') {
    if (!LISTING_CATEGORIES.includes(category)) {
      throw badRequest(`Category must be one of: ${LISTING_CATEGORIES.join(', ')}`)
    }
    query = query.eq('category', category)
  }
  if (sellerId) {
    query = query.eq('seller_id', requireUuid(sellerId, 'seller'))
  }

  const { data, error, count } = await query
  if (error) throw error

  res.json({ listings: data, total: count, limit, offset })
})

// The vendor's own dashboard feed, including sold and archived items.
router.get('/mine/all', auth, requireRole('vendor'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('listings')
    .select('*')
    .eq('seller_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  res.json(data)
})

// Public single view. Sold and archived listings are hidden from everyone
// except the owner, so their ids cannot be enumerated for stale prices.
router.get('/:id', async (req, res) => {
  const id = requireUuid(req.params.id, 'Listing id')

  const { data, error } = await supabaseAdmin
    .from('listings')
    .select(`*, seller:profiles (${SELLER_FIELDS})`)
    .eq('id', id)
    .single()

  if (error) throw notFound('Listing not found')

  const isOwner = req.headers.authorization
    ? await ownsListing(req.headers.authorization, id)
    : false

  if (data.status !== 'active' && !isOwner) {
    throw notFound('Listing not found')
  }

  res.json(data)
})

// Resolves the bearer header to a user id, or null. Used only to decide whether
// the caller may see a non-active listing.
async function ownsListing(authorization, listingId) {
  const token = authorization.slice('Bearer '.length)
  const { data } = await supabaseAuth.auth.getUser(token)
  if (!data.user) return false

  const { data: listing } = await supabaseAdmin
    .from('listings')
    .select('seller_id')
    .eq('id', listingId)
    .maybeSingle()

  return Boolean(listing && listing.seller_id === data.user.id)
}

router.post('/', auth, requireRole('vendor'), async (req, res) => {
  const title = requireString(req.body.title, 'Title', { min: 3, max: 120 })
  const price = requireNumber(req.body.price, 'Price', { min: 0.01, max: 9999999 })
  const category = requireOneOf(req.body.category, 'Category', LISTING_CATEGORIES)
  const description = optionalString(req.body.description, 'Description', { max: 2000 })
  const imageUrl = optionalString(req.body.image_url, 'Image', { max: 1000 })
  const stock = requireInt(req.body.stock ?? 1, 'Stock', { min: 1, max: 999 })

  const { data, error } = await supabaseAdmin
    .from('listings')
    .insert({
      title,
      price,
      category,
      description,
      image_url: imageUrl,
      stock,
      // seller_id comes from the verified token, never from the request body.
      seller_id: req.user.id,
      status: 'active'
    })
    .select()
    .single()

  if (error) throw error
  res.status(201).json(data)
})

router.put('/:id', auth, requireRole('vendor'), async (req, res) => {
  const id = requireUuid(req.params.id, 'Listing id')

  const patch = {}
  if (req.body.title !== undefined) {
    patch.title = requireString(req.body.title, 'Title', { min: 3, max: 120 })
  }
  if (req.body.price !== undefined) {
    patch.price = requireNumber(req.body.price, 'Price', { min: 0.01, max: 9999999 })
  }
  if (req.body.category !== undefined) {
    patch.category = requireOneOf(req.body.category, 'Category', LISTING_CATEGORIES)
  }
  if (req.body.description !== undefined) {
    patch.description = optionalString(req.body.description, 'Description', { max: 2000 })
  }
  if (req.body.image_url !== undefined) {
    patch.image_url = optionalString(req.body.image_url, 'Image', { max: 1000 })
  }
  if (req.body.stock !== undefined) {
    patch.stock = requireInt(req.body.stock, 'Stock', { min: 0, max: 999 })
  }
  if (req.body.status !== undefined) {
    patch.status = requireOneOf(req.body.status, 'Status', LISTING_STATUSES)
    // 'sold' is derived from stock by the database trigger, so a manual
    // 'sold' is only meaningful when stock is already 0. Reject the
    // contradiction rather than let the trigger silently override it.
    if (patch.status === 'sold' && req.body.stock === undefined) {
      const { data: current } = await supabaseAdmin
        .from('listings')
        .select('stock')
        .eq('id', id)
        .maybeSingle()
      if (current && current.stock > 0) {
        throw badRequest('Set stock to 0 to mark this listing sold')
      }
    }
    if (patch.status === 'active' && req.body.stock === undefined) {
      patch.stock = 1
    }
  }

  if (Object.keys(patch).length === 0) {
    throw badRequest('Nothing to update')
  }

  // .single() on a seller-filtered update yields PGRST116 when the row is
  // missing or owned by somebody else. Map both to 404 so the response does
  // not confirm the existence of another vendor's listing.
  const { data, error } = await supabaseAdmin
    .from('listings')
    .update(patch)
    .eq('id', id)
    .eq('seller_id', req.user.id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw notFound('Listing not found')
    throw error
  }

  res.json(data)
})

router.delete('/:id', auth, requireRole('vendor'), async (req, res) => {
  const id = requireUuid(req.params.id, 'Listing id')

  // .select() is what makes this honest: without it the count of matched rows
  // is unknown and every id reports success.
  const { data, error } = await supabaseAdmin
    .from('listings')
    .delete()
    .eq('id', id)
    .eq('seller_id', req.user.id)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) throw notFound('Listing not found')

  res.json({ message: 'Listing deleted' })
})

module.exports = router
