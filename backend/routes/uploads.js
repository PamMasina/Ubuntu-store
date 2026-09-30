const express = require('express')
const router = express.Router()
const { supabaseAdmin } = require('../config/supabase')
const { auth, requireRole } = require('../middleware/auth')
const { requireString, badRequest } = require('../utils/validate')

const BUCKET = process.env.LISTING_IMAGES_BUCKET || 'listing-images'
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const EXTENSION = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif'
}

// Multer is not a dependency. Vite's dev server and the browser handle image
// selection; this route exists so the frontend never has to hold the
// service_role key. It is intentionally minimal: one file, validated by MIME
// type and size, stored under the vendor's own user id.
router.post('/listing-images', auth, requireRole('vendor'), async (req, res) => {
  const contentType = req.headers['content-type'] || ''

  if (!ALLOWED_TYPES.includes(contentType)) {
    throw badRequest('Upload a JPEG, PNG, WebP or GIF image')
  }

  const declared = Number.parseInt(req.headers['content-length'], 10)
  if (Number.isFinite(declared) && declared > MAX_BYTES) {
    throw badRequest('Images must be under 5MB')
  }

  // base64 keeps this dependency-free. Real binary uploads should switch to
  // multipart and Multer, or have the browser POST directly to Storage with a
  // signed URL from this endpoint.
  const { file } = req.body
  if (typeof file !== 'string' || !file) {
    throw badRequest('No file supplied. Send base64 in "file".')
  }

  const payload = file.includes(',') ? file.slice(file.indexOf(',') + 1) : file
  let buffer
  try {
    buffer = Buffer.from(payload, 'base64')
  } catch {
    throw badRequest('File must be base64 encoded')
  }

  if (!buffer.length) throw badRequest('File is empty')
  if (buffer.length > MAX_BYTES) throw badRequest('Images must be under 5MB')

  // Path is namespaced by user id, so one vendor cannot overwrite another's
  // file even if they guess the filename.
  const path = `${req.user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${EXTENSION[contentType]}`

  const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false
  })

  if (error) {
    console.error('Storage upload failed:', error.message)
    throw badRequest('Could not upload the image. Check the storage bucket exists and is public.')
  }

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path)
  res.status(201).json({ url: data.publicUrl, path })
})

module.exports = router
