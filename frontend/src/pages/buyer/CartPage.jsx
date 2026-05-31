import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import useCartStore from '../../store/cartStore'

export default function CartPage() {
  const { cart, fetchCart, removeFromCart, updateQuantity, isLoading } = useCartStore()
  const navigate = useNavigate()

  useEffect(() => { fetchCart() }, [])

  const items = cart?.cart_items || []

  if (!cart) return (
    <MainLayout>
      <div className="flex justify-center py-32"><Spinner /></div>
    </MainLayout>
  )

  if (items.length === 0) return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 text-center">
        <ShoppingBag size={48} className="mx-auto text-[var(--border)] mb-5" />
        <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-3">Your bag is empty</h2>
        <p className="text-sm text-[var(--muted)] mb-8">Looks like you haven't added anything yet.</p>
        <Link to="/catalog">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    </MainLayout>
  )

  const subtotal = items.reduce((acc, item) => acc + (parseFloat(item.unit_price) * item.quantity), 0)
  const delivery = subtotal >= 300 ? 0 : 30
  const total = subtotal + delivery

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="serif text-4xl font-medium text-[var(--ink)] mb-10">
          Shopping Bag <span className="text-[var(--muted)] font-normal">({items.length})</span>
        </h1>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Items */}
          <div className="lg:col-span-2 space-y-5">
            {items.map(item => (
              <div key={item.id} className="flex gap-5 p-4 bg-white border border-[var(--border)] rounded-2xl">
                <div className="w-24 h-28 bg-[var(--off)] rounded-xl overflow-hidden flex-shrink-0">
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_name}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={20} className="text-[var(--border)]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--ink)] line-clamp-1">
                        {item.product_name}
                      </h3>
                      <p className="text-xs text-[var(--muted)] mt-1">
                        {item.size} · {item.color}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-[var(--ink)] flex-shrink-0">
                      GHS {parseFloat(item.total_price).toFixed(2)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-[var(--border)] rounded-lg overflow-hidden">
                      <button onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                        className="w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:bg-[var(--off)] transition-colors">
                        −
                      </button>
                      <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:bg-[var(--off)] transition-colors">
                        +
                      </button>
                    </div>
                    <button onClick={() => removeFromCart(item.id)}
                      className="text-[var(--muted)] hover:text-rose-500 transition-colors p-1">
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
                    {delivery === 0 ? (
                      <span className="text-green-600">Free</span>
                    ) : (
                      `GHS ${delivery.toFixed(2)}`
                    )}
                  </span>
                </div>
                {delivery > 0 && (
                  <p className="text-xs text-[var(--muted)]">
                    Add GHS {(300 - subtotal).toFixed(2)} more for free delivery
                  </p>
                )}
                <div className="border-t border-[var(--border)] pt-3 flex justify-between">
                  <span className="font-semibold text-[var(--ink)]">Total</span>
                  <span className="font-bold text-lg text-[var(--ink)]">GHS {total.toFixed(2)}</span>
                </div>
              </div>

              <Button size="full" onClick={() => navigate('/checkout')} className="rounded-xl">
                Checkout
                <ArrowRight size={15} />
              </Button>

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