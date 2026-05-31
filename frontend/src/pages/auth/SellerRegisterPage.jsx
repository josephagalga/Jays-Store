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
  first_name: z.string().min(2, 'Required'),
  last_name: z.string().min(2, 'Required'),
  email: z.string().email('Enter a valid email'),
  phone_number: z.string().min(10, 'Enter a valid phone number'),
  store_name: z.string().min(2, 'Store name is required'),
  store_description: z.string().optional(),
  password: z.string().min(8, 'Min. 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export default function SellerRegisterPage() {
  const { setUser } = useAuthStore()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data) => {
    setError('')
    try {
      const response = await api.post('/accounts/register/seller/', data)
      const { tokens, user } = response.data
      localStorage.setItem('access_token', tokens.access)
      localStorage.setItem('refresh_token', tokens.refresh)
      setUser(user)
      toast.success('Store created successfully!')
      navigate('/seller/dashboard')
    } catch (err) {
      const errData = err.response?.data
      const first = errData && Object.values(errData)[0]
      setError(Array.isArray(first) ? first[0] : 'Registration failed')
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#0f0f0f] p-12">
        <Link to="/" className="text-xl font-bold tracking-tight text-white">
          JAY'S<span className="text-[#737373] font-light">STORE</span>
        </Link>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Open your store<br />today.
          </h1>
          <p className="text-[#737373] text-sm leading-relaxed">
            Sell your fashion to thousands of buyers across Ghana with zero upfront cost.
          </p>
        </div>
        <p className="text-xs text-[#404040]">© {new Date().getFullYear()} Jay's Store</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#0f0f0f]">Open your store</h2>
            <p className="text-sm text-[#737373] mt-1">Start selling fashion in minutes</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" error={errors.first_name?.message} {...register('first_name')} />
              <Input label="Last name" error={errors.last_name?.message} {...register('last_name')} />
            </div>
            <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Phone number" type="tel" error={errors.phone_number?.message} {...register('phone_number')} />
            <Input label="Store name" placeholder="e.g. Jay's Streetwear" error={errors.store_name?.message} {...register('store_name')} />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#0f0f0f]">Store description <span className="text-[#737373] font-normal">(optional)</span></label>
              <textarea
                rows={3}
                placeholder="Tell buyers what your store is about..."
                className="w-full px-4 py-2.5 text-sm rounded-lg border border-[#e5e5e5] outline-none focus:border-[#0f0f0f] transition-colors resize-none placeholder:text-[#a3a3a3]"
                {...register('store_description')}
              />
            </div>
            <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
            <Input label="Confirm password" type="password" error={errors.confirm_password?.message} {...register('confirm_password')} />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>
            )}

            <Button type="submit" size="full" loading={isSubmitting}>
              Create my store
            </Button>
          </form>

          <p className="text-sm text-[#737373] text-center mt-6">
            Already have a store?{' '}
            <Link to="/login" className="text-[#0f0f0f] font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}