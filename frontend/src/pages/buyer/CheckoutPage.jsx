import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShoppingBag, CheckCircle } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import useCartStore from '../../store/cartStore'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const schema = z.object({
  delivery_address: z.string().min(5, 'Enter your full delivery address'),
  delivery_phone: z.string().min(10, 'Enter a valid phone number'),
  delivery_note: z.string().optional(),
})

export default function CheckoutPage() {
  const { cart, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [placed, setPlaced] = useState(false)
  const [orderId, setOrderId] = useState(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      delivery_address: user?.delivery_address || '',
      delivery_phone: user?.phone_number || '',
    }
  })

  const items = cart?.cart_items || []
  const subtotal = items.reduce((acc, item) => acc + (parseFloat(item.unit_price) * item.quantity), 0)
  const delivery_fee = subtotal >= 300 ? 0 : 30
  const total = subtotal + delivery_fee

  const onSubmit = async (data) => {
    try {
      const res = await api.post('/orders/place/', {
        ...data,
        delivery_fee,
      })
      setOrderId(res.data.id)
      clearCart()
      setPlaced(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to place order')
    }
  }

  if (placed) return (
    <MainLayout>
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-3">Order Placed!</h2>
        <p className="text-[var(--muted)] text-sm leading-relaxed mb-8">
          Your order #{orderId} has been placed successfully. A driver will be assigned shortly.
        </p>
        <Button onClick={() => navigate('/orders')}>View My Orders</Button>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="serif text-4xl font-medium text-[var(--ink)] mb-10">Checkout</h1>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Form */}
          <div>
            <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-6">Delivery Details</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input label="Delivery Address" placeholder="House no., Street, Area, City"
                error={errors.delivery_address?.message}
                {...register('delivery_address')} />
              <Input label="Phone Number" type="tel" placeholder="024 000 0000"
                error={errors.delivery_phone?.message}
                {...register('delivery_phone')} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
                  Delivery Note <span className="text-[var(--muted)] font-normal normal-case">(optional)</span>
                </label>
                <textarea rows={3} placeholder="e.g. Call when you arrive..."
                  className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors resize-none placeholder:text-[var(--border)]"
                  {...register('delivery_note')} />
              </div>

              <Button type="submit" size="full" loading={isSubmitting} className="mt-4 rounded-xl">
                Place Order — GHS {total.toFixed(2)}
              </Button>
            </form>
          </div>

          {/* Summary */}
          <div>
            <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-6">Order Summary</h2>
            <div className="bg-[var(--off)] rounded-2xl p-6 space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="w-14 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0">
                    {item.product_image ? (
                      <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={16} className="text-[var(--border)]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--ink)] line-clamp-1">{item.product_name}</p>
                    <p className="text-xs text-[var(--muted)]">{item.size} · {item.color} · x{item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold flex-shrink-0">
                    GHS {parseFloat(item.total_price).toFixed(2)}
                  </p>
                </div>
              ))}

              <div className="border-t border-[var(--border)] pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Subtotal</span>
                  <span>GHS {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Delivery</span>
                  <span className={delivery_fee === 0 ? 'text-green-600 font-medium' : ''}>
                    {delivery_fee === 0 ? 'Free' : `GHS ${delivery_fee.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-[var(--border)]">
                  <span>Total</span>
                  <span>GHS {total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}