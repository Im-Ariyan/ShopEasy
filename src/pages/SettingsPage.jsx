import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { requireSupabase } from '../lib/supabase.js'

function SettingsPage() {
  const { user } = useAuth()
  const metadata = user.user_metadata ?? {}
  const preferences = metadata.notification_preferences ?? {}
  const [form, setForm] = useState({
    username: metadata.username ?? '',
    fullName: metadata.full_name ?? '',
    phone: metadata.phone ?? '',
    address: metadata.delivery_address ?? '',
    city: metadata.city ?? '',
    pinCode: metadata.pin_code ?? '',
    orderUpdates: preferences.order_updates ?? true,
    productNews: preferences.product_news ?? false,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function saveSettings(event) {
    event.preventDefault()
    setError('')
    setMessage('')
    setSaving(true)

    try {
      const { data, error: updateError } = await requireSupabase().auth.updateUser({
        data: {
          ...user.user_metadata,
          username: form.username.trim(),
          full_name: form.fullName.trim(),
          phone: form.phone.trim(),
          delivery_address: form.address.trim(),
          city: form.city.trim(),
          pin_code: form.pinCode.trim(),
          notification_preferences: {
            order_updates: form.orderUpdates,
            product_news: form.productNews,
          },
        },
      })
      if (updateError) throw updateError
      if (!data.user) throw new Error('The account settings could not be confirmed. Please try again.')
      setMessage('Your settings have been saved.')
    } catch (saveError) {
      setError(saveError.message || 'Unable to save your settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <div className="page-title-row">
        <div><p className="eyebrow">Your ShopEasy account</p><h1 className="page-title">Settings</h1></div>
        <Link className="button button-secondary" to="/">Back to shopping</Link>
      </div>

      {error && <p className="notice" role="alert">{error}</p>}
      {message && <p className="inline-success" role="status">{message}</p>}

      <form className="settings-form" onSubmit={saveSettings}>
        <section className="settings-section" aria-labelledby="profile-settings-heading">
          <h2 id="profile-settings-heading">Profile</h2>
          <p>Update the details used to greet you and prefill checkout.</p>
          <label>
            Email address
            <input type="email" value={user.email ?? ''} readOnly disabled />
            <small>Your sign-in email cannot be changed here.</small>
          </label>
          <label>
            Username
            <input
              type="text"
              autoComplete="nickname"
              required
              minLength={2}
              maxLength={32}
              value={form.username}
              onChange={(event) => updateField('username', event.target.value)}
            />
          </label>
          <label>
            Full name
            <input
              type="text"
              autoComplete="name"
              minLength={2}
              maxLength={120}
              value={form.fullName}
              onChange={(event) => updateField('fullName', event.target.value)}
            />
          </label>
          <label>
            Phone number
            <input
              type="tel"
              autoComplete="tel"
              minLength={7}
              maxLength={20}
              value={form.phone}
              onChange={(event) => updateField('phone', event.target.value)}
            />
          </label>
        </section>

        <section className="settings-section" aria-labelledby="address-settings-heading">
          <h2 id="address-settings-heading">Delivery address</h2>
          <p>Save your usual delivery address to have it filled in at checkout.</p>
          <label>
            Street address
            <textarea
              autoComplete="street-address"
              required={Boolean(form.city || form.pinCode)}
              maxLength={500}
              rows={3}
              value={form.address}
              onChange={(event) => updateField('address', event.target.value)}
            />
          </label>
          <div className="settings-address-row">
            <label>
              City
              <input
                type="text"
                autoComplete="address-level2"
                maxLength={100}
                value={form.city}
                onChange={(event) => updateField('city', event.target.value)}
              />
            </label>
            <label>
              PIN code
              <input
                type="text"
                autoComplete="postal-code"
                maxLength={12}
                value={form.pinCode}
                onChange={(event) => updateField('pinCode', event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="settings-section" aria-labelledby="notification-settings-heading">
          <h2 id="notification-settings-heading">Notification preferences</h2>
          <p>Choose the types of email updates you would like to receive.</p>
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={form.orderUpdates}
              onChange={(event) => updateField('orderUpdates', event.target.checked)}
            />
            <span><strong>Order updates</strong><small>Updates about order progress and delivery.</small></span>
          </label>
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={form.productNews}
              onChange={(event) => updateField('productNews', event.target.checked)}
            />
            <span><strong>Product news</strong><small>Occasional updates about new collections and products.</small></span>
          </label>
          <p className="settings-note">Your choices are saved to your account. ShopEasy does not currently send order-update or product-news emails.</p>
        </section>

        <button className="button button-primary" type="submit" disabled={saving}>
          {saving ? 'Saving settings…' : 'Save settings'}
        </button>
      </form>
    </main>
  )
}

export default SettingsPage
