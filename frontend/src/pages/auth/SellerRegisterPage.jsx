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
  ghana_card_image: z.instanceof(FileList).refine(files => files?.length === 1, 'Ghana card image is required'),
  selfie_image: z.instanceof(FileList).refine(files => files?.length === 1, 'Selfie image is required'),
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
      const formData = new FormData()
      formData.append('first_name', data.first_name)
      formData.append('last_name', data.last_name)
      formData.append('email', data.email)
      formData.append('phone_number', data.phone_number)
      formData.append('store_name', data.store_name)
      formData.append('store_description', data.store_description || '')
      formData.append('ghana_card_image', data.ghana_card_image[0])
      formData.append('selfie_image', data.selfie_image[0])
      formData.append('password', data.password)
      formData.append('confirm_password', data.confirm_password)

      const response = await api.post('/accounts/register/seller/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      // Sellers require admin KYC approval — no tokens issued until verified.
      if (response.data?.tokens) {
        const { tokens, user } = response.data
        localStorage.setItem('access_token', tokens.access)
        localStorage.setItem('refresh_token', tokens.refresh)
        setUser(user)
        navigate('/seller/dashboard')
      } else {
        toast.success(response.data?.message || 'Store submitted! Awaiting verification...')
        navigate('/login')
      }
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
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
              ℹ️ We verify all sellers before listing. Upload your Ghana Card and a selfie.
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#0f0f0f]">Ghana Card Image</label>
              <input type="file" accept="image/*" className="w-full px-4 py-2.5 text-sm rounded-lg border border-[#e5e5e5] outline-none focus:border-[#0f0f0f] transition-colors"
                {...register('ghana_card_image')} />
              {errors.ghana_card_image && <p className="text-xs text-red-600">{errors.ghana_card_image.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#0f0f0f]">Selfie Photo</label>
              <input type="file" accept="image/*" className="w-full px-4 py-2.5 text-sm rounded-lg border border-[#e5e5e5] outline-none focus:border-[#0f0f0f] transition-colors"
                {...register('selfie_image')} />
              {errors.selfie_image && <p className="text-xs text-red-600">{errors.selfie_image.message}</p>}
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