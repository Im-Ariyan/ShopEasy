import { Link, useLocation } from 'react-router-dom'

function PlaceholderPage({ title, isAdmin = false }) {
  const location = useLocation()

  return (
    <main className="page-shell">
      <section className="placeholder-panel">
        <p className="eyebrow">{isAdmin ? 'Administrator workspace' : 'ShopEasy'}</p>
        <h1>{title}</h1>
        <p>
          This page is part of a later implementation phase. Sign-in is active;
          shopping data and operations are not implemented yet.
        </p>
        {isAdmin && <p className="notice">Administrator access is verified by the database before this page is shown.</p>}
        <p className="route-label">Current route: <code>{location.pathname}</code></p>
        <Link className="button button-secondary" to="/">Return home</Link>
      </section>
    </main>
  )
}

export default PlaceholderPage
