import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase.js'

function AuthPage({ isRegister = false }) {
  const { user, loading: sessionLoading, error: sessionError } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  if (sessionLoading) {
    return <div className="auth-loading" role="status">Restoring your session…</div>
  }

  if (user) {
    const destination = location.state?.from
    return <Navigate
      to={destination ? `${destination.pathname}${destination.search ?? ''}` : '/'}
      replace
      state={destination?.state}
    />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Add the project URL and public key to .env, then restart Vite.')
      return
    }

    setBusy(true)

    try {
      const client = requireSupabase()
      const result = isRegister
        ? await client.auth.signUp({
            email: email.trim(),
            password,
            options: { data: { username: username.trim() } },
          })
        : await client.auth.signInWithPassword({ email: email.trim(), password })

      if (result.error) {
        setError(result.error.message)
      } else if (isRegister && !result.data.session) {
        setMessage('Account created. Check your email to confirm your address, then sign in.')
      } else {
        const destination = location.state?.from
        navigate(destination ? `${destination.pathname}${destination.search ?? ''}` : '/', {
          replace: true,
          state: destination?.state,
        })
      }
    } catch (authError) {
      setError(authError.message || 'Authentication failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="auth-title">
        <Link className="brand auth-brand" to="/" aria-label="ShopEasy">
          <span className="brand-mark">S</span>
          <span>Shop<span className="brand-accent">Easy</span></span>
        </Link>
        <p className="eyebrow">{isRegister ? 'Join ShopEasy' : 'Your everyday, made easy'}</p>
        <h1 id="auth-title">{isRegister ? 'Create your account' : 'Welcome back'}</h1>
        <p className="auth-description">
          {isRegister
            ? 'Create an account to access the ShopEasy store.'
            : 'Sign in to continue to ShopEasy.'}
        </p>
        {sessionError && <p className="form-message form-error" role="alert">{sessionError}</p>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <label htmlFor="username">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="nickname"
                required
                minLength={2}
                maxLength={32}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </>
          )}
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && <p className="form-message form-error" role="alert">{error}</p>}
          {message && <p className="form-message form-success" role="status">{message}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={busy}>
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="auth-switch">
          {isRegister ? 'Already have an account?' : 'New to ShopEasy?'}{' '}
          <Link to={isRegister ? '/login' : '/register'}>
            {isRegister ? 'Sign in' : 'Create an account'}
          </Link>
        </p>
      </section>
    </main>
  )
}

export default AuthPage
