import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { requireSupabase } from '../lib/supabase.js'
import { currency, getProductFromCartRow } from '../lib/shop-data.js'
import ProductImage from '../components/ProductImage.jsx'

function CartPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyVariant, setBusyVariant] = useState('')
  const [error, setError] = useState('')

  const loadCart = useCallback(async () => {
    try {
      const { data, error: queryError } = await requireSupabase()
        .from('cart_items')
        .select('quantity,variant_id,product_variants!inner(id,size_label,stock,products!inner(id,name,price,image_url,active))')
        .order('created_at', { ascending: true })
      if (queryError) throw queryError
      setItems((data ?? []).map(getProductFromCartRow).filter(Boolean))
    } catch (queryError) {
      setError(queryError.message || 'Unable to load your shopping bag.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCart() }, [loadCart])

  async function updateQuantity(item, quantity) {
    setBusyVariant(item.variant_id)
    setError('')
    try {
      const { error: updateError } = await requireSupabase().rpc('set_cart_quantity', {
        p_variant_id: item.variant_id,
        p_quantity: quantity,
      })
      if (updateError) throw updateError
      await loadCart()
      window.dispatchEvent(new Event('shopeasy-cart-update'))
    } catch (updateError) {
      setError(updateError.message || 'Unable to update the item quantity.')
    } finally {
      setBusyVariant('')
    }
  }

  async function removeItem(item) {
    setBusyVariant(item.variant_id)
    setError('')
    try {
      const { error: removeError } = await requireSupabase().rpc('remove_from_cart', {
        p_variant_id: item.variant_id,
      })
      if (removeError) throw removeError
      await loadCart()
      window.dispatchEvent(new Event('shopeasy-cart-update'))
    } catch (removeError) {
      setError(removeError.message || 'Unable to remove this item.')
    } finally {
      setBusyVariant('')
    }
  }

  const subtotal = items.reduce((total, item) => total + Number(item.product.price) * item.quantity, 0)

  return (
    <main className="page-shell">
      <div className="page-title-row">
        <div><p className="eyebrow">Your ShopEasy bag</p><h1 className="page-title">Shopping Bag</h1></div>
        <Link className="button button-secondary" to="/products">Continue shopping</Link>
      </div>
      {error && <p className="notice" role="alert">{error} If the database has not been set up, apply the documented shopping migration.</p>}
      {loading && <p className="state-message" role="status">Loading your bag…</p>}
      {!loading && items.length === 0 && (
        <section className="empty-state">
          <h2>Your bag is empty</h2>
          <p>Explore the collections and add something you love.</p>
          <Link className="button button-primary" to="/products">Explore the shop</Link>
        </section>
      )}
      {!loading && items.length > 0 && (
        <div className="cart-layout">
          <section className="cart-items" aria-label="Bag items">
            {items.map((item) => (
              <article className="cart-item" key={item.variant_id}>
                <ProductImage className="cart-item-image" src={item.product.image_url} alt={item.product.name} />
                <div className="cart-item-main">
                  <div className="cart-item-heading">
                    <h2>{item.product.name}</h2>
                    <strong className="cart-line-total">{currency.format(Number(item.product.price) * item.quantity)}</strong>
                  </div>
                  <p>Size: {item.variant.size_label}</p>
                  <p>{currency.format(Number(item.product.price))} each</p>
                  <div className="quantity-control" aria-label={`Quantity for ${item.product.name}`}>
                    <button type="button" disabled={busyVariant === item.variant_id || item.quantity <= 1} aria-label="Decrease quantity" onClick={() => updateQuantity(item, item.quantity - 1)}>−</button>
                    <span>{item.quantity}</span>
                    <button type="button" disabled={busyVariant === item.variant_id || item.quantity >= item.variant.stock} aria-label="Increase quantity" onClick={() => updateQuantity(item, item.quantity + 1)}>+</button>
                  </div>
                  <button className="text-button remove-button" type="button" disabled={busyVariant === item.variant_id} onClick={() => removeItem(item)}>Remove</button>
                </div>
              </article>
            ))}
          </section>
          <aside className="order-summary">
            <h2>Order summary</h2>
            <div><span>Subtotal</span><strong>{currency.format(subtotal)}</strong></div>
            <div><span>Delivery</span><strong>Free</strong></div>
            <div className="summary-total"><span>Total</span><strong>{currency.format(subtotal)}</strong></div>
            <Link className="button button-primary" to="/checkout">Proceed to Checkout — {currency.format(subtotal)}</Link>
            <small>Cash on Delivery available</small>
          </aside>
        </div>
      )}
    </main>
  )
}

export default CartPage
