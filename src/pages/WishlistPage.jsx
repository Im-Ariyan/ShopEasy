import { useEffect, useState } from 'react'
import ProductCard from '../components/ProductCard.jsx'
import { useWishlist } from '../context/useWishlist.js'
import { requireSupabase } from '../lib/supabase.js'

function WishlistPage() {
  const { productIds, loading: wishlistLoading, loadError } = useWishlist()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadProducts() {
      setLoading(true)
      setError('')
      if (productIds.length === 0) {
        setProducts([])
        setLoading(false)
        return
      }

      try {
        const { data, error: queryError } = await requireSupabase()
          .from('products')
          .select('id,slug,name,description,price,image_url,category_id,categories(name,slug),product_variants(id,size_label,stock)')
          .in('id', productIds)
          .eq('active', true)
        if (queryError) throw queryError
        if (mounted) setProducts(data ?? [])
      } catch (queryError) {
        if (mounted) setError(queryError.message || 'Unable to load your saved products.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (!wishlistLoading && !loadError) loadProducts()
    return () => { mounted = false }
  }, [productIds, wishlistLoading, loadError])

  return (
    <main className="page-shell">
      <section className="shop-heading">
        <p className="eyebrow">Your saved picks</p>
        <h1>Wishlist</h1>
        <p>Keep the pieces you love close at hand.</p>
      </section>
      {loadError && <p className="notice" role="alert">{loadError}</p>}
      {error && <p className="notice" role="alert">{error}</p>}
      {(wishlistLoading || loading) && !loadError && <p className="state-message" role="status">Loading your wishlist…</p>}
      {!wishlistLoading && !loading && !loadError && !error && products.length === 0 && (
        <p className="state-message">Your wishlist is empty. Tap the heart on a product to save it here.</p>
      )}
      {!loadError && !error && products.length > 0 && (
        <section className="product-grid wishlist-grid" aria-label="Your wishlist products">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </section>
      )}
    </main>
  )
}

export default WishlistPage
