import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../services/api'

export default function AdminCommissionAuditLogsPage() {
  const { data: logsData, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-commission-audit'],
    queryFn: adminApi.getCommissionAuditLogs,
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000),
  })

  const logs = Array.isArray(logsData) ? logsData : logsData?.results || []

  if (isLoading) return (
    <>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex justify-center py-32">Loading…</div>
      </div>
    </>
  )

  if (isError) return (
    <>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="text-center py-20">
          <p className="text-red-600 text-sm">Failed to load audit logs</p>
          <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[var(--ink)] text-white text-sm rounded-xl">Retry</button>
        </div>
      </div>
    </>
  )

  return (
    <>
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

        <div className="bg-white border border-[var(--border)] rounded-2xl overflow-x-auto">
          <table className="w-full min-w-[720px]">
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
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{log.created_at ? new Date(log.created_at).toLocaleString('en-GH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-5 py-4">
                    <p className="font-medium text-[var(--ink)]">{log.seller_name}</p>
                    <p className="text-xs text-[var(--muted)]">{log.seller_email}</p>
                  </td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{log.changed_by}</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{log.old_rate}%</td>
                  <td className="px-5 py-4 font-medium text-[var(--ink)]">{log.new_rate}%</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{log.affected_products_count ?? 0}</td>
                  <td className="px-5 py-4 text-xs text-[var(--muted)] max-w-xs truncate">{log.note || log.reason || '—'}</td>
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
    </>
  )
}
