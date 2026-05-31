import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { CheckCircle, XCircle, Eye } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import api from '../../services/api'
import toast from 'react-hot-toast'

const STATUS_VARIANTS = { approved: 'success', pending: 'warning', rejected: 'danger' }

export default function AdminDriversPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)
  const [rejectNote, setRejectNote] = useState('')

  const { data: drivers, isLoading } = useQuery({
    queryKey: ['admin-drivers'],
    queryFn: async () => {
      const res = await api.get('/accounts/admin/users/?role=driver')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
  })

  const verifyMutation = useMutation({
    mutationFn: ({ id, status, note }) =>
      api.patch(`/accounts/admin/drivers/${id}/verify/`, {
        verification_status: status,
        verification_note: note || '',
      }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-drivers'])
      setSelected(null)
      toast.success('Driver status updated')
    },
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <h1 className="serif text-4xl font-medium text-[var(--ink)] mb-10">Drivers</h1>

      <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-[var(--off)] border-b border-[var(--border)]">
            <tr>
              {['Driver', 'Vehicle', 'Deliveries', 'Rating', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {drivers?.map(driver => (
              <tr key={driver.id} className="hover:bg-[var(--off)] transition-colors">
                <td className="px-5 py-4">
                  <p className="text-sm font-semibold text-[var(--ink)]">{driver.full_name}</p>
                  <p className="text-xs text-[var(--muted)]">{driver.email}</p>
                </td>
                <td className="px-5 py-4 text-sm text-[var(--muted)] capitalize">{driver.vehicle_type || '—'}</td>
                <td className="px-5 py-4 text-sm text-[var(--muted)]">{driver.total_deliveries || 0}</td>
                <td className="px-5 py-4 text-sm text-[var(--muted)]">★ {parseFloat(driver.average_rating || 0).toFixed(1)}</td>
                <td className="px-5 py-4">
                  <Badge variant={STATUS_VARIANTS[driver.verification_status] || 'default'}>
                    {driver.verification_status}
                  </Badge>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelected(driver)}
                      className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                      <Eye size={15} />
                    </button>
                    {driver.verification_status === 'pending' && (
                      <>
                        <button onClick={() => verifyMutation.mutate({ id: driver.id, status: 'approved' })}
                          className="p-1.5 text-green-500 hover:text-green-600 transition-colors">
                          <CheckCircle size={15} />
                        </button>
                        <button onClick={() => verifyMutation.mutate({ id: driver.id, status: 'rejected' })}
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

      {/* Driver detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-5">{selected.full_name}</h2>

            <div className="space-y-3 mb-6">
              {[
                ['Email', selected.email],
                ['Phone', selected.phone_number],
                ['Vehicle', selected.vehicle_type],
                ['Status', selected.verification_status],
                ['Deliveries', selected.total_deliveries],
                ['Rating', `${parseFloat(selected.average_rating || 0).toFixed(1)} ★`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">{label}</span>
                  <span className="font-medium capitalize">{value || '—'}</span>
                </div>
              ))}
            </div>

            {/* ID images */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {selected.ghana_card_image_url && (
                <div>
                  <p className="text-xs text-[var(--muted)] mb-1.5">Ghana Card</p>
                  <img src={selected.ghana_card_image_url} alt="Ghana Card"
                    className="w-full aspect-video object-cover rounded-lg border border-[var(--border)]" />
                </div>
              )}
              {selected.selfie_image_url && (
                <div>
                  <p className="text-xs text-[var(--muted)] mb-1.5">Selfie</p>
                  <img src={selected.selfie_image_url} alt="Selfie"
                    className="w-full aspect-video object-cover rounded-lg border border-[var(--border)]" />
                </div>
              )}
              {!selected.ghana_card_image_url && !selected.selfie_image_url && (
                <p className="col-span-2 text-sm text-[var(--muted)] text-center py-4">
                  No verification images uploaded
                </p>
              )}
            </div>

            {selected.verification_status === 'pending' && (
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
                    onClick={() => verifyMutation.mutate({ id: selected.id, status: 'approved' })}
                    className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors">
                    Approve
                  </button>
                  <button
                    onClick={() => verifyMutation.mutate({ id: selected.id, status: 'rejected', note: rejectNote })}
                    className="flex-1 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-xl hover:bg-rose-600 transition-colors">
                    Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}