import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import { RefreshCw } from 'lucide-react'
import { DataTable } from '../../components/shared/DataTable'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { adminApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminPayoutActionsPage() {
  const qc = useQueryClient()

  const { data: payouts, isLoading, refetch } = useQuery({
    queryKey: ['admin-payouts'],
    queryFn: () => adminApi.getPayouts({}),
    staleTime: 1000 * 60 * 5,
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }) => adminApi.updatePayout(id, action),
    onSuccess: () => {
      qc.invalidateQueries(['admin-payouts'])
      toast.success('Payout updated')
    },
    onError: () => toast.error('Failed to update payout'),
  })

  if (isLoading) return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex justify-center py-32">Loading…</div>
      </div>
    </MainLayout>
  )

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
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Payout Actions</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Review and approve/reject seller payout requests</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>

        <DataTable
          columns={[
            { key: 'id', label: 'Reference', width: '160px' },
            { key: 'seller_name', label: 'Seller', width: '200px', render: (v, row) => (
              <div>
                <p className="font-medium text-[var(--ink)]">{v}</p>
                <p className="text-xs text-[var(--muted)]">{row.seller_email}</p>
              </div>
            )},
            { key: 'amount', label: 'Amount', width: '120px', render: (v) => `GHS ${parseFloat(v).toFixed(2)}` },
            { key: 'status', label: 'Status', width: '140px', render: (v) => <StatusBadge status={v} /> },
            { key: 'requested_at', label: 'Requested', width: '160px', render: (v) => new Date(v).toLocaleString('en-GH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
            { key: 'processed_at', label: 'Processed', width: '160px', render: (v) => v ? new Date(v).toLocaleString('en-GH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-' },
            { key: 'actions', label: 'Actions', width: '180px', render: (v, row) => (
              <div className="flex items-center gap-2">
                {row.status === 'pending' && (
                  <>
                    <button
                      onClick={() => actionMutation.mutate({ id: row.id, action: 'approve' })}
                      disabled={actionMutation.isPending}
                      className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-semibold rounded-xl hover:bg-green-100 transition-colors"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => actionMutation.mutate({ id: row.id, action: 'reject' })}
                      disabled={actionMutation.isPending}
                      className="px-3 py-1.5 bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl hover:bg-rose-100 transition-colors"
                    >
                      Reject
                    </button>
                  </>
                )}
                {row.status !== 'pending' && (
                  <span className="text-xs text-[var(--muted)]">Processed</span>
                )}
              </div>
            )},
          ]}
          data={payouts || []}
          keyField="id"
          emptyMessage="No payout requests found"
        />
      </div>
    </MainLayout>
  )
}
