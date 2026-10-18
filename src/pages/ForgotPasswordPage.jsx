import { useState } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured, requireSupabase } from '../lib/supabase.js'

function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function sendResetLink(event) {
    event.preventDefault()
    setError('')

    if (!isSupabaseConfigured) {
      setError('Supabase is not configured. Check the deployment environment variables and rebuild the site.')
      return
    }

    setBusy(true)
    try {
      const { error: resetError } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) throw resetError
      setSent(true)
    } catch (requestError) {
      setError(requestError.message || 'Unable to send a password reset email.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="forgot-password-title">
        <Link className="brand auth-brand" to="/" aria-label="ShopEasy">
          <span className="brand-mark">S</span>
          <span>Shop<span className="brand-accent">Easy</span></span>
        </Link>
        <p className="eyebrow">Account recovery</p>
        <h1 id="forgot-password-title">Forgot your password?</h1>
        {sent ? (
          <>
            <p className="auth-description">If an account exists for that email, we’ve sent a password reset link. Check your inbox and spam folder.</p>
            <Link className="button button-primary auth-submit" to="/login">Back to sign in</Link>
          </>
        ) : (
          <>
            <p className="auth-description">Enter the email address on your account and we’ll send you a link to choose a new password.</p>
            {error && <p className="form-message form-error" role="alert">{error}</p>}
            <form className="auth-form" onSubmit={sendResetLink}>
              <label htmlFor="recovery-email">Email address</label>
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <button className="button button-primary auth-submit" type="submit" disabled={busy}>
                {busy ? 'Sending link…' : 'Send reset link'}
              </button>
            </form>
            <p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
          </>
        )}
      </section>
    </main>
  )
}

export default ForgotPasswordPage
