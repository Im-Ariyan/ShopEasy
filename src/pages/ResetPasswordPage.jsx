import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { requireSupabase } from '../lib/supabase.js'

function ResetPasswordPage() {
  const { user, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState(false)

  async function updatePassword(event) {
    event.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }
    if (!user) {
      setError('This reset link is invalid or has expired. Request a new one to continue.')
      return
    }

    setBusy(true)
    try {
      const { error: updateError } = await requireSupabase().auth.updateUser({ password })
      if (updateError) throw updateError
      setUpdated(true)
    } catch (updateError) {
      setError(updateError.message || 'Unable to update your password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card" aria-labelledby="reset-password-title">
        <Link className="brand auth-brand" to="/" aria-label="ShopEasy">
          <span className="brand-mark">S</span>
          <span>Shop<span className="brand-accent">Easy</span></span>
        </Link>
        <p className="eyebrow">Account recovery</p>
        <h1 id="reset-password-title">Choose a new password</h1>
        {loading ? (
          <p className="auth-description" role="status">Verifying your reset link…</p>
        ) : updated ? (
          <>
            <p className="form-message form-success" role="status">Your password has been updated successfully.</p>
            <Link className="button button-primary auth-submit" to="/">Continue to ShopEasy</Link>
          </>
        ) : user ? (
          <>
            <p className="auth-description">Choose a new password with at least 8 characters.</p>
            {error && <p className="form-message form-error" role="alert">{error}</p>}
            <form className="auth-form" onSubmit={updatePassword}>
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <label htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
              <button className="button button-primary auth-submit" type="submit" disabled={busy}>
                {busy ? 'Updating password…' : 'Save new password'}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="form-message form-error" role="alert">
              {error || 'This reset link is invalid or has expired. Request a new reset link to continue.'}
            </p>
            <Link className="button button-primary auth-submit" to="/forgot-password">Request a new reset link</Link>
          </>
        )}
      </section>
    </main>
  )
}

export default ResetPasswordPage
