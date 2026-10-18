import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { requireSupabase } from '../lib/supabase.js'
import { WishlistContext } from './wishlist-context.js'

function getWishlistErrorMessage(error) {
  if (error.code === 'PGRST205' || error.code === '42P01') {
    return 'Wishlist storage is missing from the connected Supabase project. Run supabase/migrations/202610180003_wishlist.sql in the Supabase SQL Editor, then refresh this page.'
  }

  return error.message || 'Unable to load your wishlist.'
}

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const [productIds, setProductIds] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadWishlist() {
      try {
        const { data, error } = await requireSupabase()
          .from('wishlist_items')
          .select('product_id')
        if (error) throw error
        if (mounted) setProductIds((data ?? []).map((item) => item.product_id))
      } catch (error) {
        if (mounted) setLoadError(getWishlistErrorMessage(error))
      } finally {
        if (mounted) setLoading(false)
      }
    }

    if (user?.id) loadWishlist()

    return () => { mounted = false }
  }, [user])

  const toggleWishlist = useCallback(async (productId) => {
    const isSaved = productIds.includes(productId)
    const query = requireSupabase().from('wishlist_items')
    const { error } = isSaved
      ? await query.delete().eq('product_id', productId)
      : await query.insert({ product_id: productId })

    if (error) throw new Error(getWishlistErrorMessage(error), { cause: error })
    setProductIds((current) => isSaved
      ? current.filter((id) => id !== productId)
      : current.includes(productId) ? current : [...current, productId])
  }, [productIds])

  return (
    <WishlistContext.Provider value={{ productIds, loading, loadError, toggleWishlist }}>
      {children}
    </WishlistContext.Provider>
  )
}
