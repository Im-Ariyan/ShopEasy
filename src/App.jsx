import { useEffect, useState } from 'react'
import { Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/useAuth.js'
import { requireSupabase } from './lib/supabase.js'
import AdminAccessPage from './pages/AdminAccessPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import CartPage from './pages/CartPage.jsx'
import CheckoutPage from './pages/CheckoutPage.jsx'
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import ProductDetailsPage from './pages/ProductDetailsPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import ShopPage from './pages/ShopPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import './App.css'

const navigation = [
  { to: '/', label: 'Home', end: true },
  { to: '/products', label: 'Shop' },
]

function HomePage() {
  const { user } = useAuth()
  const username = user.user_metadata?.username?.trim() || user.email?.split('@')[0] || 'there'

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <p className="eyebrow">A better everyday wardrobe</p>
        <h1>Hi, {username}<br />Good style. Easy shopping.</h1>
        <p className="hero-copy">
          Discover thoughtful everyday clothing and accessories, with a simple
          bag, Cash on Delivery checkout, and order updates in one place.
        </p>
        <Link className="button button-primary" to="/products">Explore the shop</Link>
      </section>
    </main>
  )
}

function RequireAuth() {
  const { user, loading, error } = useAuth()
  const location = useLocation()

  if (loading) {
    return <main className="auth-loading" role="status">Checking your sign-in…</main>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (error) {
    return <main className="auth-loading form-error" role="alert">{error}</main>
  }

  return <Outlet />
}

function StoreLayout() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const username = user.user_metadata?.username?.trim() || user.email?.split('@')[0] || 'there'
  const [error, setError] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let mounted = true
    requireSupabase().rpc('is_shop_admin').then(({ data, error: accessError }) => {
      if (mounted) setIsAdmin(!accessError && data === true)
    }).catch(() => {
      if (mounted) setIsAdmin(false)
    })
    return () => { mounted = false }
  }, [user.id])

  async function handleSignOut() {
    setError('')
    try {
      const { error: signOutError } = await requireSupabase().auth.signOut()

      if (signOutError) {
        setError(signOutError.message)
        return
      }

      setMenuOpen(false)
      navigate('/login', { replace: true })
    } catch (signOutError) {
      setError(signOutError.message || 'Unable to sign out. Please try again.')
    }
  }

  return (
    <div className="app-frame">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="ShopEasy home">
          <span className="brand-mark">S</span>
          <span>Shop<span className="brand-accent">Easy</span></span>
        </Link>
        <nav className="main-navigation" aria-label="Main navigation">
          {navigation.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end}>{label}</NavLink>
          ))}
        </nav>
        <div className="header-actions">
          <CartIconLink />
          <div className="menu-anchor">
            <button
              className="icon-button menu-button"
              type="button"
              aria-label={menuOpen ? 'Close account menu' : 'Open account menu'}
              aria-expanded={menuOpen}
              aria-controls="account-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
            {menuOpen && (
              <div className="account-menu" id="account-menu">
                <div className="menu-greeting">Hi, {username}</div>
                <Link to="/orders" onClick={() => setMenuOpen(false)}>Your orders</Link>
                {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)}>Admin dashboard</Link>}
                <Link to="/settings" onClick={() => setMenuOpen(false)}>Settings</Link>
                <button type="button" onClick={handleSignOut}>Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>
      {error && <p className="global-error" role="alert">{error}</p>}
      <Outlet />
      <footer className="site-footer">
        <span>ShopEasy</span>
        <span>Simple style for every day.</span>
      </footer>
    </div>
  )
}

function NotFoundPage() {
  return <PlaceholderPage title="Page not found" />
}

function CartIconLink() {
  const [count, setCount] = useState(0)
  const [countError, setCountError] = useState('')
  const { user } = useAuth()
  useEffect(() => {
    let mounted = true
    const updateCount = async () => {
      try {
        const { data, error } = await requireSupabase()
          .from('cart_items')
          .select('quantity')
          .eq('user_id', user.id)
        if (error) throw error
        if (mounted) {
          setCount((data ?? []).reduce((sum, row) => sum + row.quantity, 0))
          setCountError('')
        }
      } catch (loadError) {
        if (mounted) {
          setCount(0)
          setCountError(loadError.message || 'Cart count unavailable.')
        }
      }
    }
    updateCount()
    window.addEventListener('shopeasy-cart-update', updateCount)
    return () => {
      mounted = false
      window.removeEventListener('shopeasy-cart-update', updateCount)
    }
  }, [user.id])

  return (
    <Link className="icon-button cart-button" to="/cart" aria-label={countError ? `Shopping bag, ${countError}` : `Shopping bag, ${count} items`}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 1.9-1.4L21 8H6" />
        <circle cx="10" cy="20" r="1.2" />
        <circle cx="18" cy="20" r="1.2" />
      </svg>
      {count > 0 && <span className="cart-count">{count}</span>}
    </Link>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage isRegister />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<StoreLayout />}>
          <Route index element={<HomePage />} />
          <Route path="products" element={<ShopPage />} />
          <Route path="products/:productId" element={<ProductDetailsPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="admin" element={<AdminAccessPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
