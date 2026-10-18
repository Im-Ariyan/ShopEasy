import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import ProductImage from '../components/ProductImage.jsx'
import { useAuth } from '../auth/useAuth.js'
import { requireSupabase } from '../lib/supabase.js'
import { currency, getProductFromCartRow } from '../lib/shop-data.js'

function CheckoutPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('orderId')
  const variantId = searchParams.get('variantId')
  const requestedQuantity = Math.max(1, Math.min(99, Number.parseInt(searchParams.get('quantity') ?? '1', 10) || 1))
  const checkoutIntent = variantId ? `${variantId}:${requestedQuantity}` : 'cart'
  const [checkoutKey] = useState(() => {
    const keyName = `shopeasy-checkout:${checkoutIntent}`
    const existingKey = sessionStorage.getItem(keyName)
    if (existingKey) return existingKey
    const newKey = crypto.randomUUID()
    sessionStorage.setItem(keyName, newKey)
    return newKey
  })
  const [items, setItems] = useState([])
  const [form, setForm] = useState(() => ({
    fullName: user.user_metadata?.full_name ?? '',
    phone: user.user_metadata?.phone ?? '',
    address: user.user_metadata?.delivery_address ?? '',
    city: user.user_metadata?.city ?? '',
    pinCode: user.user_metadata?.pin_code ?? '',
  }))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)

  useEffect(() => {
    let mounted = true
    async function loadItems() {
      setLoading(true)
      setError('')
      try {
        const client = requireSupabase()
          if (orderId) {
            const { data, error: queryError } = await client.from('orders')
              .select('id,total')
              .eq('id', orderId)
              .single()
            if (queryError) throw queryError
            if (mounted) setPlacedOrder({ order_id: data.id, order_total: data.total })
          } else if (variantId) {
          const { data, error: queryError } = await client.from('product_variants')
            .select('id,size_label,stock,products!inner(id,name,price,image_url,active)')
            .eq('id', variantId)
            .eq('products.active', true)
            .single()
          if (queryError) throw queryError
          const product = Array.isArray(data.products) ? data.products[0] : data.products
          if (requestedQuantity > data.stock) throw new Error('There is not enough stock for this item.')
          if (mounted) setItems([{ variant: data, product, quantity: requestedQuantity }])
        } else {
          const { data, error: queryError } = await client.from('cart_items')
            .select('quantity,variant_id,product_variants!inner(id,size_label,stock,products!inner(id,name,price,image_url,active))')
            .order('created_at', { ascending: true })
          if (queryError) throw queryError
          if (mounted) setItems((data ?? []).map(getProductFromCartRow).filter(Boolean).map((item) => ({
            variant: item.variant,
            product: item.product,
            quantity: item.quantity,
          })))
        }
      } catch (queryError) {
        if (mounted) setError(queryError.message || 'Unable to load checkout items.')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadItems()
    return () => { mounted = false }
  }, [orderId, variantId, requestedQuantity])

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0),
    [items],
  )

  async function placeOrder(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data, error: rpcError } = await requireSupabase().rpc('create_cod_order', {
        p_full_name: form.fullName,
        p_phone: form.phone,
        p_address: form.address,
        p_city: form.city,
        p_pin_code: form.pinCode,
        p_checkout_key: checkoutKey,
        p_variant_id: variantId,
        p_quantity: variantId ? requestedQuantity : 1,
      })
      if (rpcError) throw rpcError
      const order = Array.isArray(data) ? data[0] : data
      setPlacedOrder(order)
      if (!variantId) window.dispatchEvent(new Event('shopeasy-cart-update'))
      sessionStorage.removeItem(`shopeasy-checkout:${checkoutIntent}`)
      navigate(`/checkout?orderId=${encodeURIComponent(order.order_id)}`, { replace: true })
    } catch (placeError) {
      setError(placeError.message || 'Unable to place your order. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (placedOrder) {
    return (
      <main className="page-shell">
        <section className="empty-state order-success">
          <p className="eyebrow">Order confirmed</p>
          <h1>Thank you for your order</h1>
          <p>Your order was placed with Cash on Delivery.</p>
          <p className="order-id">Order ID: <code>{placedOrder.order_id}</code></p>
          <Link className="button button-primary" to="/orders">Track your order</Link>
        </section>
      </main>
    )
  }

  if (loading) return <main className="page-shell"><p className="state-message" role="status">Loading checkout…</p></main>
  if (!items.length) {
    return (
      <main className="page-shell">
        {error && <p className="notice" role="alert">{error}</p>}
        <section className="empty-state">
          <h1>Nothing to check out</h1>
          <p>Your bag is empty. Add products before continuing.</p>
          <Link className="button button-primary" to="/products">Explore the shop</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell">
      <p className="eyebrow">Almost yours</p>
      <h1 className="page-title">Cash on Delivery checkout</h1>
      {error && <p className="notice" role="alert">{error}</p>}
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={placeOrder}>
          <h2>Delivery details</h2>
          <label>Full name<input required minLength={2} maxLength={120} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} /></label>
          <label>Phone number<input required type="tel" minLength={7} maxLength={20} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
          <label>Address<textarea required minLength={5} maxLength={500} rows={3} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
          <div className="checkout-address-row">
            <label>City<input required minLength={2} maxLength={100} value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
            <label>PIN code<input required minLength={4} maxLength={12} value={form.pinCode} onChange={(event) => setForm({ ...form, pinCode: event.target.value })} /></label>
          </div>
          <p className="payment-choice"><strong>Payment method</strong><span>Cash on Delivery (COD)</span></p>
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Placing order…' : `Place Order — ${currency.format(total)}`}</button>
        </form>
        <aside className="order-summary checkout-summary">
          <h2>Order summary</h2>
          {items.map((item) => (
            <div className="checkout-item" key={item.variant.id}>
              <ProductImage src={item.product.image_url} alt={item.product.name} className="checkout-item-image" />
              <div><strong>{item.product.name}</strong><small>{item.variant.size_label} · Qty {item.quantity}</small></div>
              <strong>{currency.format(Number(item.product.price) * item.quantity)}</strong>
            </div>
          ))}
          <div><span>Delivery</span><strong>Free</strong></div>
          <div className="summary-total"><span>Total payable</span><strong>{currency.format(total)}</strong></div>
        </aside>
      </div>
    </main>
  )
}

export default CheckoutPage
