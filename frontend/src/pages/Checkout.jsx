import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import { EmptyState, Banner, Spinner } from '../components/States'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

// Checkout is meetup-only. There is no address field, no courier, no delivery
// fee: the student picks where and when on campus, and pays cash on handover.
export default function Checkout() {
  const { session } = useAuth()
  const { items, clear, isMixed } = useCart()

  const [meta, setMeta] = useState({ meetupPoints: [], meetupSlots: [] })
  const [meetupPoint, setMeetupPoint] = useState('')
  const [meetupSlot, setMeetupSlot] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placed, setPlaced] = useState(null)
  const [loadingMeta, setLoadingMeta] = useState(true)

  useEffect(() => {
    api
      .getMeta()
      .then((data) => {
        setMeta(data)
        setMeetupPoint((current) => current || data.meetupPoints[0] || '')
        setMeetupSlot((current) => current || data.meetupSlots[0] || '')
      })
      .catch(() => setError('Could not load meetup options.'))
      .finally(() => setLoadingMeta(false))
  }, [])

  if (placed) {
    return (
      <>
        <Header />
        <main className="page page-narrow">
          <h1>Order placed</h1>
          <p className="muted">
            Your reference is{' '}
            <strong className="mono">{placed.reference}</strong>. Quote it to
            the seller at the meetup.
          </p>
          {placed.extraCount > 0 && (
            <Banner kind="info">
              {placed.extraCount} more {placed.extraCount === 1 ? 'item is' : 'items are'}{' '}
              still waiting from {placed.extraSellers}{' '}
              {placed.extraSellers === 1 ? 'seller' : 'sellers'}.
            </Banner>
          )}

          <div className="card" style={{ padding: '1.25rem' }}>
            <p className="small muted">You are meeting</p>
            <p style={{ margin: '0 0 0.75rem' }}><strong>{placed.meetup_point}</strong></p>
            <p className="small muted">When</p>
            <p style={{ margin: '0 0 0.75rem' }}><strong>{placed.meetup_slot}</strong></p>
            <p className="small muted">Pay the seller</p>
            <p style={{ margin: 0 }}>R{Number(placed.total).toFixed(2)} in cash, on collection.</p>
          </div>

          <p className="muted small">
            The seller still has to accept. Track it under My Orders.
          </p>

          <div className="row" style={{ marginTop: '1.5rem' }}>
            <Link className="btn" to="/orders">View my orders</Link>
            <Link className="btn btn-ghost" to="/">Keep browsing</Link>
          </div>
        </main>
      </>
    )
  }

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="page page-narrow">
          <h2>Checkout</h2>
          <EmptyState
            title="There is nothing to check out"
            action={<Link className="btn" to="/">Browse the marketplace</Link>}
          />
        </main>
      </>
    )
  }

  // One order per seller, since the backend validates a single meetup slot per
  // order. A mixed cart is walked through seller by seller.
  const [firstSeller, ...rest] = items
  const sellerItems = items.filter((item) => item.sellerId === firstSeller.sellerId)
  const sellerName = sellerItems[0].sellerName

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    setError('')

    if (!meetupPoint || !meetupSlot) {
      setError('Choose a meetup point and a time slot.')
      return
    }

    setPlacing(true)
    try {
      // One order per listing keeps the stock reservation honest: each RPC call
      // checks and decrements the listing it belongs to.
      const created = []
      for (const item of sellerItems) {
        const order = await api.placeOrder(
          {
            listing_id: item.id,
            quantity: item.quantity,
            meetup_point: meetupPoint,
            meetup_slot: meetupSlot,
            note: note.trim() || null
          },
          session.access_token
        )
        created.push(order)
      }

      if (rest.length) {
        // Keep the other sellers' items so the student can place the next
        // order straight away, and tell them plainly what happened.
        const others = new Set(rest.map((i) => i.sellerName))
        setPlaced({
          ...created[0],
          extraCount: rest.length,
          extraSellers: others.size
        })
        setError(
          `Order placed for ${sellerName}. Your cart still holds items from ${
            others.size
          } other seller(s). Place those orders next.`
        )
      } else {
        setPlaced(created[0])
      }
      clear()
    } catch (err) {
      setError(err.message)
    } finally {
      setPlacing(false)
    }
  }

  if (loadingMeta) {
    return (<><Header /><main className="page page-narrow"><Spinner /></main></>)
  }

  const sellerTotal = sellerItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  return (
    <>
      <Header />
      <main className="page page-medium">
        <h2>Checkout</h2>
        <p className="muted small">
          Meetup only, pay in cash. Nothing is shipped and no card is charged.
        </p>

        <Banner kind={error ? 'error' : 'info'}>{error}</Banner>

        <form className="split" onSubmit={handlePlaceOrder}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3>Where and when</h3>

            <div className="field">
              <label htmlFor="meetup-point">Meetup point</label>
              <select
                id="meetup-point"
                className="input"
                value={meetupPoint}
                onChange={(e) => setMeetupPoint(e.target.value)}
              >
                {meta.meetupPoints.map((point) => (
                  <option key={point} value={point}>{point}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="meetup-slot">Time slot</label>
              <select
                id="meetup-slot"
                className="input"
                value={meetupSlot}
                onChange={(e) => setMeetupSlot(e.target.value)}
              >
                {meta.meetupSlots.map((slot) => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="note">Note for the seller (optional)</label>
              <textarea
                id="note"
                className="input"
                rows={3}
                maxLength={500}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Where in the building, or anything they should bring."
              />
              <p className="hint">{note.length}/500</p>
            </div>
          </div>

          <aside className="card" style={{ padding: '1.25rem' }}>
            <h3>Order for {sellerName}</h3>

            <div className="stack">
              {sellerItems.map((item) => (
                <div key={item.id} className="row-between">
                  <span className="small">
                    {item.title} &times;{item.quantity}
                  </span>
                  <span className="small nowrap">
                    R{(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <hr className="divider" />

            <div className="row-between">
              <span>Total</span>
              <strong>R{sellerTotal.toFixed(2)}</strong>
            </div>
            <p className="muted small">Payable in cash at the meetup.</p>

            <button className="btn" type="submit" disabled={placing} style={{ width: '100%' }}>
              {placing ? 'Placing order...' : 'Place order'}
            </button>

            {isMixed && (
              <p className="muted small" style={{ marginTop: '0.75rem' }}>
                You will place one order per seller.
              </p>
            )}
          </aside>
        </form>
      </main>
    </>
  )
}
