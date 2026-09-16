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
  const [couponCode, setCouponCode] = useState('')
  const [coupon, setCoupon] = useState(null)
  const [couponMsg, setCouponMsg] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('momo')
  const [deliveryFeeServer, setDeliveryFeeServer] = useState(null)
  const [deliveryPin, setDeliveryPin] = useState(null)
  const [pinRequired, setPinRequired] = useState(false)
  const [paystackRef, setPaystackRef] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      delivery_address: user?.delivery_address || '',
      delivery_phone: user?.phone_number || '',
    }
  })

  const items = cart?.cart_items || []
  const itemCount = items.reduce((s, i) => s + i.quantity, 0)
  const subtotal = items.reduce((acc, item) => acc + (parseFloat(item.unit_price) * item.quantity), 0)
  const discount = coupon ? parseFloat(coupon.discount_amount || 0) : 0
  // Server-calculated delivery fee (falls back to tiered logic if server not yet integrated)
  const delivery_fee = deliveryFeeServer !== null ? parseFloat(deliveryFeeServer) : (itemCount <= 5 ? 5 : itemCount <= 10 ? 10 : 20)
  const total = Math.max(0, subtotal - discount + delivery_fee)

  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    setCouponLoading(true)
    setCouponMsg('')
    try {
      const res = await api.post('/coupons/validate/', { code: couponCode.trim(), subtotal })
      setCoupon(res.data)
      setCouponMsg(res.data.message)
      toast.success(res.data.message)
    } catch (err) {
      setCoupon(null)
      const msg = err.response?.data?.message || 'Invalid coupon code'
      setCouponMsg(msg)
      toast.error(msg)
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setCoupon(null)
    setCouponCode('')
    setCouponMsg('')
  }

  const onSubmit = async (data) => {
    try {
      setDeliveryFeeServer(delivery_fee)
      const res = await api.placeOrder({
        ...data,
        delivery_fee,
        coupon_code: coupon?.code || '',
        payment_method: paymentMethod,
        payment_reference: paymentMethod === 'paystack' ? paystackRef : '',
      })
      setOrderId(res.data.id)
      setDeliveryPin(res.data.delivery_pin || null)
      setPinRequired(res.data.pin_required || false)
      clearCart()
      setPlaced(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || err.response?.data?.delivery_address?.[0] || 'Failed to place order')
    }
  }

  if (placed) return (
    <MainLayout>
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} className="text-green-500" />
        </div>
        <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-3">Order Placed!</h2>
        <p className="text-[var(--muted)] text-sm leading-relaxed mb-2">
          Your order #{orderId} has been placed successfully.
        </p>
        {pinRequired && deliveryPin && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-amber-800 text-sm font-medium">
            Cash on Delivery — Give driver PIN: <span className="font-bold text-xl tracking-widest">{deliveryPin}</span>
          </div>
        )}
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

              {/* Payment method */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['momo', 'MoMo'],
                    ['card', 'Card'],
                    ['paystack', 'Paystack'],
                    ['cash_on_delivery', 'Cash'],
                  ].map(([val, label]) => (
                    <button key={val} type="button"
                      onClick={() => setPaymentMethod(val)}
                      className={`px-3 py-2.5 text-sm font-medium rounded-xl border transition-all ${
                        paymentMethod === val
                          ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                          : 'bg-white text-[var(--muted)] border-[var(--border)] hover:border-[var(--ink)]'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[var(--muted)]">
                  {paymentMethod === 'momo' && 'Pay with MTN MoMo, Telecel Cash or AT Money on delivery confirmation.'}
                  {paymentMethod === 'card' && 'Pay securely with Visa / Mastercard.'}
                  {paymentMethod === 'paystack' && 'Pay securely online with Paystack (MoMo / Card). Enter reference after payment.'}
                  {paymentMethod === 'cash_on_delivery' && 'Pay cash when your order arrives. You will receive a 4-digit PIN to give the driver.'}
                </p>
                {paymentMethod === 'paystack' && (
                  <Input label="Paystack Reference (optional)" placeholder="e.g. T123456789"
                    value={paystackRef} onChange={e => setPaystackRef(e.target.value)} />
                )}
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

              {/* Promo code */}
              <div className="border-t border-[var(--border)] pt-4">
                {coupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-green-700">{coupon.code} applied</p>
                      <p className="text-xs text-green-600">{couponMsg}</p>
                    </div>
                    <button type="button" onClick={removeCoupon}
                      className="text-xs font-medium text-green-700 hover:text-green-900 underline">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex gap-2">
                      <input
                        value={couponCode}
                        onChange={e => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Promo code (e.g. WELCOME10)"
                        className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors uppercase placeholder:normal-case placeholder:text-[var(--border)]"
                      />
                      <button type="button" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}
                        className="px-5 py-2.5 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity disabled:opacity-30">
                        {couponLoading ? '...' : 'Apply'}
                      </button>
                    </div>
                    {couponMsg && !coupon && (
                      <p className="text-xs text-rose-500 mt-2">{couponMsg}</p>
                    )}
                    <p className="text-xs text-[var(--muted)] mt-2">Try WELCOME10, JAY50 or SUMMER20</p>
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--border)] pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Subtotal</span>
                  <span>GHS {subtotal.toFixed(2)}</span>
                </div>
                {coupon && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Discount ({coupon.code})</span>
                    <span className="text-green-600 font-medium">-GHS {discount.toFixed(2)}</span>
                  </div>
                )}
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