import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { StatCard } from '../../components/shared/StatCard'
import { sellerApi } from '../../services/api'

const money = (v) => `GHS ${parseFloat(v || 0).toFixed(2)}`

export default function SellerWalletPage() {
  const { data: wallet, isLoading: walletLoading, isError: walletError, refetch } = useQuery({
    queryKey: ['seller-wallet'],
    queryFn: sellerApi.getWallet,
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  })

  const { data: settlementsData } = useQuery({
    queryKey: ['seller-settlements'],
    queryFn: () => sellerApi.getSettlements({}),
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  })

  const settlements = Array.isArray(settlementsData) ? settlementsData : settlementsData?.results || []

  if (walletLoading) return (
    <>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex justify-center py-32">Loading…</div>
      </div>
    </>
  )

  if (walletError) return (
    <>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
        <div className="text-center py-20">
          <p className="text-red-600 text-sm">Failed to load wallet</p>
          <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[var(--ink)] text-white text-sm rounded-xl">Retry</button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">My Wallet</h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              Your share of every sale is allocated at checkout — no withdrawals needed.
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <StatCard label="Gross Revenue" value={money(wallet?.gross_revenue)} />
          <StatCard label="Net Earnings" value={money(wallet?.net_earnings)} />
          <StatCard label="Delivery Earned" value={money(wallet?.delivery_earned)} />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-8 text-sm text-blue-800">
          <strong>{wallet?.settled_orders || 0} settled order{(wallet?.settled_orders || 0) === 1 ? '' : 's'}.</strong>
          {' '}Paystack sends each payout to your account in <strong>1–2 business days</strong>
          (weekend/holiday sales arrive the next business day). A newly connected or changed payout
          account may be held once for Paystack&apos;s verification. Manage your MoMo/bank details in{' '}
          <Link to="/seller/dashboard" className="underline font-medium">Seller Dashboard</Link>.
        </div>

        <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-4">Recent Settlements</h2>
        {!settlements?.length ? (
          <div className="text-center py-16 border border-dashed border-[var(--border)] rounded-2xl">
            <p className="text-sm text-[var(--muted)]">No settlements yet — they appear here once buyers pay.</p>
          </div>
        ) : (
          <div className="bg-white border border-[var(--border)] rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-[var(--off)] border-b border-[var(--border)]">
                <tr>
                  {['Order', 'Gross', 'Delivery', 'Net', 'Status'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {settlements.slice(0, 20).map(s => (
                  <tr key={s.id}>
                    <td className="px-5 py-4 text-sm font-medium text-[var(--ink)]">#{s.order}</td>
                    <td className="px-5 py-4 text-sm text-[var(--ink)]">{money(s.gross_share)}</td>
                    <td className="px-5 py-4 text-sm text-[var(--muted)]">{money(s.delivery_share)}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-[var(--ink)]">{money(s.net_share)}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full capitalize ${
                        s.status === 'settled' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>{s.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
