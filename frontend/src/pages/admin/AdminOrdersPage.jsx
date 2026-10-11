import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Package, AlertTriangle } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import api from '../../services/api'
import toast from 'react-hot-toast'

const STATUS_VARIANTS = {
  pending: 'warning', accepted: 'info', picked_up: 'info', shipped: 'info',
  in_transit: 'info', delivered: 'success', cancelled: 'danger', failed: 'danger',
  refunded: 'default', paid: 'success',
}

const fmtStatus = (s) => (s || 'unknown').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [confirmRefund, setConfirmRefund] = useState(null)
  const qc = useQueryClient()

  const { data: orders, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? { status: statusFilter } : {}
      const res = await api.get('/admin/orders/', { params })
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  })

  const refundMutation = useMutation({
    mutationFn: (id) => api.post(`/admin/orders/${id}/refund/`, {}),
    onSuccess: (res) => {
      qc.invalidateQueries(['admin-orders'])
      qc.invalidateQueries(['admin-dashboard'])
      qc.invalidateQueries(['admin-finance'])
      toast.success(res.data?.message || 'Order refunded')
      setConfirmRefund(null)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Refund failed'),
  })

  const statuses = ['', 'pending', 'accepted', 'picked_up', 'in_transit', 'shipped', 'delivered', 'cancelled', 'failed', 'refunded']

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  if (isError) return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="text-center py-20">
        <p className="text-red-600 text-sm">Failed to load orders</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[var(--ink)] text-white text-sm rounded-xl">Retry</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">All Orders</h1>
        <span className="text-sm text-[var(--muted)]">{orders?.length || 0} orders</span>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {statuses.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 text-xs font-medium rounded-full border transition-all ${
              statusFilter === s
                ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                : 'bg-white text-[var(--muted)] border-[var(--border)] hover:border-[var(--ink)]'
            }`}>
            {s === '' ? 'All' : fmtStatus(s)}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[var(--border)] rounded-2xl overflow-x-auto">
        {!orders?.length ? (
          <div className="text-center py-16">
            <Package size={32} className="mx-auto text-[var(--border)] mb-3" />
            <p className="text-sm text-[var(--muted)]">No orders found</p>
          </div>
        ) : (
          <table className="w-full min-w-[640px]">
            <thead className="bg-[var(--off)] border-b border-[var(--border)]">
              <tr>
                {['Order', 'Buyer', 'Driver', 'Items', 'Total', 'Status', 'Payment', 'Date', 'Action'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-[var(--off)] transition-colors">
                  <td className="px-5 py-4 text-sm font-semibold text-[var(--ink)]">#{order.id}</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{order.buyer_name || order.buyer_email || '—'}</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{order.driver_name || '—'}</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{order.items?.length ?? order.item_count ?? 0}</td>
                  <td className="px-5 py-4 text-sm font-semibold">GHS {parseFloat(order.total ?? 0).toFixed(2)}</td>
                  <td className="px-5 py-4">
                    <Badge variant={STATUS_VARIANTS[order.status] || 'default'}>
                      {fmtStatus(order.status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant={order.payment_status === 'paid' ? 'success' : order.payment_status === 'refunded' ? 'default' : 'warning'}>
                      {fmtStatus(order.payment_status)}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-xs text-[var(--muted)]">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString('en-GH') : '—'}
                  </td>
                  <td className="px-5 py-4">
                    {order.payment_status === 'paid' ? (
                      <button
                        onClick={() => setConfirmRefund(order)}
                        className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
                        Refund
                      </button>
                    ) : (
                      <span className="text-xs text-[var(--border)]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm refund modal — items total back, delivery fee excluded */}
      {confirmRefund && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmRefund(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={22} className="text-rose-500" />
            </div>
            <h2 className="serif text-2xl font-medium text-[var(--ink)] text-center mb-2">
              Refund Order #{confirmRefund.id}
            </h2>
            <p className="text-sm text-[var(--muted)] text-center mb-6">
              GHS {(parseFloat(confirmRefund.total ?? 0) - parseFloat(confirmRefund.delivery_fee ?? 0)).toFixed(2)} goes
              back to the buyer via Paystack. <strong>Delivery fee is not refunded.</strong> The driver should
              return the item to the seller.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRefund(null)}
                className="flex-1 py-2.5 border border-[var(--border)] text-sm font-medium rounded-xl hover:bg-[var(--off)] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => refundMutation.mutate(confirmRefund.id)}
                disabled={refundMutation.isPending}
                className="flex-1 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50">
                {refundMutation.isPending ? 'Refunding…' : 'Refund'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}