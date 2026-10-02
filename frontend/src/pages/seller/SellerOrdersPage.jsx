import { useQuery } from '@tanstack/react-query'
import { Package, Truck, CheckCircle } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'

const STATUS_LABEL = {
  pending: 'Pending',
  accepted: 'Accepted',
  picked_up: 'Picked Up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Failed',
}

export default function SellerOrdersPage() {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: async () => {
      const res = await api.get('/seller/orders/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
    refetchInterval: 30000,
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-2">My Orders</h1>
      <p className="text-sm text-[var(--muted)] mb-10">Track deliveries for your products, including driver info.</p>

      {!orders?.length ? (
        <div className="text-center py-24 border border-dashed border-[var(--border)] rounded-2xl">
          <Package size={40} className="mx-auto text-[var(--border)] mb-4" />
          <p className="serif text-2xl font-medium text-[var(--ink)]">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white border border-[var(--border)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[var(--muted)]">Order #{order.id}</span>
                <span className="text-xs font-medium capitalize px-2.5 py-1 bg-[var(--off)] rounded-full">
                  {STATUS_LABEL[order.status] || order.status}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                <div>
                  <p className="text-xs text-[var(--muted)]">Buyer</p>
                  <p className="font-medium">{order.buyer_name || '—'}</p>
                  <p className="text-xs text-[var(--muted)]">{order.buyer_phone || order.delivery_phone || ''}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Driver</p>
                  <p className="font-medium flex items-center gap-1">
                    <Truck size={13} /> {order.driver_name || 'Unassigned'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Items</p>
                  <p className="font-medium">{order.item_count}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Total</p>
                  <p className="font-bold">GHS {parseFloat(order.total).toFixed(2)}</p>
                </div>
              </div>
              {(order.delivery_address || order.delivery_landmark || order.delivery_note) && (
                <div className="bg-[var(--off)] rounded-xl px-4 py-3 mb-3 text-xs space-y-1">
                  {order.delivery_address && <p><span className="text-[var(--muted)]">Drop-off: </span><span className="font-medium">{order.delivery_address}</span></p>}
                  {order.delivery_landmark && <p><span className="text-[var(--muted)]">Landmark: </span><span className="font-medium">📍 {order.delivery_landmark}</span></p>}
                  {order.delivery_note && <p className="text-[var(--muted)] italic">Note: {order.delivery_note}</p>}
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <CheckCircle size={12} />
                {new Date(order.created_at).toLocaleString('en-GH')}
                <span>· {order.payment_method} · {order.payment_status}</span>
                {order.status === 'delivered' && <span className="text-green-600 font-medium">· Successful</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
