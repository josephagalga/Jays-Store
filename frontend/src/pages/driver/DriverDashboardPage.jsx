import { useQuery } from '@tanstack/react-query'
import { Truck, Star, TrendingUp, Package, ToggleLeft, ToggleRight } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function DriverDashboardPage() {
  const qc = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['driver-profile'],
    queryFn: async () => {
      const res = await api.get('/accounts/profile/driver/')
      return res.data
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (is_available) => api.patch('/accounts/profile/driver/', { is_available }),
    onSuccess: () => {
      qc.invalidateQueries(['driver-profile'])
      toast.success('Availability updated')
    },
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  const stats = [
    { icon: <Truck size={20} />, label: 'Total Deliveries', value: profile?.total_deliveries || 0 },
    { icon: <Package size={20} />, label: 'Successful', value: profile?.successful_deliveries || 0 },
    { icon: <TrendingUp size={20} />, label: 'Total Earnings', value: `GHS ${parseFloat(profile?.total_earnings || 0).toFixed(2)}` },
    { icon: <Star size={20} />, label: 'Avg Rating', value: `${parseFloat(profile?.average_rating || 0).toFixed(1)} ★` },
  ]

  if (profile?.verification_status === 'pending') return (
    <div className="max-w-md mx-auto text-center py-24 px-6">
      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <Package size={28} className="text-amber-500" />
      </div>
      <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-3">Under Review</h2>
      <p className="text-sm text-[var(--muted)] leading-relaxed">
        Your account is being verified by our admin team. This usually takes up to 24 hours.
      </p>
    </div>
  )

  if (profile?.verification_status === 'rejected') return (
    <div className="max-w-md mx-auto text-center py-24 px-6">
      <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-3">Application Rejected</h2>
      <p className="text-sm text-[var(--muted)] leading-relaxed mb-4">
        {profile.verification_note || 'Your application did not meet our requirements.'}
      </p>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-sm text-[var(--muted)] mb-1">Driver Dashboard</p>
          <h1 className="serif text-4xl font-medium text-[var(--ink)]">{profile?.full_name}</h1>
        </div>
        <button
          onClick={() => toggleMutation.mutate(!profile?.is_available)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
            profile?.is_available
              ? 'bg-green-50 text-green-700 hover:bg-green-100'
              : 'bg-[var(--off)] text-[var(--muted)] hover:bg-[var(--stone)]'
          }`}>
          {profile?.is_available ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {profile?.is_available ? 'Available' : 'Unavailable'}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map(({ icon, label, value }) => (
          <div key={label} className="bg-[var(--off)] rounded-2xl p-6">
            <div className="text-[var(--muted)] mb-3">{icon}</div>
            <p className="text-2xl font-bold text-[var(--ink)]">{value}</p>
            <p className="text-xs text-[var(--muted)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-[var(--off)] rounded-2xl p-6">
        <p className="text-sm text-[var(--muted)] mb-1">Success Rate</p>
        <div className="flex items-center gap-4">
          <div className="flex-1 bg-white rounded-full h-3 overflow-hidden">
            <div className="h-full bg-[var(--ink)] rounded-full transition-all"
              style={{ width: `${profile?.delivery_success_rate || 0}%` }} />
          </div>
          <span className="text-sm font-bold text-[var(--ink)]">{profile?.delivery_success_rate || 0}%</span>
        </div>
      </div>
    </div>
  )
}