import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useEffect } from 'react'
import { Package, ShoppingBag, Star, TrendingUp } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function BuyerProfilePage() {
  const { setUser } = useAuthStore()
  const qc = useQueryClient()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['buyer-profile'],
    queryFn: async () => {
      const res = await api.get('/accounts/profile/buyer/')
      return res.data
    },
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    if (profile) reset(profile)
  }, [profile])

  const mutation = useMutation({
    mutationFn: (data) => api.patch('/accounts/profile/buyer/', data),
    onSuccess: (res) => {
      setUser(res.data)
      qc.invalidateQueries(['buyer-profile'])
      toast.success('Profile updated')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  if (isLoading) return (
    <MainLayout>
      <div className="flex justify-center py-32"><Spinner /></div>
    </MainLayout>
  )

  const stats = [
    { icon: <Package size={20} />, label: 'Total Orders', value: profile?.total_orders || 0 },
    { icon: <ShoppingBag size={20} />, label: 'Completed', value: profile?.completed_orders || 0 },
    { icon: <TrendingUp size={20} />, label: 'Total Spent', value: `GHS ${parseFloat(profile?.total_spent || 0).toFixed(2)}` },
    { icon: <Star size={20} />, label: 'Cancelled', value: profile?.cancelled_orders || 0 },
  ]

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="serif text-4xl font-medium text-[var(--ink)] mb-10">My Profile</h1>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map(({ icon, label, value }) => (
            <div key={label} className="bg-[var(--off)] rounded-2xl p-5">
              <div className="text-[var(--muted)] mb-3">{icon}</div>
              <p className="text-2xl font-bold text-[var(--ink)]">{value}</p>
              <p className="text-xs text-[var(--muted)] mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-8">
          <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-6">Personal Details</h2>
          <form onSubmit={handleSubmit(data => mutation.mutate(data))}
            className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input label="First Name" error={errors.first_name?.message} {...register('first_name')} />
            <Input label="Last Name" error={errors.last_name?.message} {...register('last_name')} />
            <Input label="Phone Number" type="tel" {...register('phone_number')} />
            <Input label="Email" type="email" disabled {...register('email')} />
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
                Default Delivery Address
              </label>
              <textarea rows={3}
                className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors resize-none"
                {...register('delivery_address')} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" loading={isSubmitting}>Save Changes</Button>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  )
}