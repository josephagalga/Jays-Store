import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DataTable } from '../../components/shared/DataTable'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminContactMessagesPage() {
  const qc = useQueryClient()
  const [selected, setSelected] = useState(null)

  const { data: messages, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-contact-messages'],
    queryFn: async () => {
      const res = await api.get('/accounts/admin/contact-messages/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
    staleTime: 1000 * 60 * 5,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  })

  const readMutation = useMutation({
    mutationFn: (id) => api.patch(`/accounts/admin/contact-messages/${id}/`),
    onSuccess: (res) => {
      qc.invalidateQueries(['admin-contact-messages'])
      setSelected(res.data)
    },
    onError: () => toast.error('Could not open message'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/accounts/admin/contact-messages/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries(['admin-contact-messages'])
      setSelected(null)
      toast.success('Message deleted')
    },
    onError: () => toast.error('Failed to delete message'),
  })

  const openMessage = (row) => {
    if (!row.is_read) {
      readMutation.mutate(row.id)
    } else {
      setSelected(row)
    }
  }

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
          <p className="text-red-600 text-sm">Failed to load messages</p>
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
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Contact Messages</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Review and manage customer contact messages</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 min-h-[44px] bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"
          >
            Refresh
          </button>
        </div>

        <DataTable
          columns={[
            { key: 'id', label: 'ID', width: '80px' },
            { key: 'name', label: 'Name', width: '180px', render: (v, row) => (
              <div className="min-w-0">
                <p className="font-medium text-[var(--ink)]">{v}</p>
                <p className="text-xs text-[var(--muted)] truncate">{row.email}</p>
              </div>
            )},
            { key: 'subject', label: 'Subject', width: '200px', render: (v) => (
              <p className="font-medium text-[var(--ink)] line-clamp-1 max-w-[180px]">{v || '—'}</p>
            )},
            { key: 'role', label: 'Role', width: '100px', render: (v) => <span className="px-2 py-0.5 bg-[var(--off)] text-[var(--muted)] text-xs font-medium rounded-full capitalize whitespace-nowrap">{v}</span> },
            { key: 'is_read', label: 'Status', width: '100px', render: (v) => <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full whitespace-nowrap ${v ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{v ? 'Read' : 'Unread'}</span> },
            { key: 'created_at', label: 'Received', width: '160px', render: (v) => v ? new Date(v).toLocaleString('en-GH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—' },
            { key: 'actions', label: '', width: '130px', render: (v, row) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openMessage(row)}
                  className="px-3 py-2 min-h-[44px] text-xs font-medium text-[var(--ink)] border border-[var(--border)] rounded-xl hover:border-[var(--ink)] transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => { if (window.confirm('Delete this message?')) deleteMutation.mutate(row.id) }}
                  disabled={deleteMutation.isPending}
                  className="px-3 py-2 min-h-[44px] text-xs text-rose-600 hover:text-rose-700 transition-colors disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            )},
          ]}
          data={messages || []}
          keyField="id"
          emptyMessage="No contact messages yet"
        />
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <p className="text-xs text-[var(--muted)] mb-1">
              {selected.role || 'Message'} · {selected.created_at ? new Date(selected.created_at).toLocaleString('en-GH') : ''}
            </p>
            <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-1">{selected.subject || 'No subject'}</h2>
            <p className="text-sm text-[var(--muted)] mb-4">From {selected.name} &lt;{selected.email}&gt;</p>
            <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-wrap">{selected.message}</p>
            <div className="flex gap-3 mt-6">
              <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject || 'Your message to Jay\u2019s Store')}`}
                className="flex-1 text-center px-4 py-3 min-h-[48px] bg-[var(--ink)] text-white text-sm font-semibold rounded-xl hover:opacity-80 transition-opacity">
                Reply by email
              </a>
              <button onClick={() => setSelected(null)}
                className="px-5 py-3 min-h-[48px] border border-[var(--border)] text-sm font-medium rounded-xl hover:bg-[var(--off)] transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
