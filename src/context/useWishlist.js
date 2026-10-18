import { useContext } from 'react'
import { WishlistContext } from './wishlist-context.js'

export function useWishlist() {
  const wishlist = useContext(WishlistContext)
  if (!wishlist) throw new Error('useWishlist must be used within WishlistProvider.')
  return wishlist
}
