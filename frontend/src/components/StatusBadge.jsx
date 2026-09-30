// Maps a server status onto the wording a student would use, and the colour
// to show it in. Shared by the order screens so the vocabulary stays identical.
const ORDER_LABELS = {
  pending: 'Awaiting vendor',
  confirmed: 'Vendor confirmed',
  ready: 'Ready for pickup',
  collected: 'Collected',
  cancelled: 'Cancelled'
}

const ORDER_HINTS = {
  pending: 'The seller has not accepted this yet.',
  confirmed: 'The meetup is agreed. Arrive at the agreed time.',
  ready: 'The item is waiting at the meetup point.',
  collected: 'Handed over and paid. Leave a review.',
  cancelled: 'This order was called off and the stock released.'
}

export function orderLabel(status) {
  return ORDER_LABELS[status] || status
}

export function orderHint(status) {
  return ORDER_HINTS[status] || ''
}

export default function StatusBadge({ status, kind = 'order' }) {
  return (
    <span className={`status-badge status-${kind}-${status}`}>
      {kind === 'order' ? orderLabel(status) : status}
    </span>
  )
}
