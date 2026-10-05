import { useQuery } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import { StatCard } from '../../components/shared/StatCard'
import { sellerApi } from '../../services/api'

export default function SellerWalletPage() {
  const { data: wallet, isLoading, refetch } = useQuery({
    queryKey: ['seller-wallet'],
    queryFn: sellerApi.getWallet,
    staleTime: 1000 * 60 * 5,
  })

  if (isLoading) return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex justify-center py-32">Loading…</div>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">My Wallet</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Track your earnings, settlements, and available balance</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"
          >
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" /><path d="M3 7v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" /></svg>}
            label="Gross Revenue"
            value={`GHS ${parseFloat(wallet?.gross_revenue || 0).toFixed(2)}`}
          />
          <StatCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
            label="Commission Paid"
            value={`GHS ${parseFloat(wallet?.commission_paid || 0).toFixed(2)}`}
          />
          <StatCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>}
            label="Net Earnings"
            value={`GHS ${parseFloat(wallet?.net_earnings || 0).toFixed(2)}`}
          />
          <StatCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
            label="Available Balance"
            value={`GHS ${parseFloat(wallet?.available_balance || 0).toFixed(2)}`}
          />
        </div>

        {/* Payout Account Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Payout Account</h3>
                <p className="text-sm text-blue-700 mt-0.5">Your earnings settle instantly to this account</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-green-500/20 text-green-600 px-3 py-2 rounded-full">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" /><path d="M3 7v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" /></svg>}
            label="Gross Revenue"
            value={`GHS ${parseFloat(wallet?.gross_revenue || 0).toFixed(2)}`}
          />
          <StatCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
            label="Commission Paid"
            value={`GHS ${parseFloat(wallet?.commission_paid || 0).toFixed(2)}`}
          />
          <StatCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>}
            label="Net Earnings"
            value={`GHS ${parseFloat(wallet?.net_earnings || 0).toFixed(2)}`}
          />
          <StatCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
            label="Available Balance"
            value={`GHS ${parseFloat(wallet?.available_balance || 0).toFixed(2)}`}
          />
        </div>

        {/* Payout Account Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
                  <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">Payout Account</h3>
                <p className="text-sm text-blue-700 mt-0.5">Your earnings settle instantly to this account</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-green-500/20 text-green-600 px-3 py-2 rounded-full">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2" /><path d="M3 7v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9" /></svg>}
            label="Gross Revenue"
            value={`GHS ${parseFloat(wallet?.gross_revenue || 0).toFixed(2)}`}
          />
          <StatCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>}
            label="Commission Paid"
            value={`GHS ${parseFloat(wallet?.commission_paid || 0).toFixed(2)}`}
          />
          <StatCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>}
            label="Net Earnings"
            value={`GHS ${parseFloat(wallet?.net_earnings || 0).toFixed(2)}`}
          />
          <StatCard
            icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
            label="Available Balance"
            value={`GHS ${parseFloat(wallet?.available_balance || 0).toFixed(2)}`}
          />
        </div>

        {/* Payout Account Section */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6">
          <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-4">Payout Account</h2>
          <p className="text-sm text-[var(--muted)] mb-4">
            Your earnings settle instantly to your Paystack subaccount. Connect or update your MoMo/bank details below.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Account Name</label>
                <p className="font-medium text-[var(--ink)]">John Doe</p>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Account Number</label>
                <p className="font-medium text-[var(--ink)]">024****1234</p>
              </div>
              <div className="flex-1">
                <label className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Bank / Network</label>
                <p className="font-medium text-[var(--ink)]">MTN Mobile Money</p>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <button className="px-6 py-3 bg-[var(--ink)] text-white rounded-xl hover:opacity-80 transition-opacity font-medium">
              Update Payout Account
            </button>
          </div>
        </div>

        {/* Settlement History */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="serif text-2xl font-medium text-[var(--ink)]">Recent Settlements</h2>
          </div>
          <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[var(--off)] border-b border-[var(--border)]">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Order</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Date</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Gross</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Commission</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Delivery Fee</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Net</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                <tr>
                  <td className="px-5 py-4 text-sm font-medium">#1234</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">15 Jan 2025, 14:30</td>
                  <td className="px-5 py-4 text-sm text-[var(--ink)]">GHS 150.00</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">GHS 15.00</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">GHS 5.00</td>
                  <td className="px-5 py-4 text-sm font-semibold text-[var(--ink)]">GHS 130.00</td>
                  <td><span className="px-2.5 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full">Settled</span></td>
                </tr>
                <tr>
                  <td className="px-5 py-4 text-sm font-medium">#1233</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">14 Jan 2025, 10:15</td>
                  <td className="px-5 py-4 text-sm text-[var(--ink)]">GHS 89.00</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">GHS 8.90</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">GHS 5.00</td>
                  <td className="px-5 py-4 text-sm font-semibold text-[var(--ink)]">GHS 75.10</td>
                  <td><span className="px-2.5 py-1 bg-green-50 text-green-600 text-xs font-semibold rounded-full">Settled</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
