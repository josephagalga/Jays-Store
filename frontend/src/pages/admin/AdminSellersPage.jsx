import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { CheckCircle, XCircle, Eye } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import api, { adminApi } from '../../services/api'
import toast from 'react-hot-toast'

const STATUS_VARIANTS = { approved: 'success', pending: 'warning', rejected: 'danger' }

export default function AdminSellersPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [rejectNote, setRejectNote] = useState('')

  const { data: sellers, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-sellers'],
    queryFn: async () => {
      const res = await api.get('/accounts/admin/users/', { params: { role: 'seller' } })
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  })

  const verifyMutation = useMutation({
    mutationFn: ({ id, status, note }) => adminApi.verifySeller(id, status, note),
    onSuccess: () => {
      qc.invalidateQueries(['admin-sellers'])
      qc.invalidateQueries(['pending-sellers'])
      qc.invalidateQueries(['admin-dashboard'])
      setSelected(null)
      setRejectNote('')
      toast.success('Seller status updated')
    },
    onError: () => toast.error('Failed to update seller'),
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  if (isError) return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="text-center py-20">
        <p className="text-red-600 text-sm">Failed to load sellers</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[var(--ink)] text-white text-sm rounded-xl">Retry</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-10">Sellers</h1>

      {!sellers?.length ? (
        <div className="text-center py-20 bg-white border border-[var(--border)] rounded-2xl">
          <p className="text-sm text-[var(--muted)]">No sellers found</p>
        </div>
      ) : (
      <div className="bg-white border border-[var(--border)] rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-[var(--off)] border-b border-[var(--border)]">
            <tr>
              {['Seller', 'Store', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sellers?.map(seller => (
              <tr key={seller.id} className="hover:bg-[var(--off)] transition-colors">
                <td className="px-5 py-4">
                  <p className="text-sm font-semibold text-[var(--ink)]">{seller.full_name}</p>
                  <p className="text-xs text-[var(--muted)]">{seller.email}</p>
                </td>
                <td className="px-5 py-4 text-sm text-[var(--muted)]">{seller.store_name || '—'}</td>
                <td className="px-5 py-4">
                  <Badge variant={STATUS_VARIANTS[seller.verification_status] || 'default'}>
                    {seller.verification_status}
                  </Badge>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelected(seller)}
                      className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                      <Eye size={15} />
                    </button>
                    {seller.verification_status === 'pending' && (
                      <>
                        <button onClick={() => verifyMutation.mutate({ id: seller.id, status: 'approved' })}
                          className="p-1.5 text-green-500 hover:text-green-600 transition-colors">
                          <CheckCircle size={15} />
                        </button>
                        <button onClick={() => verifyMutation.mutate({ id: seller.id, status: 'rejected' })}
                          className="p-1.5 text-rose-500 hover:text-rose-600 transition-colors">
                          <XCircle size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {/* Seller detail modal */}
      {selected && (
        <SellerDetailModal
          seller={selected}
          rejectNote={rejectNote}
          setRejectNote={setRejectNote}
          onClose={() => { setSelected(null); setRejectNote('') }}
          onVerify={(status, note) => verifyMutation.mutate({ id: selected.id, status, note })}
          verifying={verifyMutation.isPending}
        />
      )}
    </div>
  )
}

function SellerDetailModal({ seller, rejectNote, setRejectNote, onClose, onVerify, verifying }) {
  const { data: detail } = useQuery({
    queryKey: ['admin-seller', seller.id],
    queryFn: () => adminApi.getSellerDetail(seller.id),
    initialData: seller,
  })

  const s = { ...seller, ...detail }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-1">{s.store_name || s.full_name}</h2>
        <p className="text-xs text-[var(--muted)] mb-5">{s.full_name} · {s.email}</p>

        <div className="space-y-3 mb-6">
          {[
            ['Phone', s.phone_number],
            ['Store address', s.store_address],
            ['Pickup location', s.pickup_location],
            ['Status', s.verification_status],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 text-sm">
              <span className="text-[var(--muted)] flex-shrink-0">{label}</span>
              <span className="font-medium text-right">{value || '—'}</span>
            </div>
          ))}
          {s.store_description && (
            <p className="text-sm text-[var(--muted)] pt-1">{s.store_description}</p>
          )}
        </div>

        {/* KYC images */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {s.ghana_card_image_url && (
            <div>
              <p className="text-xs text-[var(--muted)] mb-1.5">Ghana Card</p>
              <img src={s.ghana_card_image_url} alt="Ghana Card"
                className="w-full aspect-video object-cover rounded-lg border border-[var(--border)]" />
            </div>
          )}
          {s.selfie_image_url && (
            <div>
              <p className="text-xs text-[var(--muted)] mb-1.5">Selfie</p>
              <img src={s.selfie_image_url} alt="Selfie"
                className="w-full aspect-video object-cover rounded-lg border border-[var(--border)]" />
            </div>
          )}
          {!s.ghana_card_image_url && !s.selfie_image_url && (
            <p className="col-span-2 text-sm text-[var(--muted)] text-center py-4">
              No verification images uploaded
            </p>
          )}
        </div>

        {s.verification_status === 'pending' && (
          <div className="space-y-3">
            <textarea
              value={rejectNote}
              onChange={e => setRejectNote(e.target.value)}
              placeholder="Rejection reason (optional)"
              rows={2}
              className="w-full px-4 py-3 text-sm border border-[var(--border)] rounded-xl outline-none focus:border-[var(--ink)] transition-colors resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={() => onVerify('approved')}
                disabled={verifying}
                className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50">
                Approve
              </button>
              <button
                onClick={() => onVerify('rejected', rejectNote)}
                disabled={verifying}
                className="flex-1 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50">
                Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
