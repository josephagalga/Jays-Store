import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import MainLayout from '../../layouts/MainLayout'
import { DataTable } from '../../components/shared/DataTable'
import { StatCard } from '../../components/shared/StatCard'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { Plus } from 'lucide-react'
import { sellerApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function SellerPayoutsPage() {
  const qc = useQueryClient()
  const [showRequestForm, setShowRequestForm] = useState(false)
  const [amount, setAmount] = useState('')

  const { data: wallet, isLoading: walletLoading } = useQuery({
    queryKey: ['seller-wallet'],
    queryFn: () => sellerApi.getWallet(),
    staleTime: 1000 * 60 * 5,
  })

  const { data: payouts } = useQuery({
    queryKey: ['seller-payouts'],
    queryFn: () => sellerApi.getPayouts({}),
    staleTime: 1000 * 60 * 5,
  })

  const requestMutation = useMutation({
    mutationFn: (amount) => sellerApi.requestPayout(amount),
    onSuccess: () => {
      qc.invalidateQueries(['seller-payouts'])
      qc.invalidateQueries(['seller-wallet'])
      setAmount('')
      setShowRequestForm(false)
      toast.success('Payout requested! It will be processed within 24 hours.')
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Could not request payout')
    },
  })

  if (walletLoading) return (
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
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">My Payouts</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Instant settlements from Paystack. Request withdrawals to your payout account.</p>
          </div>
          <button
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"
          >
            <Plus size={16} /> Request Payout
          </button>
        </div>

        {/* Wallet Summary */}
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

        {/* Request Payout Form */}
        {showRequestForm && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8">
            <h3 className="serif text-xl font-medium text-amber-900 mb-4">Request Payout</h3>
            <p className="text-sm text-amber-800 mb-4">Available balance: <strong>GHS {parseFloat(wallet?.available_balance || 0).toFixed(2)}</strong></p>
            <form onSubmit={(e) => { e.preventDefault(); requestMutation.mutate(parseFloat(amount)) }} className="flex flex-col sm:flex-row gap-3 max-w-md">
              <div className="flex-1">
                <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-2 block">Amount (GHS)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={parseFloat(wallet?.available_balance || 0)}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-70"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <div className="flex items-end gap-2">
                <button type="submit" disabled={requestMutation.isPending} className="flex-1 px-6 py-3 bg-[var(--ink)] text-white text-sm font-semibold rounded-xl hover:opacity-80 transition-opacity disabled:opacity-50">
                  {requestMutation.isPending ? 'Requesting…' : 'Request Payout'}
                </button>
                <button type="button" onClick={() => { setShowRequestForm(false); setAmount('') }} className="px-6 py-3 border border-[var(--border)] text-[var(--ink)] text-sm font-semibold rounded-xl hover:bg-[var(--off)] transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Payout History */}
        <DataTable
          columns={[
            { key: 'id', label: 'Reference', width: '160px' },
            { key: 'requested_at', label: 'Requested', width: '160px', render: (v) => new Date(v).toLocaleString('en-GH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
            { key: 'amount', label: 'Amount', width: '120px', render: (v) => `GHS ${parseFloat(v).toFixed(2)}` },
            { key: 'status', label: 'Status', width: '140px', render: (v) => <StatusBadge status={v} /> },
            { key: 'completed_at', label: 'Completed', width: '160px', render: (v) => v ? new Date(v).toLocaleDateString('en-GH', { day: '2-digit', month: 'short', year: 'numeric' }) : '-' },
          ]}
          data={payouts || []}
          keyField="id"
          emptyMessage="No payouts requested yet"
        />
      </div>
    </MainLayout>
  )
}
