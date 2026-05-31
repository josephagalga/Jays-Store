import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Truck, Package, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminDashboardPage() {
  const qc = useQueryClient()

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await api.get('/accounts/admin/dashboard/')
      return res.data
    },
  })

  const { data: pendingDrivers } = useQuery({
    queryKey: ['pending-drivers'],
    queryFn: async () => {
      const res = await api.get('/accounts/admin/users/?role=driver')
      const all = Array.isArray(res.data) ? res.data : res.data.results || []
      return all.filter(d => d.verification_status === 'pending')
    },
  })

  const verifyMutation = useMutation({
    mutationFn: ({ id, status, note }) =>
      api.patch(`/accounts/admin/drivers/${id}/verify/`, { verification_status: status, verification_note: note || '' }),
    onSuccess: () => {
      qc.invalidateQueries(['pending-drivers'])
      qc.invalidateQueries(['admin-dashboard'])
      toast.success('Driver updated')
    },
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  const statCards = [
    { icon: <Users size={20} />, label: 'Total Buyers', value: stats?.total_buyers || 0, color: 'text-blue-600 bg-blue-50' },
    { icon: <Truck size={20} />, label: 'Total Drivers', value: stats?.total_drivers || 0, color: 'text-green-600 bg-green-50' },
    { icon: <Package size={20} />, label: 'Total Orders', value: stats?.total_orders || 0, color: 'text-amber-600 bg-amber-50' },
    { icon: <TrendingUp size={20} />, label: 'Revenue', value: `GHS ${parseFloat(stats?.total_revenue || 0).toFixed(2)}`, color: 'text-purple-600 bg-purple-50' },
  ]

  const activityCards = [
    { label: 'Active Today', value: stats?.active_today || 0 },
    { label: 'Active This Week', value: stats?.active_this_week || 0 },
    { label: 'Active This Month', value: stats?.active_this_month || 0 },
    { label: 'Pending Drivers', value: stats?.pending_drivers || 0 },
    { label: 'Verified Drivers', value: stats?.verified_drivers || 0 },
    { label: 'Currently Delivering', value: stats?.drivers_currently_delivering || 0 },
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <h1 className="serif text-4xl font-medium text-[var(--ink)] mb-10">Admin Dashboard</h1>

      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ icon, label, value, color }) => (
          <div key={label} className="bg-white border border-[var(--border)] rounded-2xl p-6">
            <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-4`}>
              {icon}
            </div>
            <p className="text-2xl font-bold text-[var(--ink)]">{value}</p>
            <p className="text-xs text-[var(--muted)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Activity stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {activityCards.map(({ label, value }) => (
          <div key={label} className="bg-[var(--off)] rounded-2xl p-5">
            <p className="text-2xl font-bold text-[var(--ink)]">{value}</p>
            <p className="text-xs text-[var(--muted)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Pending driver verifications */}
      {pendingDrivers?.length > 0 && (
        <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center gap-2">
            <Clock size={16} className="text-amber-500" />
            <h2 className="serif text-xl font-medium text-[var(--ink)]">
              Pending Verifications ({pendingDrivers.length})
            </h2>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {pendingDrivers.map(driver => (
              <div key={driver.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">{driver.full_name}</p>
                  <p className="text-xs text-[var(--muted)]">{driver.email} · {driver.phone_number}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => verifyMutation.mutate({ id: driver.id, status: 'approved' })}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-green-50 text-green-700 text-xs font-semibold rounded-xl hover:bg-green-100 transition-colors">
                    <CheckCircle size={13} /> Approve
                  </button>
                  <button
                    onClick={() => verifyMutation.mutate({ id: driver.id, status: 'rejected', note: 'Does not meet requirements' })}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 text-rose-600 text-xs font-semibold rounded-xl hover:bg-rose-100 transition-colors">
                    <XCircle size={13} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}