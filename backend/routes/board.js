const express = require('express')
const router = express.Router()
const { supabaseAdmin } = require('../config/supabase')
const { auth } = require('../middleware/auth')
const { requireString, requireUuid, notFound } = require('../utils/validate')

const MAX_LIMIT = 50

router.get('/', async (req, res) => {
  const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, MAX_LIMIT)

  const { data, error } = await supabaseAdmin
    .from('board_posts')
    .select('id, title, content, author_id, created_at, author:profiles!board_posts_author_id_fkey (id, full_name)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  res.json(data)
})

router.post('/', auth, async (req, res) => {
  const title = requireString(req.body.title, 'Title', { min: 3, max: 120 })
  const content = requireString(req.body.content, 'Content', { min: 1, max: 4000 })

  const { data, error } = await supabaseAdmin
    .from('board_posts')
    // author_id is taken from the verified token, not the request body.
    .insert({ title, content, author_id: req.user.id })
    .select()
    .single()

  if (error) throw error
  res.status(201).json(data)
})

router.delete('/:id', auth, async (req, res) => {
  const id = requireUuid(req.params.id, 'Post id')

  const { data, error } = await supabaseAdmin
    .from('board_posts')
    .delete()
    .eq('id', id)
    .eq('author_id', req.user.id)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) throw notFound('Post not found')

  res.json({ message: 'Post deleted' })
})

module.exports = router
