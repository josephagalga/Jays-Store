import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '../../services/api'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
})

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    try {
      const res = await api.post('/accounts/password/reset-request/', data)
      setSent(true)
      toast.success(res.data?.message || 'Reset link sent')
    } catch {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--off)]">
      <div className="w-full max-w-sm bg-white border border-[var(--border)] rounded-2xl p-8">
        <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-1">Forgot password</h2>
        <p className="text-sm text-[var(--muted)] mb-6">
          {sent
            ? 'If an account exists for that email, a reset link is on its way. Check your inbox (and spam).'
            : 'Enter your account email and we will send you a reset link.'}
        </p>
        {!sent && (
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Email" type="email" placeholder="you@example.com"
              error={errors.email?.message} {...register('email')} />
            <Button type="submit" size="full" loading={isSubmitting}>
              Send reset link
            </Button>
          </form>
        )}
        <p className="text-sm text-[var(--muted)] text-center mt-6">
          <Link to="/login" className="text-[var(--ink)] font-medium hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
