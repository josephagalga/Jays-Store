import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import MainLayout from
'../../layouts/MainLayout'
import SafeImage from '../../components/common/SafeImage'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'
import useCartStore from '../../store/cartStore'
import useGuestCartStore from '../../store/guestCartStore'
import useAuthStore from '../../store/authStore'
import { deliveryFeeForCount } from '../../utils/pricing'
import { deliveryCoverageText } from '../../config/delivery'

function QtyStepper({ quantity, onChange }) {
  return (
    <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden">
      <button onClick={() => onChange(Math.max(1, quantity - 1))}
        aria-label="Decrease quantity"
        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--muted)] hover:bg-[var(--off)] transition-colors">
        −
      </button>
      <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
      <button onClick={() => onChange(quantity + 1)}
        aria-label="Increase quantity"
        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--muted)] hover:bg-[var(--off)] transition-colors">
        +
      </button>
    </div>
  )
}

export default function CartPage() {
  const { user } = useAuthStore()
  const isBuyer = user?.role === 'buyer'
  const { cart, fetchCart, removeFromCart, updateQuantity } = useCartStore()
  const guestItems = useGuestCartStore(s => s.items)
  const updateGuestQty = useGuestCartStore(s => s.updateGuestQty)
  const removeGuestItem = useGuestCartStore(s => s.removeGuestItem)
  const navigate = useNavigate()

  useEffect(() => { if (isBuyer) fetchCart() }, [isBuyer])

  // Normalize server + guest rows to one shape for rendering.
  const items = isBuyer
    ? (cart?.cart_items || []).map(i => ({
        key: `server:${i.id}`,
        id: i.id,
        name: i.product_name,
        image: i.product_image,
        price: parseFloat(i.total_price) / Math.max(1, Number(i.quantity) || 1),
        lineTotal: parseFloat(i.total_price),
        size: i.size,
        color: i.color,
        quantity: i.quantity,
      }))
    : guestItems.map(i => ({
        key: `guest:${i.key}`,
        id: i.key,
        name: i.name,
        image: i.image,
        price: i.price,
        lineTotal: i.price * i.quantity,
        size: i.size,
        color: i.color,
        quantity: i.quantity,
      }))

  const onQty = (row, qty) => {
    if (isBuyer) updateQuantity(row.id, qty)
    else updateGuestQty(row.id, qty)
  }
  const onRemove = (row) => {
    if (isBuyer) removeFromCart(row.id)
    else removeGuestItem(row.id)
  }

  const subtotal = items.reduce((n, i) => n + i.lineTotal, 0)
  const itemCount = items.reduce((n, i) => n + Number(i.quantity || 0), 0)
  const delivery = deliveryFeeForCount(itemCount)

  // Exact server quote (same pricing as checkout: per-vendor self-delivery
  // fees included). Falls back to the platform estimate until it loads.
  // NOTE: hooks must stay above the early returns below.
  const quoteBody = isBuyer
    ? {}
    : { items: guestItems.map(i => ({ product_id: i.product_id, variant_id: i.variant_id, quantity: i.quantity })) }
  const quoteKey = isBuyer
    ? ['bag-quote', 'buyer', itemCount, subtotal]
    : ['bag-quote', 'guest', JSON.stringify(quoteBody.items)]
  const { data: quote } = useQuery({
    queryKey: quoteKey,
    queryFn: async () => {
      const res = await api.post('/orders/quote/', quoteBody)
      return res.data
    },
    retry: 1,
    staleTime: 1000 * 30,
  })
  const total = quote ? parseFloat(quote.total || 0) : subtotal + delivery

  if (isBuyer && !cart) return (
    <MainLayout>
      <div className="flex justify-center py-32"><Spinner /></div>
    </MainLayout>
  )

  if (items.length === 0) return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 text-center">
        <ShoppingBag size={48} className="mx-auto text-[var(--border)] mb-5" />
        <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-3">Your bag is empty</h2>
        <p className="text-sm text-[var(--muted)] mb-8">Looks like you haven&apos;t added anything yet.</p>
        <Link to="/catalog">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-10">
          Shopping Bag <span className="text-[var(--muted)] font-normal">({items.length})</span>
        </h1>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 mb-6">
          <strong>{deliveryCoverageText()}.</strong> Please only proceed to checkout if your delivery address is within our coverage area.
        </div>

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Items */}
          <div className="lg:col-span-2 space-y-5">
            {items.map(item => (
              <div key={item.key} className="flex gap-4 md:gap-5 p-4 bg-white border border-[var(--border)] rounded-2xl">
                <div className="w-24 h-28 bg-[var(--off)] rounded-xl overflow-hidden flex-shrink-0">
                  {item.image ? (
                    <SafeImage src={item.image} alt={item.name}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={20} className="text-[var(--border)]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[var(--ink)] line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="text-xs text-[var(--muted)] mt-1">
                        {item.size} · {item.color}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[var(--ink)] flex-shrink-0">
                      GHS {item.lineTotal.toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <QtyStepper quantity={item.quantity} onChange={(q) => onQty(item, q)} />
                    <button onClick={() => onRemove(item)}
                      aria-label="Remove item"
                      className="text-[var(--muted)] hover:text-rose-500 transition-colors p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--off)] rounded-2xl p-6 sticky top-24">
              <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Subtotal</span>
                  <span className="font-medium">GHS {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Delivery</span>
                  <span className="font-medium">
                    {quote ? (
                      `GHS ${parseFloat(quote.delivery_fee || 0).toFixed(2)}`
                    ) : delivery === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      `GHS ${delivery.toFixed(2)}`
                    )}
                  </span>
                </div>
                {quote ? (
                  <>
                    {(quote.self_groups || []).map(g => (
                      <div key={g.store} className="flex justify-between text-xs">
                        <span className="text-[var(--muted)]">{g.store} delivery</span>
                        <span className="font-medium">GHS {parseFloat(g.fee).toFixed(2)}</span>
                      </div>
                    ))}
                    <p className="text-xs text-[var(--muted)]">
                      Exact delivery as set by each vendor.
                    </p>
                  </>
                ) : (
                  delivery > 0 && (
                    <p className="text-xs text-[var(--muted)]">
                      GHS 5 for 1–5 items · GHS 10 for 6–10 items · GHS 20 for 11+ items
                    </p>
                  )
                )}
                <div className="border-t border-[var(--border)] pt-3 flex justify-between">
                  <span className="font-semibold text-[var(--ink)]">Total</span>
                  <span className="font-bold text-lg text-[var(--ink)]">GHS {total.toFixed(2)}</span>
                </div>
              </div>

              <Button size="full" onClick={() => navigate('/checkout')} className="rounded-xl">
                {isBuyer ? 'Checkout' : 'Checkout as guest'}
                <ArrowRight size={15} />
              </Button>
              {!isBuyer && (
                <p className="text-xs text-[var(--muted)] text-center mt-3">
                  No account needed · <Link to="/login" className="underline text-[var(--ink)]">Sign in</Link> to sync across devices
                </p>
              )}

              <Link to="/catalog"
                className="block text-center text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors mt-4">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
