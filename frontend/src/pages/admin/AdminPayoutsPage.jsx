import { useQuery } from '@tanstack/react-query'
import { Banknote, ArrowRight, MailWarning, MailCheck } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'

export default function AdminPayoutsPage() {
  const { data: settlements, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-settlements'],
    queryFn: async () => {
      const res = await api.get('/admin/settlements/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  })

  const { data: finance } = useQuery({
    queryKey: ['admin-finance'],
    queryFn: async () => {
      const res = await api.get('/admin/finance/')
      return res.data
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  })

  const { data: emailFailures } = useQuery({
    queryKey: ['admin-email-failures'],
    queryFn: async () => {
      const res = await api.get('/admin/email-logs/', { params: { failed: 1 } })
      const list = Array.isArray(res.data) ? res.data : res.data.results || []
      return list.slice(0, 5)
    },
    retry: 1,
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  if (isError) return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="text-center py-20">
        <p className="text-red-600 text-sm">Failed to load settlements</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[var(--ink)] text-white text-sm rounded-xl">Retry</button>
      </div>
    </div>
  )

  const settledTotal = (settlements || [])
    .filter(s => s.status === 'settled')
    .reduce((acc, s) => acc + parseFloat(s.net_share || 0), 0)
  const commissionTotal = (settlements || [])
    .filter(s => s.status === 'settled')
    .reduce((acc, s) => acc + parseFloat(s.commission || 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 bg-[var(--ink)] rounded-xl flex items-center justify-center text-white">
          <Banknote size={20} />
        </div>
        <div>
          <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Settlements</h1>
          <p className="text-sm text-[var(--muted)]">Instant Paystack split payouts — sellers are paid straight to their own accounts</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--off)] rounded-2xl p-6">
          <p className="text-xs text-[var(--muted)]">Settled to sellers</p>
          <p className="text-2xl font-bold text-[var(--ink)]">GHS {settledTotal.toFixed(2)}</p>
        </div>
        <div className="bg-[var(--off)] rounded-2xl p-6">
          <p className="text-xs text-[var(--muted)]">Commission earned</p>
          <p className="text-2xl font-bold text-[var(--ink)]">GHS {commissionTotal.toFixed(2)}</p>
        </div>
        <div className="bg-[var(--ink)] rounded-2xl p-6 text-white">
          <p className="text-xs text-white/50">My platform net</p>
          <p className="text-2xl font-bold">GHS {parseFloat(finance?.totals?.platform || 0).toFixed(2)}</p>
        </div>
        <div className="bg-[var(--off)] rounded-2xl p-6">
          <p className="text-xs text-[var(--muted)]">Gateway fees</p>
          <p className="text-2xl font-bold text-[var(--ink)]">GHS {parseFloat(finance?.totals?.fees || 0).toFixed(2)}</p>
        </div>
      </div>

      {/* Email failures — never a mystery again */}
      {emailFailures?.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 mb-6">
          <p className="flex items-center gap-2 text-sm font-semibold text-rose-700 mb-3">
            <MailWarning size={15} /> {emailFailures.length} recent email failure{emailFailures.length > 1 ? 's' : ''} — buyers/sellers may not have been notified
          </p>
          <div className="space-y-1.5">
            {emailFailures.map(e => (
              <p key={e.id} className="text-xs text-rose-600">
                {e.created_at ? new Date(e.created_at).toLocaleString('en-GH') : ''} · {e.kind || 'email'} → {e.to_email} · {e.error || 'failed'}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Per-order money flow: charged → sellers → platform */}
      {finance?.rows?.length > 0 && (
        <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <MailCheck size={15} className="text-[var(--muted)]" />
            <h2 className="serif text-xl font-medium text-[var(--ink)]">Order money flow</h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {finance.rows.map(r => (
              <div key={r.order_id} className="px-6 py-3.5 text-sm flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[var(--ink)]">Order #{r.order_id}</span>
                <span className="text-xs text-[var(--muted)]">
                  Charged GHS {parseFloat(r.charged ?? 0).toFixed(2)} · Sellers GHS {parseFloat(r.sellers_net ?? 0).toFixed(2)} ·
                  Fee GHS {parseFloat(r.paystack_fee ?? 0).toFixed(2)}{r.fee_estimated ? ' (est.)' : ''} ·{' '}
                  <strong className="text-green-700">Mine: GHS {parseFloat(r.platform_net ?? 0).toFixed(2)}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!settlements?.length ? (
        <div className="text-center py-20 bg-white border border-[var(--border)] rounded-2xl">
          <p className="text-sm text-[var(--muted)]">No settlements yet — they appear here once buyers pay</p>
        </div>
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="divide-y divide-[var(--border)]">
            {settlements.map(s => (
              <div key={s.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm">
                  <p className="font-semibold text-[var(--ink)] flex items-center gap-2">
                    Order #{s.order} <ArrowRight size={13} className="text-[var(--muted)]" /> {s.seller_name || s.seller_email || `Seller #${s.seller || ''}`}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-1">
                    Gross GHS {parseFloat(s.gross_share ?? 0).toFixed(2)} · Commission GHS {parseFloat(s.commission ?? 0).toFixed(2)} ·
                    Fee slice GHS {parseFloat(s.fee_slice ?? 0).toFixed(2)} · Net <strong>GHS {parseFloat(s.net_share ?? 0).toFixed(2)}</strong>
                  </p>
                  <p className="text-[11px] text-[var(--muted)] mt-0.5">
                    {s.subaccount_code || '—'} · {s.paystack_reference || '—'} · {s.created_at ? new Date(s.created_at).toLocaleString('en-GH') : ''}
                  </p>
                </div>
                <span className={`text-xs font-semibold capitalize px-2.5 py-1 rounded-full ${
                  s.status === 'settled' ? 'bg-green-50 text-green-600'
                  : s.status === 'failed' ? 'bg-rose-50 text-rose-600'
                  : 'bg-amber-50 text-amber-600'
                }`}>{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
