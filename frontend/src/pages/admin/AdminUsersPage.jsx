import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Users, Trash2, AlertTriangle } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const [role, setRole] = useState('buyer')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const qc = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users', role],
    queryFn: async () => {
      const res = await api.get(`/accounts/admin/users/?role=${role}`)
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/accounts/admin/users/${id}/delete/`),
    onSuccess: (_, id) => {
      qc.invalidateQueries(['admin-users'])
      qc.invalidateQueries(['admin-dashboard'])
      toast.success('User deleted')
      setConfirmDelete(null)
    },
    onError: () => toast.error('Failed to delete user'),
  })

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <h1 className="serif text-4xl font-medium text-[var(--ink)] mb-10">Users</h1>

      {/* Role tabs */}
      <div className="flex gap-2 mb-6">
        {['buyer', 'seller', 'driver'].map(r => (
          <button key={r} onClick={() => setRole(r)}
            className={`px-5 py-2.5 text-sm font-medium rounded-xl transition-all capitalize ${
              role === r
                ? 'bg-[var(--ink)] text-white'
                : 'bg-[var(--off)] text-[var(--muted)] hover:bg-[var(--stone)]'
            }`}>
            {r}s
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : !users?.length ? (
        <div className="text-center py-24 border border-dashed border-[var(--border)] rounded-2xl">
          <Users size={40} className="mx-auto text-[var(--border)] mb-4" />
          <p className="text-sm text-[var(--muted)]">No {role}s found</p>
        </div>
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--off)] border-b border-[var(--border)]">
              <tr>
                {['Name', 'Email', 'Phone', 'Joined', 'Last Active', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-[var(--off)] transition-colors">
                  <td className="px-5 py-4 text-sm font-semibold text-[var(--ink)]">{user.full_name}</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{user.email}</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{user.phone_number || '—'}</td>
                  <td className="px-5 py-4 text-xs text-[var(--muted)]">
                    {new Date(user.date_joined).toLocaleDateString('en-GH')}
                  </td>
                  <td className="px-5 py-4 text-xs text-[var(--muted)]">
                    {user.last_active ? new Date(user.last_active).toLocaleDateString('en-GH') : 'Never'}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      user.is_active ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-500'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => setConfirmDelete(user)}
                      className="p-1.5 text-[var(--muted)] hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50">
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle size={22} className="text-rose-500" />
            </div>
            <h2 className="serif text-2xl font-medium text-[var(--ink)] text-center mb-2">
              Delete User
            </h2>
            <p className="text-sm text-[var(--muted)] text-center mb-6">
              Are you sure you want to delete <strong>{confirmDelete.full_name}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-[var(--border)] text-sm font-medium rounded-xl hover:bg-[var(--off)] transition-colors">
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 bg-rose-500 text-white text-sm font-semibold rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50">
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}