const express = require('express')
const router = express.Router()
const { supabaseAdmin } = require('../config/supabase')
const { auth } = require('../middleware/auth')
const { getProvider } = require('../config/paymentProvider')
const { requireOneOf, requireUuid, notFound } = require('../utils/validate')
const { PAYMENT_METHODS } = require('../config/constants')

// Declares how an order will be settled. Cash only for now, so this records
// the choice and hands back instructions rather than opening a gateway.
router.post('/initiate', auth, async (req, res) => {
  const orderId = requireUuid(req.body.order_id, 'Order id')
  const method = requireOneOf(req.body.method || 'cash', 'Method', PAYMENT_METHODS)

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, reference, buyer_id, seller_id, status, total, payment_status')
    .eq('id', orderId)
    .single()

  if (error) throw notFound('Order not found')
  if (order.buyer_id !== req.user.id) throw notFound('Order not found')
  if (order.status === 'collected' || order.status === 'cancelled') {
    throw notFound('Order not found')
  }

  const provider = getProvider(method)
  if (!provider) {
    return res.status(400).json({ error: `Payment method ${method} is not available` })
  }

  res.json(provider.start(order))
})

// Current settlement state for an order. Both parties can read it.
router.get('/:orderId', auth, async (req, res) => {
  const orderId = requireUuid(req.params.orderId, 'Order id')

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, reference, buyer_id, seller_id, status, total, payment_status, payment_method')
    .eq('id', orderId)
    .single()

  if (error) throw notFound('Order not found')
  if (order.buyer_id !== req.user.id && order.seller_id !== req.user.id) {
    throw notFound('Order not found')
  }

  const provider = getProvider(order.payment_method)
  res.json({
    status: order.payment_status,
    total: Number(order.total),
    reference: order.reference,
    settlement: provider && order.status === 'collected' ? provider.confirm(order) : null
  })
})

module.exports = router
