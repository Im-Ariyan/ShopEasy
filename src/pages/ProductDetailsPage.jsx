import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { requireSupabase } from '../lib/supabase.js'
import { currency } from '../lib/shop-data.js'
import ProductImage from '../components/ProductImage.jsx'

function ProductDetailsPage() {
  const { productId } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [variantId, setVariantId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true
    async function loadProduct() {
      setLoading(true)
      setError('')
      try {
        const { data, error: queryError } = await requireSupabase()
          .from('products')
          .select('id,name,description,price,image_url,categories(name),product_variants(id,size_label,stock)')
          .eq('id', productId)
          .eq('active', true)
          .single()
        if (queryError) throw queryError
        if (mounted) {
          setProduct(data)
          const firstAvailable = data.product_variants?.find((variant) => variant.stock > 0)
          setVariantId(firstAvailable?.id ?? data.product_variants?.[0]?.id ?? '')
        }
      } catch (queryError) {
        if (mounted) setError(queryError.message || 'Unable to load this product.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadProduct()
    return () => { mounted = false }
  }, [productId])

  async function addToBag() {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { error: actionError } = await requireSupabase().rpc('add_to_cart', {
        p_variant_id: variantId,
        p_quantity: quantity,
      })
      if (actionError) throw actionError
      setMessage('Added to your bag.')
      window.dispatchEvent(new Event('shopeasy-cart-update'))
    } catch (actionError) {
      setError(actionError.message || 'Unable to add this item to your bag.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <main className="page-shell"><p className="state-message" role="status">Loading product…</p></main>
  if (error && !product) return <main className="page-shell"><p className="notice" role="alert">{error}</p></main>
  if (!product) return null

  const selected = product.product_variants?.find((variant) => variant.id === variantId)
  const inStock = product.product_variants?.some((variant) => variant.stock > 0)

  return (
    <main className="page-shell">
      <section className="product-detail">
        <ProductImage className="product-detail-image" src={product.image_url} alt={product.name} />
        <div className="product-detail-info">
          <p className="eyebrow">{product.categories?.name}</p>
          <h1>{product.name}</h1>
          <p className="product-detail-price">{currency.format(Number(product.price))}</p>
          <p className={`stock-label ${inStock ? 'stock-available' : 'stock-unavailable'}`}>{inStock ? 'In stock' : 'Out of stock'}</p>
          <p className="product-description">{product.description}</p>
          {product.product_variants?.length > 1 && (
            <label className="size-choice">
              <span>Size</span>
              <select value={variantId} onChange={(event) => {
                const nextId = event.target.value
                const nextVariant = product.product_variants.find((variant) => variant.id === nextId)
                setVariantId(nextId)
                setQuantity((current) => Math.min(current, Math.max(1, nextVariant?.stock ?? 1)))
              }}>
                {product.product_variants.map((variant) => (
                  <option key={variant.id} value={variant.id} disabled={variant.stock < 1}>
                    {variant.size_label}{variant.stock < 1 ? ' — out of stock' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          {error && <p className="inline-error" role="alert">{error}</p>}
          {message && <p className="inline-success" role="status">{message}</p>}
          <label className="size-choice product-quantity">
            <span>Quantity</span>
            <input
              type="number"
              min="1"
              max={Math.min(99, selected?.stock ?? 1)}
              value={quantity}
              onChange={(event) => setQuantity(Math.max(1, Math.min(99, Number(event.target.value) || 1)))}
            />
          </label>
          <div className="product-actions">
            <button className="button button-primary" type="button" disabled={busy || !selected || selected.stock < quantity} onClick={addToBag}>
              {busy ? 'Adding…' : 'Add to Bag'}
            </button>
            <button className="button button-secondary" type="button" disabled={!selected || quantity > selected.stock} onClick={() => navigate(`/checkout?variantId=${encodeURIComponent(variantId)}&quantity=${quantity}`)}>
              Buy Now
            </button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default ProductDetailsPage
