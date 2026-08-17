require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const listingRoutes = require('./routes/listings')
const paymentRoutes = require('./routes/payments')
const boardRoutes = require('./routes/board')
const reviewRoutes = require('./routes/reviews')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/listings', listingRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/board', boardRoutes)
app.use('/api/reviews', reviewRoutes)

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
