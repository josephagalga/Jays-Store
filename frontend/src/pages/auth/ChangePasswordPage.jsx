import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '../../services/api'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'

const schema = z.object({
  current_password: z.string().min(1, 'Required'),
  password: z.string().min(8, 'Min. 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export default function ChangePasswordPage() {
  const [error, setError] = useState('')
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setError('')
    try {
      const res = await api.post('/accounts/password/change/', data)
      toast.success(res.data?.message || 'Password changed')
      reset()
    } catch (err) {
      const errData = err.response?.data
      const first = errData && Object.values(errData)[0]
      setError(Array.isArray(first) ? first[0] : 'Could not change password')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-10">Change password</h1>
      <div className="max-w-md bg-white border border-[var(--border)] rounded-2xl p-6 md:p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Current password" type="password" placeholder="••••••••"
            error={errors.current_password?.message} {...register('current_password')} />
          <Input label="New password" type="password" placeholder="••••••••"
            error={errors.password?.message} {...register('password')} />
          <Input label="Confirm new password" type="password" placeholder="••••••••"
            error={errors.confirm_password?.message} {...register('confirm_password')} />
          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 px-4 py-3 rounded-xl">{error}</p>
          )}
          <Button type="submit" size="full" loading={isSubmitting}>
            Change password
          </Button>
        </form>
      </div>
    </div>
  )
}
