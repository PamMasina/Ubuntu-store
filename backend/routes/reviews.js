const express = require('express')
const router = express.Router()
const { supabaseAdmin } = require('../config/supabase')
const { auth } = require('../middleware/auth')
const {
  requireInt,
  optionalString,
  requireUuid,
  notFound,
  badRequest,
  conflict
} = require('../utils/validate')

// Public review feed for a seller, with the reviewer's name attached.
router.get('/:sellerId', async (req, res) => {
  const sellerId = requireUuid(req.params.sellerId, 'Seller id')

  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey (id, full_name)')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  const { data: rating } = await supabaseAdmin
    .from('vendor_ratings')
    .select('average_rating, review_count')
    .eq('seller_id', sellerId)
    .maybeSingle()

  res.json({
    reviews: data,
    averageRating: rating ? Number(rating.average_rating) : 0,
    reviewCount: rating ? Number(rating.review_count) : 0
  })
})

// A review is only accepted if it is backed by a collected order. That is what
// stops review bombing and makes a rating mean something on a marketplace.
router.post('/', auth, async (req, res) => {
  const orderId = requireUuid(req.body.order_id, 'Order id')
  const rating = requireInt(req.body.rating, 'Rating', { min: 1, max: 5 })
  const comment = optionalString(req.body.comment, 'Comment', { max: 1000 })

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, buyer_id, seller_id, status, reference')
    .eq('id', orderId)
    .single()

  if (orderError) throw notFound('Order not found')

  if (order.buyer_id !== req.user.id) {
    throw notFound('Order not found')
  }
  if (order.status !== 'collected') {
    throw badRequest('You can review a seller once you have collected the item')
  }

  const { data: existing } = await supabaseAdmin
    .from('reviews')
    .select('id')
    .eq('order_id', orderId)
    .maybeSingle()

  if (existing) throw conflict('You have already reviewed this purchase')

  // seller_id is derived from the order, never taken from the request body, so
  // a student cannot attach a review to an arbitrary vendor.
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .insert({
      order_id: orderId,
      seller_id: order.seller_id,
      reviewer_id: req.user.id,
      rating,
      comment
    })
    .select()
    .single()

  if (error) {
    // 23505 on the order_id unique index: a duplicate slipped past the read.
    if (error.code === '23505') throw conflict('You have already reviewed this purchase')
    throw error
  }

  res.status(201).json(data)
})

// Which of this user's collected orders still need a review. Drives the
// "review your seller" prompt on the student dashboard.
router.get('/pending/mine', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('id, reference, created_at, seller_id, items:order_items (title, quantity)')
    .eq('buyer_id', req.user.id)
    .eq('status', 'collected')
    .order('created_at', { ascending: false })

  if (error) throw error

  const orderIds = data.map((order) => order.id)
  let reviewed = new Set()

  if (orderIds.length) {
    const { data: reviews } = await supabaseAdmin
      .from('reviews')
      .select('order_id')
      .in('order_id', orderIds)
    reviewed = new Set(reviews.map((review) => review.order_id))
  }

  res.json(
    data
      .filter((order) => !reviewed.has(order.id))
      .map(({ seller_id, ...order }) => order)
  )
})

module.exports = router
