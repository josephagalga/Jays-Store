import { create } from 'zustand'
import api from '../services/api'
import useAuthStore from './authStore'
import toast from 'react-hot-toast'

const useWishlistStore = create((set, get) => ({
  wishlistIds: [],
  wishlistItems: [],
  isLoading: false,

  fetchWishlistIds: async () => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || user?.role !== 'buyer') return
    try {
      const res = await api.get('/products/wishlist/ids/')
      set({ wishlistIds: res.data.ids || [] })
    } catch {
      // silent
    }
  },

  fetchWishlistItems: async () => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated || user?.role !== 'buyer') return
    set({ isLoading: true })
    try {
      const res = await api.get('/products/wishlist/')
      const items = Array.isArray(res.data) ? res.data : res.data.results || []
      set({
        wishlistItems: items,
        wishlistIds: items.map(item => item.product?.id).filter(Boolean),
      })
    } catch {
      toast.error('Failed to load wishlist')
    } finally {
      set({ isLoading: false })
    }
  },

  toggleWishlist: async (product) => {
    const { isAuthenticated, user } = useAuthStore.getState()
    if (!isAuthenticated) {
      toast.error('Please sign in to save items to your wishlist')
      return false
    }
    if (user?.role !== 'buyer') {
      toast.error('Only buyers can maintain a wishlist')
      return false
    }

    const productId = product.id
    const prevIds = get().wishlistIds
    const isWished = prevIds.includes(productId)

    // Optimistic update
    set({
      wishlistIds: isWished
        ? prevIds.filter(id => id !== productId)
        : [...prevIds, productId],
      wishlistItems: isWished
        ? get().wishlistItems.filter(item => item.product?.id !== productId)
        : [{ id: Date.now(), product, created_at: new Date().toISOString() }, ...get().wishlistItems],
    })

    try {
      const res = await api.post(`/products/wishlist/toggle/${productId}/`)
      if (res.data.wishlisted) {
        toast.success('Saved to wishlist')
      } else {
        toast.success('Removed from wishlist')
      }
      return res.data.wishlisted
    } catch {
      // Revert on error
      set({ wishlistIds: prevIds })
      toast.error('Could not update wishlist')
      return isWished
    }
  },

  isWishlisted: (productId) => get().wishlistIds.includes(productId),
}))

export default useWishlistStore
