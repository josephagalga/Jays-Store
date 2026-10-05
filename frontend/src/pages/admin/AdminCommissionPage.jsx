import { useQuery } from '@tanstack/react-query'
import { TrendingUp, History, AlertCircle } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'

export default function AdminCommissionPage() {
  // Fetch all sellers
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users/')
      return res.data
    },
  })

  // Fetch commission audit logs (history of the retired per-seller rates)
  const { data: auditLogs } = useQuery({
    queryKey: ['commission-audit-logs'],
    queryFn: async () => {
      const res = await api.get('/admin/commission-audit-logs/')
      return res.data || []
    },
  })

  const sellers = users?.filter(u => u.role === 'seller') || []

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-2">
          Commission Rates
        </h1>
        <p className="text-[var(--muted)] text-sm">
          Fixed for everyone. Commission is added on top of seller&apos;s price and paid by buyers.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Fixed two-tier commission (buyer-pays model)</p>
          <p>
            Products under GHS 100 (seller net) carry 10% — e.g. list 50 GHS, buyers pay 55 GHS,
            you keep 5 GHS. Products of GHS 100 or more carry 5% — e.g. list 150 GHS,
            buyers pay 157.50 GHS. Sellers always receive exactly what they list.
          </p>
        </div>
      </div>

      {/* Sellers Table */}
      <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-[var(--off)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  Seller
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  Store
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  Products
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  Tier
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sellers.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-[var(--muted)]">
                    No sellers found
                  </td>
                </tr>
              ) : (
                sellers.map((seller) => (
                  <tr key={seller.id} className="hover:bg-[var(--off)]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-[var(--ink)]">{seller.full_name}</p>
                        <p className="text-xs text-[var(--muted)]">{seller.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-[var(--ink)]">{seller.store_name || '-'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-[var(--ink)]">
                        {seller.seller_total_products || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg">
                          <TrendingUp size={14} />
                          <span className="font-semibold">10% / 5%</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
          <History size={20} className="text-[var(--muted)]" />
          <h2 className="font-semibold text-[var(--ink)]">Rate Change History</h2>
        </div>
        <div className="overflow-x-auto">
          {!auditLogs || auditLogs.length === 0 ? (
            <div className="px-6 py-12 text-center text-[var(--muted)]">
              No commission rate changes yet
            </div>
          ) : (
            <table className="w-full min-w-[640px]">
              <thead className="bg-[var(--off)] border-b border-[var(--border)]">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Seller</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Change</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Retroactive</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Products Affected</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[var(--muted)] uppercase">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[var(--off)]/50">
                    <td className="px-6 py-3 text-sm text-[var(--muted)]">
                      {new Date(log.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-[var(--ink)]">{log.seller_name}</p>
                      <p className="text-xs text-[var(--muted)]">{log.seller_email}</p>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="text-sm">
                        <span className="text-red-600 font-medium">{log.old_rate}%</span>
                        {' → '}
                        <span className="text-green-600 font-medium">{log.new_rate}%</span>
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {log.apply_to_existing ? (
                        <span className="inline-flex items-center px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-center text-sm text-[var(--ink)]">
                      {log.affected_products_count}
                    </td>
                    <td className="px-6 py-3 text-sm text-[var(--muted)]">
                      {log.reason || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
