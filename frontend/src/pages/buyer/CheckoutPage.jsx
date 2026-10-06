import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { ShoppingBag, CheckCircle, ShieldCheck, Truck, RotateCcw, Smartphone, CreditCard, Layers } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import SafeImage from '../../components/common/SafeImage'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import useCartStore from '../../store/cartStore'
import useGuestCartStore from '../../store/guestCartStore'
import useAuthStore from '../../store/authStore'
import { deliveryFeeForCount, estimateProcessingFee } from '../../utils/pricing'
import { deliveryCoverageText, DELIVERY_COVERAGE_NOTE } from '../../config/delivery'
import toast from 'react-hot-toast'

const PAY_OPTIONS = [
  {
    id: 'momo',
    label: 'Mobile Money',
    hint: 'MTN · Telecel · AirtelTigo',
    icon: Smartphone,
    badge: 'Recommended',
    channels: ['mobile_money'],
  },
  {
    id: 'card',
    label: 'Card',
    hint: 'Visa · Mastercard',
    icon: CreditCard,
    badge: null,
    channels: ['card'],
  },
  {
    id: 'all',
    label: 'All methods',
    hint: 'Choose on Paystack',
    icon: Layers,
    badge: null,
    channels: null,
  },
]

const baseSchema = {
  delivery_address: z.string().min(5, 'Enter your full delivery address'),
  delivery_landmark: z.string().optional(),
  delivery_note: z.string().optional(),
  terms_accepted: z.boolean().refine(val => val === true, { message: 'You must accept the terms' }),
}

const buyerSchema = z.object({
  delivery_phone: z.string().min(10, 'Enter a valid phone number'),
  ...baseSchema,
})

const guestSchema = z.object({
  guest_name: z.string().min(2, 'Enter your full name'),
  guest_email: z.string().email('Enter a valid email for your receipt and OTP'),
  guest_phone: z.string().min(10, 'Enter a valid phone number'),
  ...baseSchema,
})

export default function CheckoutPage() {
  const { cart, clearCart } = useCartStore()
  const guestItems = useGuestCartStore(s => s.items)
  const clearGuestCart = useGuestCartStore(s => s.clearGuestCart)
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [placed, setPlaced] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [charge, setCharge] = useState(null)
  const [payOption, setPayOption] = useState('momo')

  const isBuyer = user?.role === 'buyer'

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(isBuyer ? buyerSchema : guestSchema),
    defaultValues: {
      delivery_address: user?.delivery_address || '',
      delivery_phone: user?.phone_number || '',
    }
  })

  // Server rows vs guest rows, normalized for display.
  const serverItems = cart?.cart_items || []
  const items = isBuyer
    ? serverItems.map(i => ({
        key: i.id, name: i.product_name, image: i.product_image,
        meta: `${i.size} · ${i.color} · x${i.quantity}`,
        lineTotal: parseFloat(i.total_price),
        quantity: i.quantity,
      }))
    : guestItems.map(i => ({
        key: i.key, name: i.name, image: i.image,
        meta: `${i.size} · ${i.color} · x${i.quantity}`,
        lineTotal: i.price * i.quantity,
        quantity: i.quantity,
      }))

  const itemCount = items.reduce((n, i) => n + Number(i.quantity || 0), 0)
  const subtotal = items.reduce((n, i) => n + i.lineTotal, 0)
  const delivery_fee = deliveryFeeForCount(itemCount)
  const total = Math.max(0, subtotal + delivery_fee)
  const feeEstimate = estimateProcessingFee(total)
  const channels = PAY_OPTIONS.find(o => o.id === payOption)?.channels || null

  const goToPay = (url, order) => {
    setOrderId(order.id ?? order.order_id)
    clearCartSafe()
    if (url) {
      setCharge({
        processing_fee: order.processing_fee,
        charged_total: order.charged_total,
        authorization_url: url,
      })
      setPlaced(true)
      toast.success('Order created! Redirecting to Paystack…')
      setTimeout(() => window.location.assign(url), 1500)
    }
  }

  const clearCartSafe = () => {
    if (isBuyer) clearCart()
    else clearGuestCart()
  }

  const onSubmit = async (data) => {
    try {
      if (isBuyer) {
        const res = await api.placeOrder({ ...data, payment_method: 'paystack', channels })
        const order = res.data
        if (order.authorization_url) {
          goToPay(order.authorization_url, order)
        } else if (order.payment_init_failed) {
          toast.error('Order saved but payment could not start. Pay from My Orders.')
          navigate('/orders')
        } else {
          setPlaced(true)
        }
      } else {
        const lines = useGuestCartStore.getState().guestLines()
        const res = await api.placeGuestOrder({
          guest_name: data.guest_name,
          guest_email: data.guest_email,
          guest_phone: data.guest_phone,
          delivery_address: data.delivery_address,
          delivery_landmark: data.delivery_landmark || '',
          delivery_note: data.delivery_note || '',
          items: lines,
          channels,
        })
        const order = res.data
        if (order.authorization_url) {
          if (order.reference) {
            try { sessionStorage.setItem('guest-track-email', data.guest_email) } catch { /* ignore */ }
          }
          goToPay(order.authorization_url, order)
        } else if (order.payment_init_failed) {
          toast.error('Order saved but payment could not start. Use your tracking link to retry.')
          if (order.reference) navigate(`/track/${order.reference}`)
        } else {
          setPlaced(true)
        }
      }
    } catch (err) {
      const d = err.response?.data
      const msg = typeof d === 'string' ? d
        : d?.non_field_errors?.[0] || d?.detail || d?.delivery_address?.[0]
          || d?.guest_email?.[0] || d?.items?.[0] || d?.error || 'Failed to place order'
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
          Your delivery OTP and receipt will be emailed to you once payment confirms.
        </p>
        <div className="flex gap-3 justify-center">
          {charge?.authorization_url && (
            <Button onClick={() => window.location.assign(charge.authorization_url)}>Pay Now</Button>
          )}
          {isBuyer && <Button variant="secondary" onClick={() => navigate('/orders')}>View My Orders</Button>}
        </div>
      </div>
    </MainLayout>
  )

  if (items.length === 0) return (
    <MainLayout>
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <ShoppingBag size={40} className="mx-auto text-[var(--border)] mb-4" />
        <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-3">Nothing to check out</h2>
        <p className="text-sm text-[var(--muted)] mb-6">Your bag is empty.</p>
        <Button onClick={() => navigate('/catalog')}>Browse products</Button>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-2">Checkout</h1>
        <p className="text-sm text-[var(--muted)] mb-4">
          {isBuyer ? 'Pay securely with Paystack.' : 'No account needed — pay as a guest.'}
        </p>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 mb-10">
          <strong>{deliveryCoverageText()}.</strong> {DELIVERY_COVERAGE_NOTE}
        </div>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <div>
            <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-6">Delivery Details</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              {!isBuyer && (
                <>
                  <Input label="Full name" placeholder="Ama Serwaa"
                    error={errors.guest_name?.message}
                    {...register('guest_name')} />
                  <Input label="Email (receipt + OTP go here)" type="email" placeholder="you@example.com"
                    error={errors.guest_email?.message} autoComplete="email"
                    {...register('guest_email')} />
                  <Input label="Phone Number" type="tel" placeholder="024 000 0000"
                    error={errors.guest_phone?.message} autoComplete="tel"
                    {...register('guest_phone')} />
                </>
              )}
              <Input label="Delivery Address" placeholder="House no., Street, Area, City"
                error={errors.delivery_address?.message} autoComplete="street-address"
                {...register('delivery_address')} />
              {isBuyer && (
                <Input label="Phone Number" type="tel" placeholder="024 000 0000"
                  error={errors.delivery_phone?.message} autoComplete="tel"
                  {...register('delivery_phone')} />
              )}
              <Input label="Nearest Landmark" placeholder="e.g. Opposite Palace Mall, near the fuel station (optional)"
                error={errors.delivery_landmark?.message}
                {...register('delivery_landmark')} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">Delivery Note <span className="text-[var(--muted)] font-normal normal-case">(optional)</span></label>
                <textarea rows={3} placeholder="e.g. Call when you arrive..."
                  className="w-full px-4 py-3 text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors resize-none placeholder:text-[var(--muted)] placeholder:opacity-70"
                  {...register('delivery_note')} />
              </div>

              {/* Payment method — MoMo first */}
              <div>
                <p className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-3">Pay with</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAY_OPTIONS.map(({ id, label, hint, icon: Icon, badge }) => (
                    <button key={id} type="button" onClick={() => setPayOption(id)}
                      aria-pressed={payOption === id}
                      className={`relative rounded-xl border p-3 text-left transition-all min-h-[76px] ${
                        payOption === id
                          ? 'border-[var(--ink)] bg-white shadow-sm'
                          : 'border-[var(--border)] bg-white hover:border-[var(--muted)]'
                      }`}>
                      {badge && (
                        <span className="absolute -top-2 left-2 px-2 py-0.5 bg-green-600 text-white text-[9px] font-bold rounded-full uppercase tracking-wide">
                          {badge}
                        </span>
                      )}
                      <Icon size={18} className="text-[var(--ink)] mb-1.5" />
                      <p className="text-xs font-semibold text-[var(--ink)]">{label}</p>
                      <p className="text-[10px] text-[var(--muted)] leading-tight mt-0.5">{hint}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[var(--muted)] mt-2">
                  Secured by Paystack · sellers are paid instantly to their own accounts.
                </p>
              </div>

              <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-sm text-green-700">
                <strong>OTP-secured delivery.</strong> Your 4-digit handover code arrives by email after payment — the driver can&apos;t complete delivery without it.
              </div>
              <div className="flex items-start gap-2">
                <input type="checkbox" id="terms" className="mt-1 w-4 h-4 min-w-[16px] accent-[var(--ink)]"
                  {...register('terms_accepted')} />
                <label htmlFor="terms" className="text-xs text-[var(--muted)] leading-relaxed">
                  I agree to the <Link to="/terms" className="underline text-[var(--ink)] hover:no-underline">Terms of Service</Link>, <Link to="/refund" className="underline text-[var(--ink)] hover:no-underline">Refund Policy</Link>, and <Link to="/shipping" className="underline text-[var(--ink)] hover:no-underline">Shipping Policy</Link>
                </label>
              </div>
              {errors.terms_accepted && <p className="text-xs text-red-500">{errors.terms_accepted.message}</p>}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 leading-relaxed">
                <strong>{deliveryCoverageText()}.</strong> Only complete payment if your delivery address is within our coverage area.
              </div>
              <Button type="submit" size="full" loading={isSubmitting} className="mt-4 rounded-xl">
                Pay GHS {(total + feeEstimate).toFixed(2)} · incl. GHS {feeEstimate.toFixed(2)} fee
              </Button>
              <p className="text-[11px] text-[var(--muted)] text-center">
                Fee estimated · exact total confirmed on Paystack before you pay.
              </p>
            </form>
          </div>
          <div>
            <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-6">Order Summary</h2>
            <div className="bg-[var(--off)] rounded-2xl p-6 space-y-4">
              {items.map(item => (
                <div key={item.key} className="flex items-center gap-4">
                  <div className="w-14 h-16 bg-white rounded-xl overflow-hidden flex-shrink-0">
                    {item.image ? <SafeImage src={item.image} alt={item.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={16} className="text-[var(--border)]" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--ink)] line-clamp-1">{item.name}</p>
                    <p className="text-xs text-[var(--muted)]">{item.meta}</p>
                  </div>
                  <p className="text-sm font-semibold flex-shrink-0">GHS {item.lineTotal.toFixed(2)}</p>
                </div>
              ))}
              <div className="border-t border-[var(--border)] pt-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Subtotal</span><span>GHS {subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Delivery</span><span>GHS {delivery_fee.toFixed(2)}</span></div>
                <p className="text-[11px] text-[var(--muted)]">Platform delivery estimate. Vendor self-delivery fees (flat per order) are added by the server at order placement — exact total confirmed on Paystack before you pay.</p>
                <div className="flex justify-between text-sm"><span className="text-[var(--muted)]">Paystack fee (est.)</span><span>GHS {feeEstimate.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-[var(--border)]"><span>Total</span><span>GHS {(total + feeEstimate).toFixed(2)}</span></div>
              </div>
              <div className="flex items-center gap-4 pt-2 text-[11px] text-[var(--muted)]">
                <span className="flex items-center gap-1"><ShieldCheck size={12} /> Secure payment</span>
                <span className="flex items-center gap-1"><Truck size={12} /> Tracked delivery</span>
                <span className="flex items-center gap-1"><RotateCcw size={12} /> 7-day returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
