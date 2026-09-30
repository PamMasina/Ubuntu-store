import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import { EmptyState } from '../components/States'
import { useCart } from '../context/CartContext'

export default function Cart() {
  const { items, setQuantity, remove, totalPrice, totalUnits, isMixed, clear } = useCart()
  const navigate = useNavigate()

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main className="page page-narrow">
          <h2>Your cart</h2>
          <EmptyState
            title="Your cart is empty"
            action={<Link className="btn" to="/">Browse the marketplace</Link>}
          >
            Nothing here yet.
          </EmptyState>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="page page-medium">
        <div className="section-head">
          <h2>Your cart</h2>
          <button className="btn btn-quiet" onClick={clear}>Clear cart</button>
        </div>

        {isMixed && (
          <div className="banner banner-info">
            Your cart has items from more than one seller. Checkout takes one
            seller at a time, so you will place a separate order for each.
          </div>
        )}

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Price</th>
                <th>Quantity</th>
                <th className="right">Total</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Item">
                    <Link to={`/listing/${item.id}`}>{item.title}</Link>
                    <p className="muted small" style={{ margin: '0.15rem 0 0' }}>
                      {item.sellerName}
                    </p>
                  </td>
                  <td data-label="Price">R{item.price.toFixed(2)}</td>
                  <td data-label="Quantity">
                    <select
                      className="input"
                      style={{ width: 'auto' }}
                      value={item.quantity}
                      onChange={(e) => setQuantity(item.id, Number(e.target.value))}
                      aria-label={`Quantity for ${item.title}`}
                    >
                      {Array.from({ length: Math.min(item.stock, 10) }, (_, i) => i + 1)
                        .map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </td>
                  <td data-label="Total" className="right nowrap">
                    R{(item.price * item.quantity).toFixed(2)}
                  </td>
                  <td data-label="">
                    <button
                      className="btn btn-quiet"
                      onClick={() => remove(item.id)}
                      aria-label={`Remove ${item.title} from cart`}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row-between" style={{ marginTop: '1.25rem' }}>
          <p className="muted small" style={{ margin: 0 }}>
            {totalUnits} {totalUnits === 1 ? 'item' : 'items'}
          </p>
          <div className="row">
            <span style={{ fontWeight: 700, color: 'var(--text-h)' }}>
              R{totalPrice.toFixed(2)}
            </span>
            <button className="btn" onClick={() => navigate('/checkout')}>
              Checkout
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
