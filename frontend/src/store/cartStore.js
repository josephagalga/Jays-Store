import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'
import toast from 'react-hot-toast'

const useCartStore = create(
  persist(
    (set, get) => ({
      cart: null,
      isLoading: false,

      fetchCart: async () => {
        try {
          const response = await api.get('/cart/')
          set({ cart: response.data })
        } catch (error) {
          console.error('Failed to fetch cart', error)
        }
      },

      addToCart: async (productId, variantId, quantity = 1) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/cart/add/', {
            product_id: productId,
            variant_id: variantId,
            quantity,
          })
          set({ cart: response.data })
          toast.success('Added to cart')
          return { success: true }
        } catch (error) {
          const message = error.response?.data?.quantity ||
            error.response?.data?.product_id ||
            'Failed to add to cart'
          toast.error(message)
          return { success: false }
        } finally {
          set({ isLoading: false })
        }
      },

      removeFromCart: async (itemId) => {
        try {
          await api.delete(`/cart/items/${itemId}/`)
          await get().fetchCart()
          toast.success('Item removed')
        } catch (error) {
          toast.error('Failed to remove item')
        }
      },

      updateQuantity: async (itemId, quantity) => {
        try {
          const response = await api.patch(`/cart/items/${itemId}/update/`, { quantity })
          set({ cart: response.data })
        } catch (error) {
          toast.error(error.response?.data?.error || 'Failed to update quantity')
        }
      },

      clearCart: () => set({ cart: null }),
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({ cart: state.cart }),
    }
  )
)

export default useCartStore