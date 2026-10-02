const express = require('express')
const router = express.Router()
const { supabaseAdmin } = require('../config/supabase')
const { auth } = require('../middleware/auth')
const {
  requireString,
  optionalString,
  requireUuid,
  notFound,
  badRequest
} = require('../utils/validate')

// Everything about the signed-in user: profile, role, and their stats.
router.get('/me/details', auth, async (req, res) => {
  const id = req.user.id

  const [ordersBought, ordersSold, listings, reviewsWritten] = await Promise.all([
    supabaseAdmin
      .from('orders')
      .select('id, status', { count: 'exact', head: true })
      .eq('buyer_id', id),
    supabaseAdmin
      .from('orders')
      .select('id, status', { count: 'exact', head: true })
      .eq('seller_id', id),
    supabaseAdmin
      .from('listings')
      .select('id, status, stock', { count: 'exact', head: true })
      .eq('seller_id', id),
    // Reviews this user has written. A student's rating is always zero because
    // nobody reviews a buyer, so the count they authored is the number worth
    // showing them instead.
    supabaseAdmin
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('reviewer_id', id)
  ])

  const { data: rating } = await supabaseAdmin
    .from('vendor_ratings')
    .select('average_rating, review_count')
    .eq('seller_id', id)
    .maybeSingle()

  res.json({
    profile: req.profile,
    email: req.user.email,
    stats: {
      purchases: ordersBought.count || 0,
      sales: ordersSold.count || 0,
      listings: listings.count || 0,
      reviewsWritten: reviewsWritten.count || 0
    },
    averageRating: rating ? Number(rating.average_rating) : 0,
    reviewCount: rating ? Number(rating.review_count) : 0
  })
})

// Public-facing seller card, aggregated with their rating. Declared after the
// /me routes so the literal paths win any ambiguity.
router.get('/:id', async (req, res) => {
  const id = requireUuid(req.params.id, 'User id')

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, role, university, bio, avatar_url, created_at')
    .eq('id', id)
    .single()

  if (error) throw notFound('User not found')

  const { data: rating } = await supabaseAdmin
    .from('vendor_ratings')
    .select('average_rating, review_count')
    .eq('seller_id', id)
    .maybeSingle()

  res.json({
    ...data,
    averageRating: rating ? Number(rating.average_rating) : 0,
    reviewCount: rating ? Number(rating.review_count) : 0
  })
})

// Only these fields are writable. role and id are intentionally absent: a user
// must not be able to promote themselves to vendor through this endpoint.
router.put('/me', auth, async (req, res) => {
  const fullName = requireString(req.body.full_name, 'Full name', { min: 2, max: 120 })
  const phone = optionalString(req.body.phone, 'Phone', { max: 32 })
  const whatsapp = optionalString(req.body.whatsapp, 'WhatsApp', { max: 32 })
  const bio = optionalString(req.body.bio, 'Bio', { max: 500 })
  const university = optionalString(req.body.university, 'University', { max: 160 })
  const avatarUrl = optionalString(req.body.avatar_url, 'Avatar', { max: 1000 })

  if (phone && !/^[+\d][\d\s-]{5,}$/.test(phone)) {
    throw badRequest('Enter a valid phone number')
  }
  if (whatsapp && !/^[+\d][\d\s-]{5,}$/.test(whatsapp)) {
    throw badRequest('Enter a valid WhatsApp number')
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      full_name: fullName,
      phone,
      whatsapp,
      bio,
      university,
      avatar_url: avatarUrl
    })
    .eq('id', req.user.id)
    .select()
    .single()

  if (error) throw error

  res.json(data)
})

module.exports = router
