import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import toast from 'react-hot-toast'

const schema = z.object({
  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  email: z.string().email('Enter a valid email'),
  phone_number: z.string().min(10, 'Enter a valid phone number'),
  delivery_address: z.string().min(5, 'Enter your delivery address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export default function BuyerRegisterPage() {
  const { setUser } = useAuthStore()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data) => {
    setError('')
    try {
      const response = await api.post('/accounts/register/buyer/', data)
      const { tokens, user } = response.data

      localStorage.setItem('access_token', tokens.access)
      localStorage.setItem('refresh_token', tokens.refresh)
      setUser(user)

      toast.success('Account created successfully!')
      navigate('/')
    } catch (err) {
      const data = err.response?.data
      const firstError = data && Object.values(data)[0]
      setError(Array.isArray(firstError) ? firstError[0] : 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#0f0f0f] p-12">
        <Link to="/" className="text-xl font-bold tracking-tight text-white">
          JAY'S<span className="text-[#737373] font-light">STORE</span>
        </Link>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Start shopping<br />in seconds.
          </h1>
          <p className="text-[#737373] text-sm leading-relaxed">
            Create a free account and browse hundreds of fashion items from local sellers.
          </p>
        </div>
        <p className="text-xs text-[#404040]">© {new Date().getFullYear()} Jay's Store</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#0f0f0f]">Create account</h2>
            <p className="text-sm text-[#737373] mt-1">Shop from local fashion sellers</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                placeholder="Jay"
                error={errors.first_name?.message}
                {...register('first_name')}
              />
              <Input
                label="Last name"
                placeholder="Mensah"
                error={errors.last_name?.message}
                {...register('last_name')}
              />
            </div>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Phone number"
              type="tel"
              placeholder="024 000 0000"
              error={errors.phone_number?.message}
              {...register('phone_number')}
            />
            <Input
              label="Delivery address"
              placeholder="House no., Street, Area, City"
              error={errors.delivery_address?.message}
              {...register('delivery_address')}
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min. 8 characters"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              error={errors.confirm_password?.message}
              {...register('confirm_password')}
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>
            )}

            <Button type="submit" size="full" loading={isSubmitting}>
              Create account
            </Button>
          </form>

          <p className="text-sm text-[#737373] text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#0f0f0f] font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}