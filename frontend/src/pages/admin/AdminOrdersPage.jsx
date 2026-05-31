import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Package } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import api from '../../services/api'

const STATUS_VARIANTS = {
  pending: 'warning', accepted: 'info', picked_up: 'info',
  delivered: 'success', cancelled: 'danger', failed: 'danger',
}

export default function AdminOrdersPage() {
  const [statusFilter, setStatusFilter] = useState('')

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? { status: statusFilter } : {}
      const res = await api.get('/admin/orders/', { params })
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
  })

  const statuses = ['', 'pending', 'accepted', 'picked_up', 'delivered', 'cancelled', 'failed']

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="serif text-4xl font-medium text-[var(--ink)]">All Orders</h1>
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
            {s === '' ? 'All' : s.replace('_', ' ').replace(/^\w/, c => c.toUpperCase())}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
        {!orders?.length ? (
          <div className="text-center py-16">
            <Package size={32} className="mx-auto text-[var(--border)] mb-3" />
            <p className="text-sm text-[var(--muted)]">No orders found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[var(--off)] border-b border-[var(--border)]">
              <tr>
                {['Order', 'Buyer', 'Driver', 'Items', 'Total', 'Status', 'Date'].map(h => (
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
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{order.buyer_name}</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{order.driver_name || '—'}</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{order.items?.length || 0}</td>
                  <td className="px-5 py-4 text-sm font-semibold">GHS {parseFloat(order.total).toFixed(2)}</td>
                  <td className="px-5 py-4">
                    <Badge variant={STATUS_VARIANTS[order.status] || 'default'}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-xs text-[var(--muted)]">
                    {new Date(order.created_at).toLocaleDateString('en-GH')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}