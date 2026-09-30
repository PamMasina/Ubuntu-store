require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const profileRoutes = require('./routes/profiles')
const listingRoutes = require('./routes/listings')
const orderRoutes = require('./routes/orders')
const paymentRoutes = require('./routes/payments')
const boardRoutes = require('./routes/board')
const reviewRoutes = require('./routes/reviews')
const metaRoutes = require('./routes/meta')
const uploadRoutes = require('./routes/uploads')
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler')

const app = express()
const PORT = process.env.PORT || 3000

// Allowlist rather than cors() wide open, so another site cannot drive this API
// with a visitor's session. In development the Vite dev server is the caller.
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: same-origin, curl, or a mobile client.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
      // A bare string means "serve this, but send no CORS headers". The
      // browser then blocks the read. Throwing here instead would surface as
      // an opaque 500 and log a stack trace for a routine rejection.
      return callback(null, false)
    }
  })
)

// Images arrive as base64, so the limit has to allow for the ~33% encoding
// overhead on top of a 5MB file.
app.use(express.json({ limit: '8mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/profiles', profileRoutes)
app.use('/api/listings', listingRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/board', boardRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/meta', metaRoutes)
app.use('/api/uploads', uploadRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
