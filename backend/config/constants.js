// Values that both the API and the browser must agree on. The database
// enforces the same lists via check constraints and the place_order() function.

const LISTING_CATEGORIES = [
  'Textbooks',
  'Electronics',
  'Clothing',
  'Services',
  'Other'
]

// Campus marketplace: goods are handed over in person, so the buyer picks a
// spot on campus and a window. There is no address and no delivery fee.
const MEETUP_POINTS = [
  'Main Library entrance',
  'Student Centre',
  'Engineering Courtyard',
  'Sports Complex',
  'Main Gate'
]

const MEETUP_SLOTS = [
  'Mon 12:00 - 14:00',
  'Mon 16:00 - 18:00',
  'Tue 12:00 - 14:00',
  'Tue 16:00 - 18:00',
  'Wed 12:00 - 14:00',
  'Wed 16:00 - 18:00',
  'Thu 12:00 - 14:00',
  'Thu 16:00 - 18:00',
  'Fri 12:00 - 14:00',
  'Fri 16:00 - 18:00'
]

const LISTING_STATUSES = ['active', 'sold', 'archived']

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'ready',
  'collected',
  'cancelled'
]

// Cash on collection. Kept as a list so swapping in a real gateway later is a
// one-line change; see config/paymentProvider.js.
const PAYMENT_METHODS = ['cash']

const ROLES = ['student', 'vendor']

module.exports = {
  LISTING_CATEGORIES,
  MEETUP_POINTS,
  MEETUP_SLOTS,
  LISTING_STATUSES,
  ORDER_STATUSES,
  PAYMENT_METHODS,
  ROLES
}
