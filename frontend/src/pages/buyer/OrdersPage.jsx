import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, Clock, CheckCircle, XCircle, Truck, Star, Eye } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import SafeImage from '../../components/common/SafeImage'
import { OrderListSkeleton } from '../../components/common/Skeletons'
import Badge from '../../components/ui/Badge'
import api from '../../services/api'
import { payForOrder } from '../../utils/paystack'
import toast from 'react-hot-toast'

const STATUS_CONFIG = {
  pending:   { label: 'Pending',    icon: <Clock size={13} />,       variant: 'warning' },
  accepted:  { label: 'Accepted',   icon: <Truck size={13} />,       variant: 'info'    },
  picked_up: { label: 'On the Way', icon: <Truck size={13} />,       variant: 'info'    },
  delivered: { label: 'Delivered',  icon: <CheckCircle size={13} />, variant: 'success' },
  cancelled: { label: 'Cancelled',  icon: <XCircle size={13} />,     variant: 'danger'  },
  failed:    { label: 'Failed',     icon: <XCircle size={13} />,     variant: 'danger'  },
}

export default function OrdersPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [payingId, setPayingId] = useState(null)

  const { data: orders, isLoading } = useQuery({
    queryKey: ['buyer-orders'],
    queryFn: async () => {
      const res = await api.get('/orders/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
    refetchInterval: 30000,
  })

  // Inbox semantics without a new model: orders needing action (paid with a
  // live OTP, then other paid, then unpaid) pin to the top; anything created
  // since the last visit gets a NEW badge. Seen-marker is per-browser.
  const [seenAt, setSeenAt] = useState(() => {
    try { return parseInt(localStorage.getItem('jays-inbox-seen-buyer') || '0', 10) || 0 }
    catch { return 0 }
  })
  useEffect(() => {
    if (!orders?.length) return
    const t = setTimeout(() => {
      try { localStorage.setItem('jays-inbox-seen-buyer', String(Date.now())) } catch { /* ignore */ }
      setSeenAt(Date.now())
    }, 5000)
    return () => clearTimeout(t)
  }, [orders?.length])

  const sorted = useMemo(() => {
    const rank = (o) => {
      const liveOtp = !!o.delivery_otp && ['pending', 'accepted', 'picked_up'].includes(o.status)
      if (liveOtp) return 0
      if (o.payment_status === 'paid') return 1
      if (o.payment_status !== 'paid' && o.status !== 'cancelled') return 2
      return 3
    }
    return [...(orders || [])].sort((a, b) =>
      rank(a) - rank(b) || new Date(b.created_at) - new Date(a.created_at))
  }, [orders])
  const isNew = (o) => {
    try { return new Date(o.created_at).getTime() > seenAt } catch { return false }
  }

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`/orders/${id}/cancel/`),
    onSuccess: () => {
      qc.invalidateQueries(['buyer-orders'])
      toast.success('Order cancelled')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Cannot cancel this order'),
  })

  const handlePayNow = async (order) => {
    setPayingId(order.id)
    try {
      await payForOrder({ orderId: order.id })
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Payment failed')
      setPayingId(null)
    }
  }

  if (isLoading) return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
        <OrderListSkeleton count={3} />
      </div>
    </MainLayout>
  )

  if (!orders?.length) return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 text-center">
        <Package size={48} className="mx-auto text-[var(--border)] mb-5" />
        <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-3">
          No orders yet
        </h2>
        <p className="text-sm text-[var(--muted)] mb-8">
          Your orders will appear here once you have made a purchase.
        </p>
        <Link to="/catalog"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity">
          Start Shopping
        </Link>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-10">My Orders</h1>

        <div className="space-y-5">
          {sorted.map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
            const isDelivered = order.status === 'delivered'
            const isPending = order.status === 'pending'
            const isUnpaid = order.payment_status !== 'paid'
            const showOtp = !!order.delivery_otp && ['pending', 'accepted', 'picked_up'].includes(order.status)

            return (
              <div key={order.id}
                className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">

                {/* Order header */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--off)]">
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-medium text-[var(--muted)]">
                      Order #{order.id}
                    </p>
                    {isNew(order) && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[var(--ink)] text-white rounded-full">
                        New
                      </span>
                    )}
                    <span className="text-[var(--border)]">·</span>
                    <p className="text-xs text-[var(--muted)]">
                      {new Date(order.created_at).toLocaleDateString('en-GH', {
                        day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <Badge variant={cfg.variant}>
                    <span className="flex items-center gap-1">
                      {cfg.icon} {cfg.label}
                    </span>
                  </Badge>
                </div>

                {/* Order items */}
                <div className="divide-y divide-[var(--border)]">
                  {order.items?.map(item => (
                    <div key={item.id}
                      className="flex items-center gap-4 px-6 py-4">
                      {/* Product image */}
                      <div className="w-14 h-16 bg-[var(--off)] rounded-xl overflow-hidden flex-shrink-0">
                        {item.product_image ? (
                          <SafeImage
                            src={item.product_image}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={16} className="text-[var(--border)]" />
                          </div>
                        )}
                      </div>

                      {/* Product info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--ink)] line-clamp-1">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-[var(--muted)] mt-0.5">
                          {item.size && `Size: ${item.size}`}
                          {item.size && item.color && ' · '}
                          {item.color && `Colour: ${item.color}`}
                          {' · '} Qty: {item.quantity}
                        </p>
                      </div>

                      {/* Price */}
                      <p className="text-sm font-bold text-[var(--ink)] flex-shrink-0">
                        GHS {parseFloat(item.total_price).toFixed(2)}
                      </p>

                      {/* Review button — only for delivered orders */}
                      {isDelivered && item.product && (
                        <Link
                          to={`/products/${item.product_slug}`}
                          state={{ openReview: true }}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-amber-300 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full hover:bg-amber-100 transition-colors">
                          <Star size={11} />
                          Review
                        </Link>
                      )}
                    </div>
                  ))}
                </div>

                {/* Delivery OTP — next to the ordered products */}
                {showOtp && (
                  <div className="mx-6 mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Delivery OTP</span>
                    <span className="text-xl font-bold tracking-[0.3em] text-amber-900">{order.delivery_otp}</span>
                    <span className="text-xs text-amber-700">Give this code to your driver on arrival. It lives here in your orders.</span>
                  </div>
                )}

                {/* Order footer */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 md:px-6 py-4 border-t border-[var(--border)]">
                  <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                    {order.delivery_address && (
                      <span className="text-xs line-clamp-1 max-w-xs">
                        📍 {order.delivery_address}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="font-bold text-[var(--ink)]">
                      GHS {parseFloat(order.charged_total ?? (parseFloat(order.total) + parseFloat(order.processing_fee || 0))).toFixed(2)}
                      {parseFloat(order.processing_fee || 0) > 0 && (
                        <span className="block text-[10px] font-normal text-[var(--muted)]">
                          incl. GHS {parseFloat(order.processing_fee).toFixed(2)} Paystack fee
                        </span>
                      )}
                    </span>
                    {order.payment_status === 'paid' && order.status !== 'cancelled' && (
                      <span className="text-xs text-green-600 font-medium">✓ Paid — receipt & OTP here</span>
                    )}
                    {isUnpaid && order.status !== 'cancelled' && (
                      <button
                        onClick={() => handlePayNow(order)}
                        disabled={payingId === order.id}
                        className="px-4 py-1.5 bg-[var(--ink)] text-white text-xs font-semibold rounded-full hover:opacity-80 transition-opacity disabled:opacity-50">
                        {payingId === order.id ? 'Opening…' : 'Pay Now'}
                      </button>
                    )}
                    {isPending && (
                      <button
                        onClick={() => cancelMutation.mutate(order.id)}
                        disabled={cancelMutation.isPending}
                        title={isUnpaid ? 'Cancel this unpaid order' : 'Paid orders cannot be cancelled'}
                        className="text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors">
                        Cancel Order
                      </button>
                    )}
                    <button
                      onClick={() => navigate(`/orders/${order.id}/track`)}
                      className="flex items-center gap-1 text-xs font-medium text-[var(--ink)] hover:text-[var(--muted)] transition-colors">
                      <Eye size={12} /> {order.payment_status === 'paid' ? 'Receipt / Track' : 'Track Order'}
                    </button>
                  </div>
                </div>

                {/* Track Timeline */}
                {isPending && (
                  <div className="px-4 md:px-6 py-3 bg-[var(--off)] border-t border-[var(--border)] overflow-x-auto">
                    <div className="flex items-center gap-2 min-w-max">
                      {['Placed', 'Confirmed', 'Out for Delivery', 'Delivered'].map((label, i) => {
                        const currentIdx = ['pending', 'accepted', 'picked_up', 'delivered'].indexOf(order.status)
                        const isCompleted = i <= currentIdx
                        const isCurrent = i === currentIdx
                        return (
                          <button
                            key={label}
                            onClick={() => navigate(`/orders/${order.id}/track`)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium transition-all ${
                              isCompleted
                                ? isCurrent
                                  ? 'bg-[var(--ink)] text-white ring-2 ring-[var(--ink)]/30 cursor-pointer hover:ring-[var(--ink)]/50'
                                  : 'bg-green-100 text-green-700 cursor-pointer hover:bg-green-200'
                                : 'bg-[var(--off)] text-[var(--muted)] cursor-default'
                            }`}>
                            <Eye size={10} />
                            {label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Delivered info strip */}
                {isDelivered && (
                  <div className="px-6 py-3 bg-green-50 border-t border-green-100 flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    <p className="text-xs text-green-700 font-medium">
                      Delivered successfully — click Review on any item to share your experience
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </MainLayout>
  )
}