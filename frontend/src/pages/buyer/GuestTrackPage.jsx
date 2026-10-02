import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, Package, Mail, UserPlus } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'
import { verifyPaystackReference } from '../../utils/paystack'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

const claimSchema = z.object({
  first_name: z.string().min(2, 'Required'),
  last_name: z.string().min(2, 'Required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Min. 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

const STEPS = ['Placed', 'Confirmed', 'Out for Delivery', 'Delivered']
const STEP_KEY = ['pending', 'accepted', 'picked_up', 'delivered']

export default function GuestTrackPage() {
  const { reference } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [retryEmail, setRetryEmail] = useState('')
  const [retrying, setRetrying] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(claimSchema),
    defaultValues: { email: '' },
  })

  const fetchTrack = async (ref) => {
    const res = await api.trackGuestOrder(ref)
    return res.data
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      try {
        // Returning from Paystack? Verify first (works without login for guest orders).
        const cbRef = searchParams.get('reference') || searchParams.get('trxref')
        if (cbRef && !cancelled) {
          setVerifying(true)
          try {
            await verifyPaystackReference(cbRef)
            toast.success('Payment confirmed!')
          } catch {
            // Verify may fail while Paystack settles; the track fetch below shows truth.
            // Webhook confirms independently.
          } finally {
            setVerifying(false)
          }
          setSearchParams({}, { replace: true })
        }
        const data = await fetchTrack(reference)
        if (!cancelled) {
          setOrder(data)
          try {
            const saved = sessionStorage.getItem('guest-track-email')
            if (saved) setRetryEmail(saved)
          } catch { /* ignore */ }
        }
      } catch {
        if (!cancelled) toast.error('Order not found. Check your tracking link.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
    // Intentionally mount/reference-only: searchParams is consumed once for
    // the Paystack callback, then cleared. Re-running would re-verify.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference])

  const handleRetry = async () => {
    if (!retryEmail.trim()) return toast.error('Enter the email you checked out with')
    setRetrying(true)
    try {
      const res = await api.retryGuestPayment(reference, { email: retryEmail.trim() })
      if (res.data?.paid) {
        toast.success('Order already paid')
        const data = await fetchTrack(reference)
        setOrder(data)
      } else if (res.data?.authorization_url) {
        window.location.assign(res.data.authorization_url)
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not restart payment')
    } finally {
      setRetrying(false)
    }
  }

  const onClaim = async (data) => {
    try {
      const res = await api.claimGuestAccount(data)
      const { tokens, user } = res.data
      localStorage.setItem('access_token', tokens.access)
      localStorage.setItem('refresh_token', tokens.refresh)
      setUser(user)
      toast.success(res.data.message || 'Account created!')
      navigate('/orders')
    } catch (err) {
      const d = err.response?.data
      const msg = typeof d === 'string' ? d
        : d?.non_field_errors?.[0] || d?.detail || d?.email?.[0] || d?.error || 'Could not create account'
      toast.error(msg)
    }
  }

  if (loading || verifying) return (
    <MainLayout>
      <div className="flex flex-col items-center gap-3 py-32 px-6 text-center">
        <Spinner />
        <p className="text-sm text-[var(--muted)]">
          {verifying ? 'Confirming your payment with Paystack…' : 'Loading your order…'}
        </p>
      </div>
    </MainLayout>
  )

  if (!order) return (
    <MainLayout>
      <div className="max-w-md mx-auto text-center py-24 px-6">
        <Package size={40} className="mx-auto text-[var(--border)] mb-4" />
        <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-3">Order not found</h2>
        <p className="text-sm text-[var(--muted)] mb-6">Use the tracking link from your confirmation email.</p>
        <Button onClick={() => navigate('/catalog')}>Continue shopping</Button>
      </div>
    </MainLayout>
  )

  const isPaid = order.payment_status === 'paid'
  const currentIdx = Math.max(0, STEP_KEY.indexOf(order.status))

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-6 lg:px-10 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
          {order.is_guest_order ? 'Guest order' : 'Order'} #{order.id}
        </p>
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-8">
          {isPaid ? 'Payment confirmed' : order.status === 'cancelled' ? 'Order cancelled' : 'Complete your payment'}
        </h1>

        {isPaid && (
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5 mb-6 text-sm text-green-800">
            <p className="font-semibold flex items-center gap-2 mb-1">
              <CheckCircle size={16} /> Thank you — we&apos;re preparing your order.
            </p>
            <p className="flex items-start gap-1.5 text-xs mt-1">
              <Mail size={12} className="mt-0.5 flex-shrink-0" />
              Your delivery OTP and receipt were emailed to you. Give the OTP to your driver on arrival.
            </p>
          </div>
        )}

        {!isPaid && order.status !== 'cancelled' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
            <p className="text-sm font-medium text-amber-800 mb-3">
              This order is unpaid — GHS {parseFloat(order.charged_total || order.total).toFixed(2)} due.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={retryEmail}
                onChange={e => setRetryEmail(e.target.value)}
                placeholder="Email you checked out with"
                className="flex-1 px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border border-amber-200 bg-white outline-none focus:border-amber-500 placeholder:text-[var(--muted)] placeholder:opacity-70"
              />
              <Button onClick={handleRetry} loading={retrying} className="rounded-xl sm:w-auto w-full">
                Pay Now
              </Button>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-5 mb-6 overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {STEPS.map((label, i) => (
              <span key={label}
                className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap ${
                  i < currentIdx ? 'bg-green-100 text-green-700'
                  : i === currentIdx ? 'bg-[var(--ink)] text-white'
                  : 'bg-[var(--off)] text-[var(--muted)]'
                }`}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="bg-[var(--off)] rounded-2xl p-6 space-y-4 mb-6">
          {(order.items || []).map((item, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--ink)] line-clamp-1">{item.product_name}</p>
                <p className="text-xs text-[var(--muted)]">{item.size} · {item.color} · x{item.quantity}</p>
              </div>
              <p className="text-sm font-semibold flex-shrink-0">GHS {parseFloat(item.total).toFixed(2)}</p>
            </div>
          ))}
          <div className="border-t border-[var(--border)] pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-[var(--muted)]">Subtotal</span><span>GHS {parseFloat(order.subtotal).toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--muted)]">Delivery</span><span>GHS {parseFloat(order.delivery_fee).toFixed(2)}</span></div>
            {parseFloat(order.processing_fee || 0) > 0 && (
              <div className="flex justify-between"><span className="text-[var(--muted)]">Paystack fee</span><span>GHS {parseFloat(order.processing_fee).toFixed(2)}</span></div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 border-t border-[var(--border)]">
              <span>Total</span><span>GHS {parseFloat(order.charged_total || order.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Claim account */}
        {order.is_guest_order && (
          <div className="bg-white border border-[var(--border)] rounded-2xl p-6">
            <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-2 flex items-center gap-2">
              <UserPlus size={20} /> Keep this order in an account
            </h2>
            <p className="text-sm text-[var(--muted)] mb-5">
              Set a password with the same email you checked out with — your guest orders move with you.
            </p>
            <form onSubmit={handleSubmit(onClaim)} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="First name" error={errors.first_name?.message} {...register('first_name')} />
                <Input label="Last name" error={errors.last_name?.message} {...register('last_name')} />
              </div>
              <Input label="Email (same as checkout)" type="email" error={errors.email?.message} {...register('email')} />
              <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
              <Input label="Confirm password" type="password" error={errors.confirm_password?.message} {...register('confirm_password')} />
              <Button type="submit" size="full" loading={isSubmitting} className="rounded-xl">
                Create account &amp; link my orders
              </Button>
            </form>
            <p className="text-sm text-[var(--muted)] text-center mt-4">
              Already have an account? <Link to="/login" className="text-[var(--ink)] font-medium hover:underline">Sign in</Link> — orders link automatically.
            </p>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
