import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShoppingBag, CheckCircle } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import SafeImage from '../../components/common/SafeImage'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import useCartStore from '../../store/cartStore'
import useAuthStore from '../../store/authStore'
import { deliveryFeeForCount, cartItemCount, cartSubtotal } from '../../utils/pricing'
import toast from 'react-hot-toast'

const schema = z.object({
  delivery_address: z.string().min(5, 'Enter your full delivery address'),
  delivery_phone: z.string().min(10, 'Enter a valid phone number'),
  delivery_landmark: z.string().optional(),
  delivery_note: z.string().optional(),
  terms_accepted: z.boolean().refine(val => val === true, { message: 'You must accept the terms' }),
})

export default function CheckoutPage() {
  const { cart, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [placed, setPlaced] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [charge, setCharge] = useState(null) // {processing_fee, charged_total, authorization_url}

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      delivery_address: user?.delivery_address || '',
      delivery_phone: user?.phone_number || '',
    }
  })

  const items = cart?.cart_items || []
  const itemCount = cartItemCount(items)
  const subtotal = cartSubtotal(items)
  const delivery_fee = deliveryFeeForCount(itemCount)
  const total = Math.max(0, subtotal + delivery_fee)

  const onSubmit = async (data) => {
    try {
      // Paystack only: order is created UNPAID, then buyer pays on Paystack.
      // Sellers settle instantly to their own accounts via split.
      const res = await api.placeOrder({
        ...data,
        payment_method: 'paystack',
      })
      const order = res.data
      setOrderId(order.id)
      clearCart()
      if (order.authorization_url) {
        setCharge({
          processing_fee: order.processing_fee,
          charged_total: order.charged_total,
          authorization_url: order.authorization_url,
        })
        setPlaced(true)
        toast.success('Order created! Redirecting to Paystack…')
        setTimeout(() => window.location.assign(order.authorization_url), 1500)
      } else if (order.payment_init_failed) {
        toast.error('Order saved but payment could not start. Pay from My Orders.')
        navigate('/orders')
      } else {
        setPlaced(true)
      }
    } catch (err) {
      const d = err.response?.data
      const msg = typeof d === 'string' ? d
        : d?.non_field_errors?.[0] || d?.detail || d?.delivery_address?.[0] || 'Failed to place order'
      toast.error(msg)
    }
  }

  if (placed) return (
    <MainLayout>
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-3">Order Created!</h2>
        <p className="text-[var(--muted)] text-sm leading-relaxed mb-2">
          Your order #{orderId} is ready. Complete payment on Paystack.
        </p>
        {charge && (
          <div className="bg-[var(--off)] border border-[var(--border)] rounded-xl px-4 py-4 mb-4 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-[var(--muted)]">Processing fee</span><span>GHS {parseFloat(charge.processing_fee || 0).toFixed(2)}</span></div>
            <div className="flex justify-between font-bold"><span>Total charged</span><span>GHS {parseFloat(charge.charged_total || 0).toFixed(2)}</span></div>
          </div>
        )}
        <p className="text-[var(--muted)] text-sm leading-relaxed mb-4">
          Your delivery OTP and receipt will be emailed to <strong>{user?.email}</strong> once payment confirms.
          Your OTP is also shown in My Orders.
        </p>
        <div className="flex gap-3 justify-center">
          {charge?.authorization_url && (
            <Button onClick={() => window.location.assign(charge.authorization_url)}>Pay Now</Button>
          )}
          <Button variant="secondary" onClick={() => navigate('/orders')}>View My Orders</Button>
        </div>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-10">Checkout — Paystack</h1>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-6">Delivery Details</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <Input label="Delivery Address" placeholder="House no., Street, Area, City"
                error={errors.delivery_address?.message}
                {...register('delivery_address')} />
              <Input label="Phone Number" type="tel" placeholder="024 000 0000"
                error={errors.delivery_phone?.message}
                {...register('delivery_phone')} />
              <Input label="Nearest Landmark" placeholder="e.g. Opposite Palace Mall, near the fuel station (optional)"
                error={errors.delivery_landmark?.message}
                {...register('delivery_landmark')} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">Delivery Note <span className="text-[var(--muted)] font-normal normal-case">(optional)</span></label>
                <textarea rows={3} placeholder="e.g. Call when you arrive..."
                  className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors resize-none placeholder:text-[var(--border)]"
                  {...register('delivery_note')} />
              </div>
              <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                <strong>Paystack checkout.</strong> Pay with MoMo or card. Your payment splits instantly —
                sellers are paid straight to their own accounts. OTP + receipt come by email after payment.
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" id="terms" className="mt-1 w-4 h-4 accent-[var(--ink)]"
                  {...register('terms_accepted')} />
                <label htmlFor="terms" className="text-xs text-[var(--muted)] leading-relaxed">
                  I agree to the <Link to="/terms" className="underline text-[var(--ink)] hover:no-underline">Terms of Service</Link>, <Link to="/refund" className="underline text-[var(--ink)] hover:no-underline">Refund Policy</Link>, and <Link to="/shipping" className="underline text-[var(--ink)] hover:no-underline">Shipping Policy</Link>
                </label>
              </div>
              {errors.terms_accepted && <p className="text-xs text-red-500">{errors.terms_accepted.message}</p>}
              <Button type="submit" size="full" loading={isSubmitting} className="mt-4 rounded-xl">
                Continue to Payment — GHS {total.toFixed(2)} + fee
              </Button>
            </form>
          </div>
          <div>
            <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-6">Order Summary</h2>
            <div className="bg-[var(--off)] rounded-2xl p-6 space-y-4">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="w-14 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0">
                    {item.product_image ? <SafeImage src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={16} className="text-[var(--border)]" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--ink)] line-clamp-1">{item.product_name}</p>
                    <p className="text-xs text-[var(--muted)]">{item.size} · {item.color} · x{item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold flex-shrink-0">GHS {parseFloat(item.total_price).toFixed(2)}</p>
                </div>
              ))}
              <div className="border-t border-[var(--border)] pt-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Subtotal</span><span>GHS {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Delivery</span><span>GHS {delivery_fee.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-[var(--border)]"><span>Total</span><span>GHS {total.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
