import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/DataTable'
import { adminApi } from '../../services/api'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminNewsletterPage() {
  const qc = useQueryClient()

  const { data: subscribersData, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-newsletter'],
    queryFn: adminApi.getNewsletterSubscribers,
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  })

  const subscribers = Array.isArray(subscribersData) ? subscribersData : subscribersData?.results || []

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/accounts/admin/newsletter/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries(['admin-newsletter'])
      toast.success('Subscriber removed')
    },
    onError: () => toast.error('Failed to remove subscriber'),
  })


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
          <p className="text-red-600 text-sm">Failed to load subscribers</p>
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
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Newsletter Subscribers</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Manage newsletter subscribers</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"
          >
            Refresh
          </button>
        </div>

        <DataTable
          columns={[
            { key: 'email', label: 'Email', width: '300px', render: (v) => <p className="font-medium text-[var(--ink)] break-all">{v}</p> },
            { key: 'is_active', label: 'Status', width: '120px', render: (v) => <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full whitespace-nowrap ${v ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{v ? 'Active' : 'Inactive'}</span> },
            { key: 'created_at', label: 'Subscribed', width: '160px', render: (v) => v ? new Date(v).toLocaleString('en-GH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
            { key: 'actions', label: '', width: '110px', render: (v, row) => (
              <button
                onClick={() => deleteMutation.mutate(row.id)}
                disabled={deleteMutation.isPending}
                className="px-3 py-2 min-h-[44px] text-xs text-rose-600 hover:text-rose-700 transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            )},
          ]}
          data={subscribers || []}
          keyField="id"
          emptyMessage="No subscribers yet"
        />
      </div>
    </>
  )
}
