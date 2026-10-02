import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle, XCircle, Truck, Package, MapPin, Phone, Navigation } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function DriverHistoryPage() {
  const qc = useQueryClient()
  const [otpInputs, setOtpInputs] = useState({})

  const { data: orders, isLoading } = useQuery({
    queryKey: ['driver-history'],
    queryFn: async () => {
      const res = await api.get('/driver/history/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
    refetchInterval: 30000,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/driver/orders/${id}/status/`, { status }),
    onSuccess: () => {
      qc.invalidateQueries(['driver-history'])
      qc.invalidateQueries(['driver-active'])
      toast.success('Order updated')
    },
    onError: (err) => {
      const msg = err.response?.data?.error || err.response?.data?.detail || err.response?.data?.status?.[0] || 'Failed to update'
      toast.error(msg)
    },
  })

  const otpMutation = useMutation({
    mutationFn: ({ id, code }) => api.verifyDeliveryOtp(id, code),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries(['driver-history'])
      toast.success('OTP verified — you can now mark as delivered')
      setOtpInputs(prev => ({ ...prev, [vars.id]: '' }))
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Invalid OTP'),
  })

  const STATUS_ICONS = {
    accepted: <Truck size={14} className="text-blue-500" />,
    picked_up: <Truck size={14} className="text-amber-500" />,
    delivered: <CheckCircle size={14} className="text-green-500" />,
    failed: <XCircle size={14} className="text-rose-500" />,
  }

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  const active = orders?.filter(o => ['accepted', 'picked_up'].includes(o.status)) || []
  const past = orders?.filter(o => !['accepted', 'picked_up'].includes(o.status)) || []

  const renderCard = (order) => {
    const isActive = ['accepted', 'picked_up'].includes(order.status)
    return (
      <div key={order.id} className="bg-white border border-[var(--border)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--muted)]">Order #{order.id}</span>
            <span className="flex items-center gap-1.5 text-xs font-medium capitalize">
              {STATUS_ICONS[order.status]}
              {order.status.replace('_', ' ')}
            </span>
            {order.otp_verified && (
              <span className="text-[10px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                OTP ✓
              </span>
            )}
          </div>
          <p className="text-xs text-[var(--muted)]">
            {order.item_count ?? order.items?.length ?? ''} item(s)
          </p>
        </div>

        <div className="text-sm text-[var(--muted)] mb-4">
          {order.created_at && new Date(order.created_at).toLocaleDateString('en-GH', {
            day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </div>

        {/* Drop-off details — visible after accept */}
        {(order.delivery_address || order.buyer_phone) && (
          <div className="bg-[var(--off)] rounded-xl p-4 mb-4 space-y-2 text-sm">
            {order.delivery_address && (
              <p className="flex items-start gap-2 text-[var(--ink)]">
                <MapPin size={14} className="flex-shrink-0 mt-0.5 text-[var(--muted)]" />
                <span className="font-medium">{order.delivery_address}</span>
              </p>
            )}
            {order.delivery_landmark && (
              <p className="flex items-start gap-2 text-[var(--ink)]">
                <Navigation size={14} className="flex-shrink-0 mt-0.5 text-[var(--muted)]" />
                <span>Landmark: <strong>{order.delivery_landmark}</strong></span>
              </p>
            )}
            {order.buyer_phone && (
              <p className="flex items-center gap-2">
                <Phone size={14} className="text-[var(--muted)]" />
                <a href={`tel:${order.buyer_phone}`} className="font-medium text-[var(--ink)] hover:underline">
                  {order.buyer_phone}
                </a>
              </p>
            )}
            {order.delivery_note && (
              <p className="text-xs text-[var(--muted)] italic">Note: {order.delivery_note}</p>
            )}
          </div>
        )}

        {order.items?.length > 0 && (
          <div className="text-xs text-[var(--muted)] mb-4">
            {order.item_count ?? order.items.length} item(s) · GHS {parseFloat(order.total || 0).toFixed(2)} order value
          </div>
        )}

        {/* Active order actions */}
        {order.status === 'accepted' && (
          <Button size="sm" onClick={() => statusMutation.mutate({ id: order.id, status: 'picked_up' })}>
            Mark as Picked Up
          </Button>
        )}
        {order.status === 'picked_up' && (
          <div className="space-y-3">
            {/* OTP input — required for ALL orders before delivery */}
            {!order.otp_verified && (
              <div className="flex gap-2 items-center bg-amber-50 border border-amber-100 rounded-xl p-3">
                <input
                  value={otpInputs[order.id] || ''}
                  onChange={e => setOtpInputs(prev => ({ ...prev, [order.id]: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="4-digit OTP"
                  inputMode="numeric"
                  maxLength={4}
                  className="w-32 px-3 py-2 text-sm text-center tracking-widest font-bold rounded-lg border border-amber-200 bg-white outline-none"
                />
                <Button size="sm" loading={otpMutation.isPending}
                  onClick={() => {
                    const code = otpInputs[order.id] || ''
                    if (code.length !== 4) return toast.error('Enter the 4-digit OTP from the buyer')
                    otpMutation.mutate({ id: order.id, code })
                  }}>
                  Verify OTP
                </Button>
              </div>
            )}
            <p className="text-xs text-[var(--muted)]">
              Ask the buyer for the 4-digit OTP sent to their email/SMS, verify it above, then mark as delivered.
            </p>
            <Button size="sm" onClick={() => statusMutation.mutate({ id: order.id, status: 'delivered' })}>
              Mark as Delivered
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
      <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-2">My Deliveries</h1>
      <p className="text-sm text-[var(--muted)] mb-10">Active drop-offs with OTP verification, plus history.</p>

      {!orders?.length ? (
        <div className="text-center py-24 border border-dashed border-[var(--border)] rounded-2xl">
          <Package size={40} className="mx-auto text-[var(--border)] mb-4" />
          <p className="serif text-2xl font-medium text-[var(--ink)] mb-2">No deliveries yet</p>
          <p className="text-sm text-[var(--muted)]">Your accepted orders will appear here</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
                Active ({active.length})
              </h2>
              <div className="space-y-4 mb-10">
                {active.map(renderCard)}
              </div>
            </>
          )}
          {past.length > 0 && (
            <>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted)] mb-4">
                History ({past.length})
              </h2>
              <div className="space-y-4">
                {past.map(renderCard)}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
