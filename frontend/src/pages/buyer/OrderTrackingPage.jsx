import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { Package, Clock, CheckCircle, Truck, MapPin } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'

const TRACK_STEPS = [
  { key: 'pending',    label: 'Order Placed',    icon: Package },
  { key: 'accepted',   label: 'Confirmed',        icon: Clock },
  { key: 'picked_up',  label: 'Out for Delivery', icon: Truck },
  { key: 'delivered',  label: 'Delivered',        icon: CheckCircle },
]

export default function OrderTrackingPage() {
  const { id } = useParams()

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => {
      const res = await api.get(`/orders/${id}/`)
      return res.data
    },
  })

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
          <h2 className="serif text-xl font-medium text-[var(--ink)] mb-6">Order Summary</h2>
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
              <p className="font-medium text-[var(--ink)]">GHS {parseFloat(order.total).toFixed(2)}</p>
            </div>
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
          </div>
          {order.payment_method === 'cash_on_delivery' && order.delivery_pin && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-800 text-sm font-medium">
              Cash on Delivery — give the driver this PIN on arrival:{' '}
              <span className="font-bold text-xl tracking-widest">{order.delivery_pin}</span>
            </div>
          )}
        </div>

        {/* Order Items */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-8">
          <h2 className="serif text-xl font-medium text-[var(--ink)] mb-6">Items</h2>
          <div className="space-y-4">
            {order.items?.map((item, i) => (
              <div key={i} className="flex items-center gap-4 pb-4 border-b border-[var(--border)] last:border-0">
                <div className="w-14 h-14 bg-[var(--off)] rounded-lg overflow-hidden flex-shrink-0">
                  {item.product_image ? (
                    <img src={item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
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
        </div>
      </div>
    </MainLayout>
  )
}
