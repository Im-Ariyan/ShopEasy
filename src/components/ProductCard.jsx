import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { requireSupabase } from '../lib/supabase.js'
import { currency, getVariant } from '../lib/shop-data.js'
import ProductImage from './ProductImage.jsx'

function ProductCard({ product }) {
  const navigate = useNavigate()
  const [variantId, setVariantId] = useState(getVariant(product)?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const selected = getVariant(product, variantId)
  const variants = product.product_variants ?? []
  const inStock = variants.some((variant) => variant.stock > 0)

  async function addToBag() {
    if (!selected || selected.stock < 1) return
    setBusy(true)
    setMessage('')
    setError('')
    try {
      const { error: rpcError } = await requireSupabase().rpc('add_to_cart', {
        p_variant_id: selected.id,
        p_quantity: quantity,
      })
      if (rpcError) throw rpcError
      setMessage('Added to your bag.')
      window.dispatchEvent(new Event('shopeasy-cart-update'))
    } catch (actionError) {
      setError(actionError.message || 'Could not add this product to your bag.')
    } finally {
      setBusy(false)
    }
  }

  function buyNow() {
    if (!selected || selected.stock < 1) return
    navigate(`/checkout?variantId=${encodeURIComponent(selected.id)}&quantity=${quantity}`)
  }

  return (
    <article className="product-card">
      <Link className="product-card-image-link" to={`/products/${product.id}`} aria-label={`View ${product.name}`}>
        <ProductImage className="product-card-image" src={product.image_url} alt={product.name} />
      </Link>
      <div className="product-card-content">
        <p className="product-category">{product.categories?.name}</p>
        <Link className="product-card-name" to={`/products/${product.id}`}>{product.name}</Link>
        <p className="product-price">{currency.format(Number(product.price))}</p>
        <p className={`stock-label ${inStock ? 'stock-available' : 'stock-unavailable'}`}>
          {inStock ? 'In stock' : 'Out of stock'}
        </p>
        {variants.length > 1 && (
          <label className="size-choice">
            <span>Size</span>
            <select
              value={variantId}
              onChange={(event) => {
                const nextVariantId = event.target.value
                const nextVariant = variants.find((variant) => variant.id === nextVariantId)
                setVariantId(nextVariantId)
                setQuantity((current) => Math.min(current, Math.max(1, nextVariant?.stock ?? 1)))
              }}
              aria-label={`Size for ${product.name}`}
            >
              {variants.map((variant) => (
                <option key={variant.id} value={variant.id} disabled={variant.stock < 1}>
                  {variant.size_label}{variant.stock < 1 ? ' — out of stock' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="size-choice product-quantity">
          <span>Qty</span>
          <input
            type="number"
            min="1"
            max={Math.min(99, selected?.stock ?? 1)}
            value={quantity}
            onChange={(event) => setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))}
            aria-label={`Quantity for ${product.name}`}
          />
        </label>
        <div className="product-actions">
          <button className="button button-primary" type="button" disabled={busy || !selected || selected.stock < quantity} onClick={addToBag}>
            {busy ? 'Adding…' : 'Add to Bag'}
          </button>
          <button className="button button-secondary" type="button" disabled={!selected || selected.stock < quantity} onClick={buyNow}>
            Buy Now
          </button>
        </div>
        {message && <p className="inline-success" role="status">{message}</p>}
        {error && <p className="inline-error" role="alert">{error}</p>}
      </div>
    </article>
  )
}

export default ProductCard
