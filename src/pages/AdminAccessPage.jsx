import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { requireSupabase } from '../lib/supabase.js'
import ProductImage from '../components/ProductImage.jsx'
import { currency } from '../lib/shop-data.js'

const nextStatus = {
  placed: 'confirmed',
  confirmed: 'packed',
  packed: 'shipped',
  shipped: 'out_for_delivery',
  out_for_delivery: 'delivered',
}
const statusLabels = {
  placed: 'Order Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}
const emptyForm = { name: '', description: '', categoryId: '', price: '', imageUrl: '', variants: 'S:20, M:20, L:20, XL:20' }

function AdminAccessPage() {
  const { user } = useAuth()
  const [result, setResult] = useState({ userId: '', loading: true, isAdmin: false, error: '' })
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState({})
  const [summary, setSummary] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState('')
  const [categoryName, setCategoryName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState('')
  const [message, setMessage] = useState('')
  const [operationError, setOperationError] = useState('')
  const [saving, setSaving] = useState(false)
  const [updatingProductId, setUpdatingProductId] = useState('')
  const [updatingOrderId, setUpdatingOrderId] = useState('')

  useEffect(() => {
    let isMounted = true

    async function checkAdminAccess() {
      try {
        const { data, error } = await requireSupabase().rpc('is_shop_admin')
        if (!isMounted) return

        setResult({
          userId: user.id,
          loading: false,
          isAdmin: !error && data === true,
          error: error?.message ?? '',
        })
      } catch (error) {
        if (!isMounted) return

        setResult({
          userId: user.id,
          loading: false,
          isAdmin: false,
          error: error.message || 'Unable to verify administrator access.',
        })
      }
    }

    checkAdminAccess()

    return () => {
      isMounted = false
    }
  }, [user.id])

  const loadDashboard = useCallback(async () => {
    const client = requireSupabase()
    const [categoriesResult, productsResult, ordersResult, summaryResult] = await Promise.all([
      client.from('categories').select('id,name,slug,image_url,active').order('name'),
      client.from('products')
        .select('id,name,slug,description,price,image_url,active,category_id,categories(name),product_variants(id,size_label,stock)')
        .order('created_at', { ascending: false }),
      client.from('orders')
        .select('id,user_id,full_name,phone,address,city,pin_code,total,payment_method,payment_status,status,created_at')
        .order('created_at', { ascending: false }),
      client.rpc('admin_store_summary'),
    ])
    const failed = [categoriesResult, productsResult, ordersResult, summaryResult].find((item) => item.error)
    if (failed) throw failed.error
    setCategories(categoriesResult.data ?? [])
    setProducts(productsResult.data ?? [])
    const orderRows = ordersResult.data ?? []
    setOrders(orderRows)
    setSummary(Array.isArray(summaryResult.data) ? summaryResult.data[0] : summaryResult.data)
    if (orderRows.length) {
      const { data, error } = await client.from('order_items')
        .select('id,order_id,product_name,selected_size,unit_price,quantity')
        .in('order_id', orderRows.map((order) => order.id))
      if (error) throw error
      setOrderItems((data ?? []).reduce((result, item) => {
        result[item.order_id] ??= []
        result[item.order_id].push(item)
        return result
      }, {}))
    } else {
      setOrderItems({})
    }
  }, [])

  useEffect(() => {
    if (!result.isAdmin) return
    loadDashboard().catch((loadError) => setOperationError(loadError.message || 'Unable to load the admin dashboard.'))
  }, [result.isAdmin, loadDashboard])

  function startEdit(product) {
    setEditingId(product.id)
    setForm({
      name: product.name,
      description: product.description ?? '',
      categoryId: product.category_id ?? '',
      price: String(product.price),
      imageUrl: product.image_url,
      variants: (product.product_variants ?? []).map((variant) => `${variant.size_label}:${variant.stock}`).join(', '),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function saveProduct(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setOperationError('')
    try {
      const client = requireSupabase()
      const slug = form.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const productValues = {
        name: form.name.trim(),
        slug,
        description: form.description.trim(),
        category_id: form.categoryId || null,
        price: Number(form.price),
        image_url: form.imageUrl.trim(),
      }
      let productId = editingId
      if (editingId) {
        const { error } = await client.from('products').update(productValues).eq('id', editingId)
        if (error) throw error
      } else {
        const { data, error } = await client.from('products').insert(productValues).select('id').single()
        if (error) throw error
        productId = data.id
      }
      const variantRows = form.variants.split(',').map((part) => {
        const [rawSize, rawStock] = part.split(':').map((value) => value.trim())
        if (!rawSize || !/^\d+$/.test(rawStock ?? '')) {
          throw new Error('Enter each variant as Size:stock, for example S:20, M:12, One Size:20.')
        }
        return { product_id: productId, size_label: rawSize, stock: Number(rawStock) }
      })
      const sizeLabels = variantRows.map((variant) => variant.size_label)
      if (!variantRows.length || new Set(sizeLabels).size !== sizeLabels.length) {
        throw new Error('Enter at least one unique size and stock pair.')
      }
      const { error: variantError } = await client.from('product_variants')
        .upsert(variantRows, { onConflict: 'product_id,size_label' })
      if (variantError) throw variantError
      if (editingId) {
        const removed = (products.find((product) => product.id === editingId)?.product_variants ?? [])
          .filter((variant) => !sizeLabels.includes(variant.size_label))
        for (const variant of removed) {
          const { error } = await client.from('product_variants').update({ stock: 0 }).eq('id', variant.id)
          if (error) throw error
        }
      }
      setEditingId('')
      setForm(emptyForm)
      setMessage('Product saved.')
      await loadDashboard()
    } catch (saveError) {
      setOperationError(saveError.message || 'Unable to save this product.')
    } finally {
      setSaving(false)
    }
  }

  async function setProductActive(product, active) {
    if (!active && !window.confirm(`Deactivate "${product.name}"? It will no longer appear in the shop.`)) return
    setOperationError('')
    setMessage('')
    setUpdatingProductId(product.id)
    try {
      const { data, error } = await requireSupabase().rpc('admin_set_product_active', {
        p_product_id: product.id,
        p_active: active,
      })
      if (error) throw error
      if (data !== active) throw new Error('The product status was not changed. Refresh the dashboard and try again.')
      setMessage(`"${product.name}" ${active ? 'activated' : 'deactivated'}.`)
      await loadDashboard()
    } catch (deactivateError) {
      setOperationError(deactivateError.message || 'Unable to update the product status.')
    } finally {
      setUpdatingProductId('')
    }
  }

  async function addCategory(event) {
    event.preventDefault()
    setOperationError('')
    try {
      const slug = categoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const { error } = await requireSupabase().from('categories').insert({
        name: categoryName.trim(),
        slug,
        image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=85',
      })
      if (error) throw error
      setCategoryName('')
      setMessage('Category added.')
      await loadDashboard()
    } catch (categoryError) {
      setOperationError(categoryError.message || 'Unable to add category.')
    }
  }

  async function saveCategory(event) {
    event.preventDefault()
    setOperationError('')
    try {
      const slug = categoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const { error } = await requireSupabase().from('categories')
        .update({ name: categoryName.trim(), slug })
        .eq('id', editingCategoryId)
      if (error) throw error
      setCategoryName('')
      setEditingCategoryId('')
      setMessage('Category updated.')
      await loadDashboard()
    } catch (saveError) {
      setOperationError(saveError.message || 'Unable to update category.')
    }
  }

  async function deleteCategory(category) {
    if (!window.confirm(`Remove "${category.name}"? Products will remain in the catalogue without a category.`)) return
    setOperationError('')
    try {
      const { error } = await requireSupabase().from('categories').delete().eq('id', category.id)
      if (error) throw error
      setMessage('Category removed. Existing products were kept.')
      await loadDashboard()
    } catch (deleteError) {
      setOperationError(deleteError.message || 'Unable to remove this category.')
    }
  }

  async function advanceOrder(order) {
    const status = nextStatus[order.status]
    if (!status || updatingOrderId) return
    setOperationError('')
    setMessage('')
    setUpdatingOrderId(order.id)
    try {
      const { error } = await requireSupabase().rpc('admin_advance_order', {
        p_order_id: order.id,
        p_next_status: status,
      })
      if (error) throw error
      setMessage(`Order #${order.id.slice(0, 8).toUpperCase()} updated to ${statusLabels[status]}.`)
      await loadDashboard()
    } catch (updateError) {
      setOperationError(updateError.message || 'Unable to update the order.')
    } finally {
      setUpdatingOrderId('')
    }
  }

  if (result.loading || result.userId !== user.id) {
    return <main className="page-shell"><p role="status">Verifying administrator access…</p></main>
  }

  if (!result.isAdmin) {
    return (
      <main className="page-shell">
        <section className="placeholder-panel">
          <p className="eyebrow">Database-verified access</p>
          <h1>Admin access unavailable</h1>
          <p>Admin access is granted automatically only to the designated, email-verified account. It is not assigned during sign-in or registration.</p>
          {result.error && <p className="notice" role="alert">The database administrator check failed closed. Confirm that you are signed in with the verified designated email and apply the `202610180001_is_shop_admin.sql` migration. Details: {result.error}</p>}
        </section>
      </main>
    )
  }

  return (
    <main className="page-shell admin-dashboard">
      <p className="eyebrow">Verified administrator</p>
      <h1 className="page-title">Store dashboard</h1>
      {(operationError || result.error) && <p className="notice" role="alert">{operationError || result.error}</p>}
      {message && <p className="inline-success" role="status">{message}</p>}
      <section className="admin-stat-grid" aria-label="Store overview">
        <article><span>Products</span><strong>{summary?.total_products ?? '—'}</strong></article>
        <article><span>Orders</span><strong>{summary?.total_orders ?? '—'}</strong></article>
        <article><span>Customers</span><strong>{summary?.registered_customers ?? '—'}</strong></article>
        <article><span>Stock units</span><strong>{summary?.total_stock_units ?? '—'}</strong></article>
        <article><span>Low-stock variants</span><strong>{summary?.low_stock_variants ?? '—'}</strong></article>
        <article><span>Non-cancelled order value</span><strong>{currency.format(Number(summary?.non_cancelled_order_value ?? 0))}</strong></article>
      </section>

      <section className="admin-section">
        <h2>{editingId ? 'Edit product' : 'Add a product'}</h2>
        <form className="admin-product-form" onSubmit={saveProduct}>
          <label>Product name<input required maxLength={160} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>Category<select value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label>Price (INR)<input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></label>
          <label>Image URL<input required type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} /></label>
          <label className="admin-form-wide">Description<textarea rows="2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="admin-form-wide">Size and stock pairs<input required value={form.variants} onChange={(event) => setForm({ ...form, variants: event.target.value })} placeholder="S:20, M:12, L:8, XL:4 or One Size:20" /></label>
          <div className="admin-form-actions">
            <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save product' : 'Add product'}</button>
            {editingId && <button className="button button-secondary" type="button" onClick={() => { setEditingId(''); setForm(emptyForm) }}>Cancel edit</button>}
          </div>
        </form>
      </section>

      <section className="admin-section">
        <h2>Categories</h2>
        <div className="admin-categories">{categories.map((category) => (
          <div className="admin-category-chip" key={category.id}>
            <span>{category.name}</span>
            <button className="text-button" type="button" onClick={() => { setEditingCategoryId(category.id); setCategoryName(category.name) }}>Edit</button>
            <button className="text-button" type="button" onClick={() => deleteCategory(category)}>Remove</button>
          </div>
        ))}</div>
        <form className="category-add-form" onSubmit={editingCategoryId ? saveCategory : addCategory}>
          <label className="visually-hidden" htmlFor="new-category">New category name</label>
          <input id="new-category" required maxLength={80} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="New category name" />
          <button className="button button-secondary" type="submit">{editingCategoryId ? 'Save category' : 'Add category'}</button>
          {editingCategoryId && <button className="button button-secondary" type="button" onClick={() => { setEditingCategoryId(''); setCategoryName('') }}>Cancel</button>}
        </form>
      </section>

      <section className="admin-section">
        <h2>Products</h2>
        <div className="admin-product-list">
          {products.map((product) => (
            <article className="admin-product-row" key={product.id}>
              <ProductImage src={product.image_url} alt={product.name} className="admin-product-image" />
              <div><strong>{product.name}</strong><span>{product.categories?.name ?? 'Uncategorized'} · {currency.format(Number(product.price))}</span><small>{(product.product_variants ?? []).map((variant) => `${variant.size_label}: ${variant.stock}`).join(' · ')}</small></div>
              <div className="admin-row-actions">
                <button className="text-button" type="button" onClick={() => startEdit(product)}>Edit</button>
                <button
                  className="text-button"
                  type="button"
                  disabled={Boolean(updatingProductId)}
                  onClick={() => setProductActive(product, !product.active)}
                >
                  {updatingProductId === product.id
                    ? product.active ? 'Deactivating…' : 'Activating…'
                    : product.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-section">
        <h2>Orders</h2>
        <div className="admin-orders-list">
          {orders.map((order) => (
            <article className="admin-order-row" key={order.id}>
              <div><strong>#{order.id.slice(0, 8).toUpperCase()} · {order.full_name}</strong><span>{order.phone} · {new Date(order.created_at).toLocaleString()}</span><small>{order.address}, {order.city}, {order.pin_code}</small></div>
              <span className={`order-status status-${order.status}`}>{statusLabels[order.status] ?? order.status}</span>
              <strong>{currency.format(Number(order.total))}</strong>
              {nextStatus[order.status] && (
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={Boolean(updatingOrderId)}
                  onClick={() => advanceOrder(order)}
                >
                  {updatingOrderId === order.id
                    ? order.status === 'placed' ? 'Confirming…' : 'Updating…'
                    : order.status === 'placed' ? 'Confirm order' : `Mark ${statusLabels[nextStatus[order.status]]}`}
                </button>
              )}
              <details className="admin-order-items">
                <summary>Items ({(orderItems[order.id] ?? []).length})</summary>
                {(orderItems[order.id] ?? []).map((item) => (
                  <p key={item.id}>{item.product_name} · {item.selected_size} · {item.quantity} × {currency.format(Number(item.unit_price))}</p>
                ))}
              </details>
            </article>
          ))}
          {orders.length === 0 && <p className="state-message">No orders yet.</p>}
        </div>
      </section>
    </main>
  )
}

export default AdminAccessPage
