import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Package, Truck, CheckCircle, BellRing } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import toast from 'react-hot-toast'

const STATUS_LABEL = {
  pending: 'Pending',
  accepted: 'Accepted',
  picked_up: 'Picked Up',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Failed',
}

function HandoffConfirm({ orderId, onDone }) {
  const [code, setCode] = useState('')
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (otp) => api.post(`/orders/${orderId}/confirm-handoff/`, { code: otp }),
    onSuccess: (res) => {
      toast.success(res.data?.message || 'Handoff confirmed')
      qc.invalidateQueries(['seller-orders'])
      setCode('')
      onDone?.(res.data)
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Could not confirm handoff')
    },
  })

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (code.trim()) mutation.mutate(code.trim()) }}
      className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4"
    >
      <p className="text-sm font-medium text-amber-800 mb-1">You deliver this order yourself</p>
      <p className="text-xs text-amber-700 mb-3">Ask the buyer for their 4-digit delivery code, enter it below to confirm the handoff.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="····"
          aria-label="Delivery code"
          className="flex-1 px-4 py-3 min-h-[48px] text-center text-xl font-bold tracking-[0.3em] rounded-xl border border-amber-200 bg-white outline-none focus:border-amber-500 placeholder:text-[var(--border)]"
        />
        <Button type="submit" loading={mutation.isPending} className="rounded-xl sm:w-auto w-full">
          Confirm handoff
        </Button>
      </div>
    </form>
  )
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

  // Inbox: paid orders needing your handoff pin first; anything paid since
  // the last visit gets a NEW SALE badge. Seen-marker is per-browser.
  const [seenAt, setSeenAt] = useState(() => {
    try { return parseInt(localStorage.getItem('jays-inbox-seen-seller') || '0', 10) || 0 }
    catch { return 0 }
  })
  useEffect(() => {
    if (!orders?.length) return
    const t = setTimeout(() => {
      try { localStorage.setItem('jays-inbox-seen-seller', String(Date.now())) } catch { /* ignore */ }
      setSeenAt(Date.now())
    }, 5000)
    return () => clearTimeout(t)
  }, [orders?.length])

  const needsAction = (o) =>
    o.payment_status === 'paid' && o.my_handoff === 'pending' &&
    o.status !== 'cancelled' && o.status !== 'delivered'
  const actionCount = useMemo(() => (orders || []).filter(needsAction).length, [orders])
  const sorted = useMemo(() => {
    const rank = (o) => {
      if (needsAction(o)) return 0
      if (o.payment_status === 'paid') return 1
      return 2
    }
    return [...(orders || [])].sort((a, b) =>
      rank(a) - rank(b) || new Date(b.created_at) - new Date(a.created_at))
  }, [orders])
  const isNewSale = (o) => {
    if (o.payment_status !== 'paid') return false
    try { return new Date(o.created_at).getTime() > seenAt } catch { return false }
  }

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-2">My Orders</h1>
      <p className="text-sm text-[var(--muted)] mb-6">Track deliveries for your products, including driver info. New sales land here — no email needed.</p>

      {actionCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
          <BellRing size={18} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-bold">{actionCount} order{actionCount === 1 ? '' : 's'} need{actionCount === 1 ? 's' : ''} your handoff</span>
            {' '}— ask the buyer for their delivery code below. Payouts land in your wallet.
          </p>
        </div>
      )}

      {!orders?.length ? (
        <div className="text-center py-24 border border-dashed border-[var(--border)] rounded-2xl">
          <Package size={40} className="mx-auto text-[var(--border)] mb-4" />
          <p className="serif text-2xl font-medium text-[var(--ink)]">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sorted.map(order => (
            <div key={order.id} className="bg-white border border-[var(--border)] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-[var(--muted)]">Order #{order.id}</span>
                <span className="flex items-center gap-2">
                  {isNewSale(order) && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-green-600 text-white rounded-full">
                      New sale
                    </span>
                  )}
                  <span className="text-xs font-medium capitalize px-2.5 py-1 bg-[var(--off)] rounded-full">
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
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
              {order.my_handoff === 'pending' && order.payment_status === 'paid' && order.status !== 'cancelled' && order.status !== 'delivered' && (
                <HandoffConfirm orderId={order.id} />
              )}
              {order.my_handoff === 'confirmed' && (
                <p className="mt-3 text-xs font-medium text-green-600">✓ Your handoff is confirmed</p>
              )}
              {!order.needs_driver && order.status !== 'delivered' && order.status !== 'cancelled' && (
                <p className="mt-2 text-[11px] text-[var(--muted)]">Self-delivery order — no driver assigned.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
