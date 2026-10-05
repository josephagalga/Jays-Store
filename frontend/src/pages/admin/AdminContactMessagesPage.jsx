import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import { DataTable } from '../../components/shared/DataTable'
import { adminApi } from '../../services/api'
import toast from 'react-hot-toast'
import api from '../../services/api'

export default function AdminContactMessagesPage() {
  const qc = useQueryClient()

  const { data: messages, isLoading, refetch } = useQuery({
    queryKey: ['admin-contact-messages'],
    queryFn: adminApi.getContactMessages,
    staleTime: 1000 * 60 * 5,
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/accounts/admin/contact-messages/${id}/delete/`),
    onSuccess: () => {
      qc.invalidateQueries(['admin-contact-messages'])
      toast.success('Message deleted')
    },
    onError: () => toast.error('Failed to delete message'),
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
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Contact Messages</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Review and manage customer contact messages</p>
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
            { key: 'id', label: 'ID', width: '80px' },
            { key: 'name', label: 'Name', width: '180px', render: (v, row) => (
              <div>
                <p className="font-medium text-[var(--ink)]">{v}</p>
                <p className="text-xs text-[var(--muted)]">{row.email}</p>
              </div>
            )},
            { key: 'subject', label: 'Subject', width: '200px', render: (v) => (
              <p className="font-medium text-[var(--ink)] line-clamp-1 max-w-[180px]">{v || '—'}</p>
            )},
            { key: 'role', label: 'Role', width: '100px', render: (v) => <span className="px-2 py-0.5 bg-[var(--off)] text-[var(--muted)] text-xs font-medium rounded-full capitalize">{v}</span> },
            { key: 'is_read', label: 'Status', width: '100px', render: (v) => <span className={`px-2.5 py-1 text-[10px] font-semibold rounded-full ${v ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{v ? 'Read' : 'Unread'}</span> },
            { key: 'created_at', label: 'Received', width: '160px', render: (v) => new Date(v).toLocaleString('en-GH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
            { key: 'actions', label: 'Actions', width: '120px', render: (v, row) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => deleteMutation.mutate(row.id)}
                  disabled={deleteMutation.isPending}
                  className="px-2 py-1 text-xs text-rose-600 hover:text-rose-700 transition-colors"
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
    </MainLayout>
  )
}