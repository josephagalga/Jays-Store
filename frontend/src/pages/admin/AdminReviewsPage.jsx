import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Eye, EyeOff } from 'lucide-react'
import { DataTable } from '../../components/shared/DataTable'
import { StatusBadge } from '../../components/shared/StatusBadge'
import { adminApi } from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminReviewsPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-reviews'],
    queryFn: () => adminApi.getReviews({}),
    staleTime: 1000 * 60 * 5,
  })

  const toggleMutation = useMutation({
    mutationFn: (id) => adminApi.toggleReview(id),
    onSuccess: (res) => {
      qc.invalidateQueries(['admin-reviews'])
      toast.success(res.data?.message || 'Review updated')
    },
    onError: () => toast.error('Could not update review'),
  })

  const reviews = Array.isArray(data) ? data : data?.results || []
  const visible = reviews.filter(r => {
    if (statusFilter === 'hidden') return r.is_visible === false
    if (statusFilter === 'visible') return r.is_visible !== false
    return true
  })

  if (isLoading) return (
    <>
      <div className="flex justify-center py-32">Loading…</div>
    </>
  )

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Review Moderation</h1>
            <p className="text-sm text-[var(--muted)] mt-1">{reviews.length} reviews · hide inappropriate content without deleting it</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => refetch()}
              className="px-4 py-2 min-h-[44px] text-sm font-medium rounded-full border border-[var(--border)] hover:border-[var(--ink)] transition-colors">
              Refresh
            </button>
            {['', 'visible', 'hidden'].map(f => (
              <button key={f} type="button" onClick={() => setStatusFilter(f)}
                className={`px-4 py-2 min-h-[44px] text-sm font-medium rounded-full border transition-all ${
                  statusFilter === f
                    ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                    : 'bg-white text-[var(--muted)] border-[var(--border)] hover:border-[var(--ink)]'
                }`}>
                {f === '' ? 'All' : f === 'visible' ? 'Visible' : 'Hidden'}
              </button>
            ))}
          </div>
        </div>

        <DataTable
          columns={[
            { key: 'product', label: 'Product', width: '200px', render: (v, row) => (
              <div className="min-w-0">
                <p className="font-medium text-[var(--ink)] line-clamp-1">{row.product_name || `Product #${row.product}`}</p>
                <p className="text-xs text-[var(--muted)]">{row.buyer_name}</p>
              </div>
            )},
            { key: 'rating', label: 'Rating', width: '120px', render: (v) => (
              <span className="inline-flex items-center gap-1 text-sm font-semibold">
                <Star size={13} className="fill-amber-400 text-amber-400" /> {v}
              </span>
            )},
            { key: 'title', label: 'Review', width: '280px', render: (v, row) => (
              <div className="min-w-0 max-w-xs">
                {v && <p className="text-sm font-medium text-[var(--ink)] line-clamp-1">{v}</p>}
                <p className="text-xs text-[var(--muted)] line-clamp-2">{row.body || '—'}</p>
              </div>
            )},
            { key: 'helpful_votes', label: 'Helpful', width: '90px', render: (v) => v || 0 },
            { key: 'is_visible', label: 'Status', width: '110px', render: (v) => (
              <StatusBadge status={v === false ? 'hidden' : 'visible'} />
            )},
            { key: 'actions', label: '', width: '130px', render: (v, row) => (
              <button type="button"
                onClick={() => toggleMutation.mutate(row.id)}
                disabled={toggleMutation.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-semibold rounded-xl border border-[var(--border)] hover:border-[var(--ink)] transition-colors disabled:opacity-50">
                {row.is_visible === false ? <><Eye size={13} /> Show</> : <><EyeOff size={13} /> Hide</>}
              </button>
            )},
          ]}
          data={visible}
          keyField="id"
          emptyMessage="No reviews found"
        />
      </div>
    </>
  )
}
