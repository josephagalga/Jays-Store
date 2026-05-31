import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import useAuthStore from '../../store/authStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export default function LoginPage() {
  const { login } = useAuthStore()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data) => {
    setError('')
    const result = await login(data.email, data.password)
    if (!result.success) setError(result.error)
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between bg-[var(--ink)] p-14">
        <Link to="/" className="serif text-xl font-medium text-white">
          Jay's Store
        </Link>
        <div>
          <p className="text-xs font-medium text-white/30 uppercase tracking-widest mb-5">
            Welcome Back
          </p>
          <h1 className="serif text-5xl font-medium text-white leading-snug mb-5">
            Good to see<br />
            <em className="italic font-normal text-white/40">you again.</em>
          </h1>
          <p className="text-sm text-white/40 font-light leading-relaxed max-w-xs">
            Sign in to continue shopping, track your orders, and get AI styling recommendations.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/register/seller" className="text-xs text-white/30 hover:text-white/60 transition-colors">Become a seller</Link>
          <span className="text-white/15">·</span>
          <Link to="/register/driver" className="text-xs text-white/30 hover:text-white/60 transition-colors">Become a driver</Link>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-8 bg-[var(--off)]">
        <div className="w-full max-w-sm">
          <Link to="/" className="lg:hidden block serif text-xl font-medium text-[var(--ink)] mb-10">
            Jay's Store
          </Link>

          <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-1">Sign in</h2>
          <p className="text-sm text-[var(--muted)] mb-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-[var(--ink)] font-medium hover:underline">
              Create one
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password')}
            />

            {error && (
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-100 px-4 py-3 rounded-xl">
                {error}
              </p>
            )}

            <Button type="submit" size="full" loading={isSubmitting} className="mt-2">
              Sign in
            </Button>
          </form>

          <div className="mt-8 pt-8 border-t border-[var(--border)] flex gap-3">
            <Link to="/register/seller"
              className="flex-1 py-2.5 text-sm font-medium text-center border border-[var(--border)] rounded-xl bg-white hover:border-[var(--ink)] transition-colors text-[var(--muted)] hover:text-[var(--ink)]">
              Seller Login
            </Link>
            <Link to="/register/driver"
              className="flex-1 py-2.5 text-sm font-medium text-center border border-[var(--border)] rounded-xl bg-white hover:border-[var(--ink)] transition-colors text-[var(--muted)] hover:text-[var(--ink)]">
              Driver Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}