const express = require('express')
const router = express.Router()
const { supabase } = require('../config/supabase')
const { auth } = require('../middleware/auth')

router.get('/:sellerId', async (req, res) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('seller_id', req.params.sellerId)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/', auth, async (req, res) => {
  const { seller_id, rating, comment } = req.body
  if (!seller_id || !rating) {
    return res.status(400).json({ error: 'Seller ID and rating are required' })
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' })
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert({
      seller_id,
      reviewer_id: req.user.id,
      rating,
      comment: comment || null
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

module.exports = router
