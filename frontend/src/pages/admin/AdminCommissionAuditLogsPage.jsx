import { useQuery } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import { adminApi } from '../../services/api'

export default function AdminCommissionAuditLogsPage() {
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['admin-commission-audit'],
    queryFn: adminApi.getCommissionAuditLogs,
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex justify-center py-32">Loading…</div>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Commission Rate Audit Log</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Track all commission rate changes across sellers</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"
          >
            Refresh
          </button>
        </div>

        <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--off)] border-b border-[var(--border)]">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Date</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Seller</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Changed By</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Old Rate</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">New Rate</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Products Affected</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs?.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--off)]/50">
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{new Date(log.created_at).toLocaleString('en-GH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-[var(--ink)]">{log.seller_store_name || log.seller_email}</p>
                    <p className="text-xs text-[var(--muted)]">@{log.seller_slug}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{log.changed_by_name || log.changed_by_email}</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{log.old_rate}%</td>
                  <td className="px-5 py-4 font-medium text-[var(--ink)]">{log.new_rate}%</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{log.products_affected || 0}</td>
                  <td className="px-5 py-4 text-xs text-[var(--muted)] max-w-xs truncate">{log.note || '—'}</td>
                </tr>
              ))}
              {(!logs || !logs.length) && (
                <tr>
                  <td colSpan="7" className="text-center py-20 text-sm text-[var(--muted)]">No commission rate changes recorded</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  )
}
