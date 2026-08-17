const express = require('express')
const router = express.Router()
const { supabase } = require('../config/supabase')
const { auth } = require('../middleware/auth')

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('board_posts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.post('/', auth, async (req, res) => {
  const { title, content } = req.body
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' })
  }

  const { data, error } = await supabase
    .from('board_posts')
    .insert({ title, content, author_id: req.user.id })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

module.exports = router
