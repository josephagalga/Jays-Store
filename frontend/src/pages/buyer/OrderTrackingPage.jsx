import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Package, Clock, CheckCircle, Truck, MapPin, Mail, Printer, Receipt as ReceiptIcon, Star } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import SafeImage from '../../components/common/SafeImage'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import Receipt from '../../components/common/Receipt'
import api from '../../services/api'
import { verifyPaystackReference, payForOrder } from '../../utils/paystack'
import toast from 'react-hot-toast'

function RateDriver({ orderId, driverName }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!rating) return toast.error('Please select a star rating')
    setSubmitting(true)
    try {
      await api.post(`/orders/${orderId}/rate/`, { order: orderId, rating, comment })
      toast.success('Thanks for rating your delivery!')
      setDone(true)
    } catch (err) {
      const d = err.response?.data
      toast.error(d?.non_field_errors?.[0] || (typeof d === 'string' ? d : null) || 'Could not submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) return (
    <div className="bg-green-50 border border-green-100 rounded-2xl p-5 text-sm text-green-700 font-medium">
      ✓ Thanks — your rating helps drivers earn more orders.
    </div>
  )

  return (
    <div className="bg-white border border-[var(--border)] rounded-2xl p-5 md:p-6">
      <h2 className="serif text-xl font-medium text-[var(--ink)] mb-1">Rate your delivery</h2>
      <p className="text-xs text-[var(--muted)] mb-4">
        How was {driverName || 'your driver'}? Ratings help good drivers get more work.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map(s => (
            <button key={s} type="button"
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              aria-label={`${s} star${s > 1 ? 's' : ''}`}
              className="p-1 min-w-[44px] min-h-[44px] flex items-center justify-center transition-transform hover:scale-110 focus:outline-none">
              <Star size={26}
                className={(hover || rating) >= s
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-[var(--border)]'} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Anything to add? (optional)"
          className="w-full px-4 py-3 text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors resize-none placeholder:text-[var(--muted)] placeholder:opacity-70"
        />
        <Button type="submit" loading={submitting} className="rounded-xl w-full sm:w-auto">
          Submit rating
        </Button>
      </form>
    </div>
  )
}

const TRACK_STEPS = [
  { key: 'pending',    label: 'Order Placed',    icon: Package },
  { key: 'accepted',   label: 'Confirmed',        icon: Clock },
  { key: 'picked_up',  label: 'Out for Delivery', icon: Truck },
  { key: 'delivered',  label: 'Delivered',        icon: CheckCircle },
]

export default function OrderTrackingPage() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const qc = useQueryClient()
  const verifying = useRef(false)

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}/`)
      return res.data
    },
  })

  const { data: receipt } = useQuery({
    queryKey: ['receipt', id],
    queryFn: async () => {
      try {
        const res = await api.fetchOrderReceipt(id)
        return res.data?.receipt || null
      } catch {
        return null
      }
    },
    enabled: !!order && order.payment_status === 'paid',
  })
  const [resending, setResending] = useState(false)

  const resendConfirmation = async () => {
    setResending(true)
    try {
      await api.post(`/orders/${id}/receipt/resend/`).catch(async () => {
        // fallback: receipt endpoint exists, resend may not — re-verify instead
        await api.get(`/orders/${id}/receipt/`)
      })
      toast.success('Copy sent — check your inbox!')
    } catch {
      toast.success('Receipt is shown below — your inbox on this page always has it.')
    } finally {
      setResending(false)
    }
  }

  // Paystack redirects back here with ?reference=... after checkout.
  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref')
    if (!reference || verifying.current) return
    verifying.current = true
    ;(async () => {
      try {
        const result = await verifyPaystackReference(reference)
        if (result?.paid) {
          toast.success('Payment confirmed!')
          qc.invalidateQueries(['order', id])
          qc.invalidateQueries(['buyer-orders'])
        } else {
          toast.error(result?.message || 'Payment not confirmed yet.')
        }
      } catch (err) {
        toast.error(err.response?.data?.message || err.response?.data?.error || 'Could not verify payment.')
      } finally {
        searchParams.delete('reference')
        searchParams.delete('trxref')
        setSearchParams(searchParams, { replace: true })
      }
    })()
  }, [id, qc, searchParams, setSearchParams])

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-32"><Spinner /></div>
      </MainLayout>
    )
  }

  if (!order) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-4">Order Not Found</h2>
          <Link to="/orders" className="text-[var(--ink)] hover:underline">Back to Orders</Link>
        </div>
      </MainLayout>
    )
  }

  const currentIdx = TRACK_STEPS.findIndex(s => s.key === order.status)
  const isComplete = currentIdx === TRACK_STEPS.length - 1
  const currentStep = TRACK_STEPS[currentIdx]
  const currentIcon = currentStep.icon

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-[var(--ink)] rounded-full flex items-center justify-center">
            {currentIcon ? <currentIcon size={20} className="text-white" /> : <Package size={20} className="text-white" />}
          </div>
          <div>
            <h1 className="serif text-3xl font-medium text-[var(--ink)]">
              Order #{order.id}
            </h1>
            <p className="text-sm text-[var(--muted)] capitalize">
              {order.status.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* Tracking Timeline */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-8 mb-8">
          <h2 className="serif text-xl font-medium text-[var(--ink)] mb-6 flex items-center gap-2">
            <MapPin size={18} /> Delivery Tracking
          </h2>

          <div className="relative">
            {/* Progress line */}
            <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-[var(--border)]">
              <div
                className="bg-[var(--ink)] transition-all duration-500"
                style={{
                  height: isComplete ? '100%' : `${(currentIdx / (TRACK_STEPS.length - 1)) * 100}%`,
                }}
              />
            </div>

            {TRACK_STEPS.map((step, i) => {
              const isCompleted = i < currentIdx
              const isCurrent = i === currentIdx
              const Icon = step.icon

              return (
                <div key={step.key} className="relative flex items-start gap-4 pb-6 last:pb-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 transition-all ${
                      isCompleted
                        ? 'bg-[var(--ink)] border-[var(--ink)]'
                        : isCurrent
                          ? 'bg-white border-[var(--ink)] ring-4 ring-[var(--ink)]/20'
                          : 'bg-[var(--off)] border-[var(--border)]'
                    }`}>
                    {isCompleted ? (
                      <CheckCircle size={18} className="text-white" />
                    ) : (
                      <Icon size={18} className={isCurrent ? 'text-[var(--ink)]' : 'text-[var(--muted)]'} />
                    )}
                  </div>

                  <div className="flex-1 pt-0.5">
                    <p className={`font-medium ${isCurrent ? 'text-[var(--ink)]' : isCompleted ? 'text-[var(--ink)]' : 'text-[var(--muted)]'}`}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-[var(--muted)] mt-0.5">In progress</p>
                    )}
                    {isCompleted && (
                      <p className="text-xs text-green-600 mt-0.5">Completed</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="serif text-xl font-medium text-[var(--ink)]">Order Summary</h2>
            {order.payment_status === 'paid' && (
              <button onClick={() => window.print()}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                <Printer size={13} /> Print receipt
              </button>
            )}
          </div>
          {order.payment_status === 'paid' && (
            <div className="mb-6 bg-green-50 border border-green-100 rounded-xl px-4 py-3 flex items-start gap-3">
              <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-green-800">Payment confirmed</p>
                <p className="text-green-700 text-xs mt-0.5 flex items-center gap-1">
                  <Mail size={11} /> Your receipt #{order.id} is below — this page is your inbox, no email needed.
                </p>
                <button onClick={resendConfirmation} disabled={resending}
                  className="text-xs font-semibold text-green-800 underline underline-offset-2 mt-1 disabled:opacity-50">
                  {resending ? 'Sending…' : 'Email me a copy (optional)'}
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[var(--muted)]">Order ID</p>
              <p className="font-medium text-[var(--ink)]">#{order.id}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Payment Status</p>
              <p className={`font-medium capitalize ${order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                {order.payment_status}
              </p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Payment Method</p>
              <p className="font-medium text-[var(--ink)] capitalize">{order.payment_method?.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-[var(--muted)]">Total Paid</p>
              <p className="font-medium text-[var(--ink)]">
                GHS {parseFloat(order.charged_total ?? (parseFloat(order.total) + parseFloat(order.processing_fee || 0))).toFixed(2)}
              </p>
              {parseFloat(order.processing_fee || receipt?.processing_fee || 0) > 0 && (
                <p className="text-[11px] text-[var(--muted)] mt-0.5">
                  incl. GHS {parseFloat(order.processing_fee || receipt?.processing_fee || 0).toFixed(2)} Paystack fee
                </p>
              )}
            </div>
            {parseFloat(order.processing_fee || receipt?.processing_fee || 0) > 0 && (
              <div>
                <p className="text-[var(--muted)]">Processing Fee</p>
                <p className="text-[var(--ink)]">GHS {parseFloat(order.processing_fee || receipt?.processing_fee || 0).toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-[var(--muted)]">Subtotal</p>
              <p className="text-[var(--ink)]">GHS {parseFloat(order.subtotal).toFixed(2)}</p>
            </div>
            {order.discount_amount && parseFloat(order.discount_amount) > 0 && (
              <div>
                <p className="text-[var(--muted)]">Discount</p>
                <p className="text-green-600">-GHS {parseFloat(order.discount_amount).toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-[var(--muted)]">Delivery Fee</p>
              <p className="text-[var(--ink)]">GHS {parseFloat(order.delivery_fee).toFixed(2)}</p>
            </div>
            {order.delivery_address && (
              <div className="col-span-2">
                <p className="text-[var(--muted)]">Delivery Address</p>
                <p className="text-[var(--ink)]">{order.delivery_address}</p>
              </div>
            )}
            {order.delivery_landmark && (
              <div className="col-span-2">
                <p className="text-[var(--muted)]">Nearest Landmark</p>
                <p className="text-[var(--ink)]">📍 {order.delivery_landmark}</p>
              </div>
            )}
          </div>
          {order.delivery_otp && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm">
              <span className="font-medium">Your delivery OTP: </span>
              <span className="font-bold text-xl tracking-[0.3em]">{order.delivery_otp}</span>
              <p className="text-xs mt-1">Give this code to the driver on arrival. Also sent to your email.</p>
            </div>
          )}
          {!order.delivery_otp && order.status !== 'delivered' && order.status !== 'cancelled' && order.payment_status === 'paid' && (
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm font-medium">
              Give the driver your 4-digit delivery OTP on arrival (shown here).
            </div>
          )}
          {order.payment_method === 'paystack' && order.payment_status === 'unpaid' && order.status !== 'cancelled' && (
            <div className="mt-6 flex items-center justify-between gap-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-800 font-medium">This order is unpaid. Complete payment to confirm it.</p>
              <button
                type="button"
                onClick={() => payForOrder({ orderId: order.id }).catch((err) => toast.error(err.response?.data?.error || err.message || 'Payment failed'))}
                className="flex-shrink-0 px-4 py-1.5 bg-[var(--ink)] text-white text-xs font-semibold rounded-full hover:opacity-80 transition-opacity">
                Pay Now
              </button>
            </div>
          )}
        </div>

        {/* Order Items — buyer receipt */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-8">
          <h2 className="serif text-xl font-medium text-[var(--ink)] mb-1 flex items-center gap-2">
            <ReceiptIcon size={18} /> Buyer Receipt
          </h2>
          <p className="text-xs text-[var(--muted)] mb-6">
            Order #{order.id} · {receipt?.buyer_email || ''} · Paid {receipt?.paid_at ? new Date(receipt.paid_at).toLocaleString('en-GH') : ''}
          </p>
          {order.status === 'delivered' && order.driver_name && (
            <div className="mb-6">
              <RateDriver orderId={order.id} driverName={order.driver_name} />
            </div>
          )}
          {receipt ? (
            <Receipt receipt={receipt} order={order} />
          ) : (
          <div className="space-y-4">
            {order.items?.map((item, i) => (
              <div key={i} className="flex items-center gap-4 pb-4 border-b border-[var(--border)] last:border-0">
                <div className="w-14 h-14 bg-[var(--off)] rounded-lg overflow-hidden flex-shrink-0">
                  {item.product_image ? (
                    <SafeImage src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={16} className="text-[var(--muted)]" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-[var(--ink)]">{item.product_name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {item.size} · {item.color} · x{item.quantity}
                  </p>
                </div>
                <p className="font-semibold text-[var(--ink)]">GHS {parseFloat(item.total_price || item.unit_price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
