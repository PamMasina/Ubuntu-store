import { Link } from 'react-router-dom'
import Header from '../components/Header'

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="page page-narrow">
        <h1>That page does not exist</h1>
        <p className="muted">The URL you tried is not valid.</p>
        <Link className="btn" to="/">Go to the marketplace</Link>
      </main>
    </>
  )
}
