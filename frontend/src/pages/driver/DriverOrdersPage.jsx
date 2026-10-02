import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { MapPin, Package, Clock } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function DriverOrdersPage() {
  const qc = useQueryClient()
  const navigate = useNavigate()

  const { data: orders, isLoading } = useQuery({
    queryKey: ['driver-available-orders'],
    queryFn: async () => {
      const res = await api.get('/driver/orders/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
    refetchInterval: 30000,
  })

  const acceptMutation = useMutation({
    mutationFn: (id) => api.post(`/driver/orders/${id}/accept/`),
    onSuccess: (res) => {
      qc.invalidateQueries(['driver-available-orders'])
      qc.invalidateQueries(['driver-active'])
      qc.invalidateQueries(['driver-history'])
      const vendors = res.data?.vendors?.map(v => v.store_name).join(', ')
      toast.success(`Order accepted!${vendors ? ` Pickup: ${vendors}` : ''} — find it under My Deliveries.`)
      navigate('/driver/history')
    },
    onError: () => toast.error('Could not accept order'),
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-8 md:mb-10">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Available Orders</h1>
        <span className="text-sm text-[var(--muted)]">Auto-refreshes every 30s</span>
      </div>

      {!orders?.length ? (
        <div className="text-center py-24 border border-dashed border-[var(--border)] rounded-2xl">
          <Package size={40} className="mx-auto text-[var(--border)] mb-4" />
          <p className="serif text-2xl font-medium text-[var(--ink)] mb-2">No orders available</p>
          <p className="text-sm text-[var(--muted)]">New orders will appear here automatically</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-white border border-[var(--border)] rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-medium text-[var(--muted)] bg-[var(--off)] px-2.5 py-1 rounded-full">
                      Order #{order.id}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                      <Clock size={12} />
                      {new Date(order.created_at).toLocaleTimeString('en-GH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <MapPin size={15} className="text-[var(--muted)] flex-shrink-0" />
                    <span className="text-sm text-[var(--ink)] font-medium">{order.area}</span>
                  </div>

                  {order.vendors?.length > 0 && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-xs text-amber-800 space-y-1">
                      <p className="font-semibold">Pickup / Vendor:</p>
                      {order.vendors.map(v => (
                        <p key={v.seller_id}>
                          <strong>{v.store_name}</strong> — {v.phone_number || 'N/A'}
                          <br />
                          <span>{v.pickup_location || v.store_address || ''}</span>
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-[var(--muted)] mb-0.5">Items</p>
                      <p className="text-sm font-semibold">{order.item_count}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted)] mb-0.5">Order Value</p>
                      <p className="text-sm font-semibold">GHS {parseFloat(order.total).toFixed(2)}</p>
                    </div>
                  </div>
                  <p className="text-[11px] text-[var(--muted)] mt-3">Your pay is settled physically by the store admin.</p>
                </div>

                <Button onClick={() => acceptMutation.mutate(order.id)}
                  loading={acceptMutation.isPending}
                  className="w-full sm:w-auto flex-shrink-0 rounded-xl">
                  Accept
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}