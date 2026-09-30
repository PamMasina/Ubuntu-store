import { Link } from 'react-router-dom'
import Header from '../components/Header'

export default function Board() {
  return (
    <>
      <Header />
      <main className="page page-narrow">
        <h1>Community board</h1>
        <p className="muted">
          The bulletin board exists on the backend. You can wire this page to
          <code> GET/POST /api/board</code> when you need it. For now it is a
          placeholder so links in the nav do not hit a 404.
        </p>
        <Link className="btn" to="/">Back to marketplace</Link>
      </main>
    </>
  )
}
