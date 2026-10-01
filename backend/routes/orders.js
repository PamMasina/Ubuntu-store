const express = require('express')
const router = express.Router()
const { supabaseAdmin } = require('../config/supabase')
const { auth } = require('../middleware/auth')
const {
  requireInt,
  requireOneOf,
  optionalString,
  requireUuid,
  notFound
} = require('../utils/validate')
const { MEETUP_POINTS, MEETUP_SLOTS, ORDER_STATUSES } = require('../config/constants')

const ITEM_FIELDS = 'id, listing_id, title, unit_price, quantity'

// --- Student side -----------------------------------------------------------

// Orders this user bought.
router.get('/', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`*, items:order_items (${ITEM_FIELDS})`)
    .eq('buyer_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  res.json(data)
})

// Orders waiting on this user as a vendor, or already handled.
router.get('/incoming', auth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`*, items:order_items (${ITEM_FIELDS})`)
    .eq('seller_id', req.user.id)
    .order('created_at', { ascending: false })

  if (error) throw error
  res.json(data)
})

// Checkout. Stock is decremented and the order written inside one database
// transaction, so two students cannot both claim the last unit.
router.post('/', auth, async (req, res) => {
  const listingId = requireUuid(req.body.listing_id, 'Listing id')
  const quantity = requireInt(req.body.quantity ?? 1, 'Quantity', { min: 1, max: 999 })
  const meetupPoint = requireOneOf(req.body.meetup_point, 'Meetup point', MEETUP_POINTS)
  const meetupSlot = requireOneOf(req.body.meetup_slot, 'Meetup slot', MEETUP_SLOTS)
  const note = optionalString(req.body.note, 'Note', { max: 500 })

  const { data, error } = await supabaseAdmin.rpc('place_order', {
    p_listing_id: listingId,
    p_quantity: quantity,
    p_meetup_point: meetupPoint,
    p_meetup_slot: meetupSlot,
    p_note: note
  })

  if (error) throw error

  // place_order returns the orders row. Attach the items so the client can
  // render the confirmation screen without a second round trip.
  const { data: items } = await supabaseAdmin
    .from('order_items')
    .select(ITEM_FIELDS)
    .eq('order_id', data.id)

  res.status(201).json({ ...data, items: items || [] })
})

// --- Shared read -----------------------------------------------------------

router.get('/:id', auth, async (req, res) => {
  const id = requireUuid(req.params.id, 'Order id')

  const { data, error } = await supabaseAdmin
    .from('orders')
    .select(`*, items:order_items (${ITEM_FIELDS})`)
    .eq('id', id)
    .single()

  if (error) throw notFound('Order not found')

  if (data.buyer_id !== req.user.id && data.seller_id !== req.user.id) {
    // 404 rather than 403, so a wrong id cannot be used to probe for real ones.
    throw notFound('Order not found')
  }

  res.json(data)
})

// --- Lifecycle -------------------------------------------------------------

// Vendor: pending -> confirmed -> ready.  Buyer: cancel, or collected.
// The database function owns the rules; this route only names a target.
router.patch('/:id/status', auth, async (req, res) => {
  const id = requireUuid(req.params.id, 'Order id')
  const status = requireOneOf(req.body.status, 'Status', ORDER_STATUSES)

  const { data, error } = await supabaseAdmin.rpc('update_order_status', {
    p_order_id: id,
    p_status: status
  })

  if (error) throw error

  res.json(data)
})

// Full contact card for the other party on an order. Both sides need this to
// actually turn up at the meetup, which is the whole point of a campus market.
router.get('/:id/contact', auth, async (req, res) => {
  const id = requireUuid(req.params.id, 'Order id')

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('buyer_id, seller_id, status')
    .eq('id', id)
    .single()

  if (error) throw notFound('Order not found')

  const isBuyer = order.buyer_id === req.user.id
  const isSeller = order.seller_id === req.user.id
  if (!isBuyer && !isSeller) throw notFound('Order not found')

  const otherId = isBuyer ? order.seller_id : order.buyer_id

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, phone, whatsapp, university')
    .eq('id', otherId)
    .single()

  if (profileError) throw notFound('User not found')

  res.json({ role: isBuyer ? 'seller' : 'buyer', profile })
})

module.exports = router
