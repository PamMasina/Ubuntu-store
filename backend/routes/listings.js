const express = require('express')
const router = express.Router()
const { supabase } = require('../config/supabase')
const { auth } = require('../middleware/auth')

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('listings')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error) return res.status(404).json({ error: 'Listing not found' })
  res.json(data)
})

router.post('/', auth, async (req, res) => {
  const { title, price, category, image_url, description } = req.body
  if (!title || !price || !category) {
    return res.status(400).json({ error: 'Title, price, and category are required' })
  }

  const { data, error } = await supabase
    .from('listings')
    .insert({
      title,
      price,
      category,
      image_url: image_url || null,
      description: description || null,
      seller_id: req.user.id,
      status: 'active'
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

router.put('/:id', auth, async (req, res) => {
  const { title, price, category, image_url, description } = req.body

  const { data, error } = await supabase
    .from('listings')
    .update({ title, price, category, image_url, description })
    .eq('id', req.params.id)
    .eq('seller_id', req.user.id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/:id', auth, async (req, res) => {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', req.params.id)
    .eq('seller_id', req.user.id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ message: 'Listing deleted' })
})

module.exports = router
