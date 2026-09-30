// Payment provider seam.
//
// Ubuntu Store settles cash at the meetup, so the only method today is 'cash':
// an order is created unpaid and flips to paid when the buyer marks it
// collected. That is a real, complete flow, not a stub.
//
// To add a real gateway later, implement the same two functions behind a
// provider object and register it here. Nothing in routes/ needs to change.

// Settling at the meetup means there is nothing to charge up front.
function startCashPayment(order) {
  return {
    provider: 'cash',
    reference: order.reference,
    // Nothing to redirect to: the buyer pays the vendor in person.
    redirectUrl: null,
    instructions: 'Pay the vendor in cash when you collect your item.'
  }
}

// Post-payment confirmation. For cash this is driven by the order lifecycle
// rather than a gateway callback, so it simply reports the settled state.
function confirmCashPayment(order) {
  return {
    provider: 'cash',
    reference: order.reference,
    paidAt: order.updated_at
  }
}

const providers = {
  cash: {
    name: 'cash',
    start: startCashPayment,
    confirm: confirmCashPayment
  }
}

// PayFast is intentionally not registered. Uncomment once PAYFAST_MERCHANT_ID,
// PAYFAST_MERCHANT_KEY and PAYFAST_PASSPHRASE are set and you implement
// buildSignature() and verifyNotification() against their docs:
//   https://developers.payfast.co.za/docs
//
// const payfast = {
//   name: 'payfast',
//   start: (order) => { ... throw new Error('Redirect URL not built') },
//   confirm: (order) => { ... }
// }
// providers.payfast = payfast

function getProvider(name) {
  return providers[name] || null
}

module.exports = { getProvider, providers }
