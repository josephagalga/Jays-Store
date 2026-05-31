import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Package, Clock, CheckCircle, XCircle, Truck, Star } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import api from '../../services/api'
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

  const { data: orders, isLoading } = useQuery({
    queryKey: ['buyer-orders'],
    queryFn: async () => {
      const res = await api.get('/orders/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (id) => api.post(`/orders/${id}/cancel/`),
    onSuccess: () => {
      qc.invalidateQueries(['buyer-orders'])
      toast.success('Order cancelled')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Cannot cancel this order'),
  })

  if (isLoading) return (
    <MainLayout>
      <div className="flex justify-center py-32"><Spinner /></div>
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
        <h1 className="serif text-4xl font-medium text-[var(--ink)] mb-10">My Orders</h1>

        <div className="space-y-5">
          {orders.map(order => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
            const isDelivered = order.status === 'delivered'
            const isPending = order.status === 'pending'

            return (
              <div key={order.id}
                className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">

                {/* Order header */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[var(--border)] bg-[var(--off)]">
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-medium text-[var(--muted)]">
                      Order #{order.id}
                    </p>
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
                          <img
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
                          to={`/products/${item.product}`}
                          state={{ openReview: true }}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-amber-300 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full hover:bg-amber-100 transition-colors">
                          <Star size={11} />
                          Review
                        </Link>
                      )}
                    </div>
                  ))}
                </div>

                {/* Order footer */}
                <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-[var(--border)]">
                  <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
                    {order.delivery_address && (
                      <span className="text-xs line-clamp-1 max-w-xs">
                        📍 {order.delivery_address}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-[var(--ink)]">
                      GHS {parseFloat(order.total).toFixed(2)}
                    </span>
                    {isPending && (
                      <button
                        onClick={() => cancelMutation.mutate(order.id)}
                        disabled={cancelMutation.isPending}
                        className="text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors">
                        Cancel Order
                      </button>
                    )}
                  </div>
                </div>

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