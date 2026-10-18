import { useState } from 'react'
import { useWishlist } from '../context/useWishlist.js'

function WishlistButton({ productId, productName, className = '' }) {
  const { productIds, loading, loadError, toggleWishlist } = useWishlist()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isSaved = productIds.includes(productId)

  async function handleToggle() {
    if (busy || loading || loadError) return
    setBusy(true)
    setError('')
    try {
      await toggleWishlist(productId)
    } catch (actionError) {
      setError(actionError.message || 'Unable to update your wishlist.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        className={`wishlist-button ${className}`}
        type="button"
        aria-label={`${isSaved ? 'Remove from' : 'Add to'} wishlist: ${productName}`}
        aria-pressed={isSaved}
        disabled={loading || Boolean(loadError) || busy}
        onClick={handleToggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.8 8.6c0 4.1-8.8 10.1-8.8 10.1S3.2 12.7 3.2 8.6a4.4 4.4 0 0 1 8.8-.1 4.4 4.4 0 0 1 8.8.1Z" />
        </svg>
      </button>
      {error && <span className="wishlist-action-error" role="alert">{error}</span>}
    </>
  )
}

export default WishlistButton
