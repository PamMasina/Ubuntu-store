const express = require('express')
const router = express.Router()

router.post('/initiate', async (req, res) => {
  res.status(501).json({ error: 'PayFast integration not yet implemented' })
})

router.post('/notify', async (req, res) => {
  res.status(501).json({ error: 'PayFast callback not yet implemented' })
})

module.exports = router
