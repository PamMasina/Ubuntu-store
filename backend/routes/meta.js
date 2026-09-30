const express = require('express')
const router = express.Router()
const {
  LISTING_CATEGORIES,
  MEETUP_POINTS,
  MEETUP_SLOTS,
  ORDER_STATUSES
} = require('../config/constants')

// Served once at startup so the browser and the API can never drift apart on
// what categories or meetup slots are valid.
router.get('/', (_req, res) => {
  res.json({
    categories: LISTING_CATEGORIES,
    meetupPoints: MEETUP_POINTS,
    meetupSlots: MEETUP_SLOTS,
    orderStatuses: ORDER_STATUSES
  })
})

module.exports = router
