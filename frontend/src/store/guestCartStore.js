import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import toast from 'react-hot-toast'

/**
 * Guest (no-account) bag — lives entirely in localStorage.
 * Prices are display snapshots only; the server reprices everything
 * from the database at guest checkout, so tampering can't change totals.
 */
const keyOf = (productId, variantId) => `${productId}:${variantId}`

const useGuestCartStore = create(
  persist(
    (set, get) => ({
      items: [], // [{key, product_id, variant_id, quantity, name, image, price, size, color, store}]

      addGuestItem: ({ product, variant, quantity = 1 }) => {
        const key = keyOf(product.id, variant.id)
        const items = [...get().items]
        const existing = items.find(i => i.key === key)
        if (existing) {
          existing.quantity = Math.min(20, existing.quantity + quantity)
        } else {
          items.push({
            key,
            product_id: product.id,
            variant_id: variant.id,
            quantity: Math.min(20, quantity),
            name: product.name,
            image: product.primary_image || product.images?.[0]?.url || '',
            price: parseFloat(product.effective_price),
            size: variant.size,
            color: variant.color,
            store: product.store_name || '',
          })
        }
        set({ items })
        toast.success('Saved to bag — checkout as guest')
      },

      updateGuestQty: (key, quantity) => {
        const qty = Math.max(1, Math.min(20, quantity))
        set({ items: get().items.map(i => (i.key === key ? { ...i, quantity: qty } : i)) })
      },

      removeGuestItem: (key) => {
        set({ items: get().items.filter(i => i.key !== key) })
        toast.success('Item removed')
      },

      clearGuestCart: () => set({ items: [] }),

      guestCount: () => get().items.reduce((n, i) => n + i.quantity, 0),
      guestSubtotal: () => get().items.reduce((n, i) => n + i.price * i.quantity, 0),

      /** Payload shape the guest checkout endpoint expects. */
      guestLines: () => get().items.map(i => ({
        product_id: i.product_id,
        variant_id: i.variant_id,
        quantity: i.quantity,
      })),
    }),
    { name: 'guest-bag-storage' }
  )
)

export default useGuestCartStore
