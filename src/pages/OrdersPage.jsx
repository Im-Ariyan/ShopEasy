import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProductImage from '../components/ProductImage.jsx'
import { requireSupabase } from '../lib/supabase.js'
import { currency } from '../lib/shop-data.js'

const deliveryStatuses = ['placed', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered']
const statusLabels = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

function formatOrderId(id) {
  return id?.slice(0, 8).toUpperCase()
}

function OrderTimeline({ order, history }) {
  if (order.status === 'cancelled') {
    const cancelledAt = history.find((event) => event.status === 'cancelled')?.created_at ?? order.cancelled_at
    return (
      <div className="cancelled-timeline" role="status">
        <span className="timeline-mark">×</span>
        <div><strong>Order Cancelled</strong>{cancelledAt && <time>{new Date(cancelledAt).toLocaleString()}</time>}</div>
      </div>
    )
  }

  const currentIndex = deliveryStatuses.indexOf(order.status)
  return (
    <ol className="order-timeline" aria-label="Order tracking timeline">
      {deliveryStatuses.map((status, index) => {
        const event = history.find((entry) => entry.status === status)
        const state = index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming'
        return (
          <li className={`timeline-step timeline-${state}`} key={status}>
            <span className="timeline-dot" aria-hidden="true">{state === 'complete' ? '✓' : ''}</span>
            <div><strong>{statusLabels[status]}</strong>{event && <time>{new Date(event.created_at).toLocaleString()}</time>}</div>
          </li>
        )
      })}
    </ol>
  )
}

function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [histories, setHistories] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyOrder, setBusyOrder] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const loadOrders = useCallback(async () => {
    try {
      const client = requireSupabase()
      const { data, error: queryError } = await client.from('orders')
        .select('id,created_at,total,payment_method,payment_status,status,cancelled_at,full_name,phone,address,city,pin_code')
        .order('created_at', { ascending: false })
      if (queryError) throw queryError
      const orderRows = data ?? []
      if (orderRows.length) {
        const { data: itemRows, error: itemsError } = await client.from('order_items')
          .select('id,order_id,product_name,image_url,selected_size,unit_price,quantity')
          .in('order_id', orderRows.map((order) => order.id))
        if (itemsError) throw itemsError
        const { data: historyRows, error: historyError } = await client.from('order_status_history')
          .select('order_id,status,created_at')
          .in('order_id', orderRows.map((order) => order.id))
          .order('created_at', { ascending: true })
        if (historyError) throw historyError
        const groupedItems = (itemRows ?? []).reduce((result, item) => {
          result[item.order_id] ??= []
          result[item.order_id].push(item)
          return result
        }, {})
        const groupedHistory = (historyRows ?? []).reduce((result, item) => {
          result[item.order_id] ??= []
          result[item.order_id].push(item)
          return result
        }, {})
        setOrders(orderRows.map((order) => ({ ...order, items: groupedItems[order.id] ?? [] })))
        setHistories(groupedHistory)
      } else {
        setOrders([])
        setHistories({})
      }
    } catch (queryError) {
      setError(queryError.message || 'Unable to load your orders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadOrders()
    const refreshInterval = window.setInterval(loadOrders, 60_000)
    return () => window.clearInterval(refreshInterval)
  }, [loadOrders])

  async function cancelOrder(order) {
    if (!window.confirm(`Cancel order ${formatOrderId(order.id)}? The items will be returned to inventory.`)) return
    setBusyOrder(order.id)
    setError('')
    setNotice('')
    try {
      const { error: cancelError } = await requireSupabase().rpc('cancel_customer_order', {
        p_order_id: order.id,
      })
      if (cancelError) throw cancelError
      setNotice(`Order ${formatOrderId(order.id)} was cancelled.`)
      await loadOrders()
    } catch (cancelError) {
      setError(cancelError.message || 'Unable to cancel this order.')
    } finally {
      setBusyOrder('')
    }
  }

  return (
    <main className="page-shell">
      <div className="page-title-row">
        <div><p className="eyebrow">Your ShopEasy account</p><h1 className="page-title">Your Orders</h1></div>
        <Link className="button button-secondary" to="/products">Continue shopping</Link>
      </div>
      {error && <p className="notice" role="alert">{error} If the database has not been set up, apply the documented shopping migration.</p>}
      {notice && <p className="inline-success" role="status">{notice}</p>}
      {loading && <p className="state-message" role="status">Loading your orders…</p>}
      {!loading && !error && orders.length === 0 && (
        <section className="empty-state">
          <h2>No orders yet</h2>
          <p>Your placed orders will appear here with their current delivery status.</p>
          <Link className="button button-primary" to="/products">Explore the shop</Link>
        </section>
      )}
      <div className="orders-list">
        {orders.map((order) => {
          const canCancel = ['placed', 'confirmed'].includes(order.status)
          return (
            <article className="order-card" key={order.id}>
              <div className="order-card-header">
                <div><span className="order-id-label">Order #{formatOrderId(order.id)}</span><time>{new Date(order.created_at).toLocaleString()}</time></div>
                <span className={`order-status status-${order.status}`}>{statusLabels[order.status] ?? order.status}</span>
              </div>
              <div className="order-items-preview">
                {(order.items ?? []).slice(0, 3).map((item) => (
                  <ProductImage key={item.id} src={item.image_url} alt={item.product_name} className="order-preview-image" />
                ))}
                <div className="order-preview-copy">{(order.items ?? []).length} {(order.items ?? []).length === 1 ? 'item' : 'items'} <strong>{currency.format(Number(order.total))}</strong></div>
                {canCancel && (
                  <button className="button button-secondary cancel-order-button" type="button" disabled={busyOrder === order.id} onClick={() => cancelOrder(order)}>
                    {busyOrder === order.id ? 'Cancelling…' : 'Cancel Order'}
                  </button>
                )}
              </div>
              <details className="order-details">
                <summary>View order details and tracking</summary>
                <div className="order-detail-body">
                  <OrderTimeline order={order} history={histories[order.id] ?? []} />
                  <div className="order-purchased-items">
                    {(order.items ?? []).map((item) => (
                      <div className="purchased-item" key={item.id}>
                        <ProductImage src={item.image_url} alt={item.product_name} className="purchased-item-image" />
                        <div><strong>{item.product_name}</strong><span>Size: {item.selected_size} · Qty: {item.quantity}</span></div>
                        <strong>{currency.format(Number(item.unit_price) * item.quantity)}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="order-meta">
                    <span>Full order ID: <code>{order.id}</code></span>
                    <span>Payment: Cash on Delivery ({order.payment_status})</span>
                    <span>Order total: <strong>{currency.format(Number(order.total))}</strong></span>
                  </div>
                  <div className="order-shipping">
                    <strong>Delivering to {order.full_name}</strong>
                    <span>{order.address}, {order.city}, {order.pin_code}</span>
                    <span>{order.phone}</span>
                  </div>
                </div>
              </details>
            </article>
          )
        })}
      </div>
    </main>
  )
}

export default OrdersPage
