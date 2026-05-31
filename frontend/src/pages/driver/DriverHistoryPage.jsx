import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Truck, Package } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function DriverHistoryPage() {
  const qc = useQueryClient()

  const { data: orders, isLoading } = useQuery({
    queryKey: ['driver-history'],
    queryFn: async () => {
      const res = await api.get('/driver/history/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/driver/orders/${id}/status/`, { status }),
    onSuccess: () => {
      qc.invalidateQueries(['driver-history'])
      toast.success('Order updated')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update'),
  })

  const STATUS_ICONS = {
    accepted: <Truck size={14} className="text-blue-500" />,
    picked_up: <Truck size={14} className="text-amber-500" />,
    delivered: <CheckCircle size={14} className="text-green-500" />,
    failed: <XCircle size={14} className="text-rose-500" />,
  }

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
      <h1 className="serif text-4xl font-medium text-[var(--ink)] mb-10">Delivery History</h1>

      {!orders?.length ? (
        <div className="text-center py-24 border border-dashed border-[var(--border)] rounded-2xl">
          <Package size={40} className="mx-auto text-[var(--border)] mb-4" />
          <p className="serif text-2xl font-medium text-[var(--ink)] mb-2">No deliveries yet</p>
          <p className="text-sm text-[var(--muted)]">Your accepted orders will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white border border-[var(--border)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--muted)]">Order #{order.id}</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium capitalize">
                    {STATUS_ICONS[order.status]}
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-sm font-bold text-green-600">
                  +GHS {parseFloat(order.driver_earnings || 0).toFixed(2)}
                </p>
              </div>

              <div className="text-sm text-[var(--muted)] mb-4">
                {new Date(order.created_at).toLocaleDateString('en-GH', {
                  day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </div>

              {/* Active order actions */}
              {order.status === 'accepted' && (
                <Button size="sm" onClick={() => statusMutation.mutate({ id: order.id, status: 'picked_up' })}>
                  Mark as Picked Up
                </Button>
              )}
              {order.status === 'picked_up' && (
                <Button size="sm" onClick={() => statusMutation.mutate({ id: order.id, status: 'delivered' })}>
                  Mark as Delivered
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}