import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, Edit2, Save, X, History, AlertCircle } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminCommissionPage() {
  const qc = useQueryClient()
  const [editingSeller, setEditingSeller] = useState(null)
  const [newRate, setNewRate] = useState('')
  const [applyToExisting, setApplyToExisting] = useState(false)
  const [reason, setReason] = useState('')

  // Fetch all sellers
  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const res = await api.get('/admin/users/')
      return res.data
    },
  })

  // Fetch commission audit logs
  const { data: auditLogs } = useQuery({
    queryKey: ['commission-audit-logs'],
    queryFn: async () => {
      const res = await api.get('/admin/commission-audit-logs/')
      return res.data || []
    },
  })

  // Update commission rate mutation
  const updateMutation = useMutation({
    mutationFn: async ({ sellerId, rate, applyExisting, reason }) => {
      const res = await api.patch(`/admin/users/${sellerId}/commission-rate/`, {
        commission_rate: rate,
        apply_to_existing: applyExisting,
        reason: reason,
      })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries(['admin-users'])
      qc.invalidateQueries(['commission-audit-logs'])
      setEditingSeller(null)
      setNewRate('')
      setApplyToExisting(false)
      setReason('')
      toast.success('Commission rate updated successfully')
    },
    onError: (err) => {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update commission rate'
      toast.error(msg)
    },
  })

  const sellers = users?.filter(u => u.role === 'seller') || []

  const startEdit = (seller) => {
    setEditingSeller(seller.id)
    setNewRate(seller.commission_rate?.toString() || '10.00')
    setApplyToExisting(false)
    setReason('')
  }

  const cancelEdit = () => {
    setEditingSeller(null)
    setNewRate('')
    setApplyToExisting(false)
    setReason('')
  }

  const saveCommission = (seller) => {
    const rate = parseFloat(newRate)
    if (isNaN(rate) || rate < 0 || rate > 30) {
      toast.error('Commission rate must be between 0 and 30')
      return
    }
    
    if (rate === parseFloat(seller.commission_rate || 10)) {
      toast.error('Rate is the same as current rate')
      return
    }

    updateMutation.mutate({
      sellerId: seller.id,
      rate: newRate,
      applyExisting: applyToExisting,
      reason: reason.trim(),
    })
  }

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
          Commission Rate Management
        </h1>
        <p className="text-[var(--muted)] text-sm">
          Manage commission rates for sellers. Commission is added on top of seller's price and paid by buyers.
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">How Commission Works (Buyer-Pays Model)</p>
          <p>
            When a seller lists a product at 50 GHS with 10% commission, buyers pay 55 GHS. 
            The seller receives 50 GHS (full amount), and the platform keeps 5 GHS commission.
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
                  Commission Rate
                </th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sellers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-[var(--muted)]">
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
                      {editingSeller === seller.id ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="30"
                              value={newRate}
                              onChange={(e) => setNewRate(e.target.value)}
                              className="w-24 px-3 py-1.5 border border-[var(--border)] rounded-lg text-center text-sm"
                              placeholder="10.00"
                            />
                            <span className="text-sm text-[var(--muted)]">%</span>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="checkbox"
                              id={`apply-${seller.id}`}
                              checked={applyToExisting}
                              onChange={(e) => setApplyToExisting(e.target.checked)}
                              className="rounded"
                            />
                            <label htmlFor={`apply-${seller.id}`} className="text-xs text-[var(--muted)] cursor-pointer">
                              Apply to existing products
                            </label>
                          </div>
                          <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason (optional)"
                            className="w-full px-3 py-1.5 border border-[var(--border)] rounded-lg text-xs"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg">
                            <TrendingUp size={14} />
                            <span className="font-semibold">{seller.commission_rate || '10.00'}%</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {editingSeller === seller.id ? (
                          <>
                            <button
                              onClick={() => saveCommission(seller)}
                              disabled={updateMutation.isPending}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Save"
                            >
                              <Save size={18} />
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={updateMutation.isPending}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Cancel"
                            >
                              <X size={18} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(seller)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit commission rate"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}
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
          <h2 className="font-semibold text-[var(--ink)]">Commission Rate Change History</h2>
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
