import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '../../services/api'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'

const schema = z.object({
  password: z.string().min(8, 'Min. 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const uid = params.get('uid') || ''
  const token = params.get('token') || ''
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setError('')
    try {
      const res = await api.post('/accounts/password/reset-confirm/', {
        uid, token, password: data.password, confirm_password: data.confirm_password,
      })
      toast.success(res.data?.message || 'Password reset')
      navigate('/login', { replace: true })
    } catch (err) {
      const errData = err.response?.data
      const first = errData && Object.values(errData)[0]
      setError(Array.isArray(first) ? first[0] : 'Reset failed — request a new link')
    }
  }

  if (!uid || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--off)]">
        <div className="w-full max-w-sm bg-white border border-[var(--border)] rounded-2xl p-8 text-center">
          <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-2">Invalid link</h2>
          <p className="text-sm text-[var(--muted)] mb-6">This reset link is incomplete. Request a new one.</p>
          <Link to="/forgot-password" className="text-[var(--ink)] font-medium hover:underline text-sm">
            Request reset link
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--off)]">
      <div className="w-full max-w-sm bg-white border border-[var(--border)] rounded-2xl p-8">
        <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-1">Set new password</h2>
        <p className="text-sm text-[var(--muted)] mb-6">Choose a new password for your account.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="New password" type="password" placeholder="••••••••"
            error={errors.password?.message} {...register('password')} />
          <Input label="Confirm new password" type="password" placeholder="••••••••"
            error={errors.confirm_password?.message} {...register('confirm_password')} />
          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 px-4 py-3 rounded-xl">{error}</p>
          )}
          <Button type="submit" size="full" loading={isSubmitting}>
            Reset password
          </Button>
        </form>
      </div>
    </div>
  )
}
