import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { CheckCircle, Upload } from 'lucide-react'
import api from '../../services/api'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

const schema = z.object({
  first_name: z.string().min(2, 'Required'),
  last_name: z.string().min(2, 'Required'),
  email: z.string().email('Enter a valid email'),
  phone_number: z.string().min(10, 'Enter a valid phone number'),
  vehicle_type: z.string().min(2, 'Vehicle type is required'),
  password: z.string().min(8, 'Min. 8 characters'),
  confirm_password: z.string(),
}).refine(d => d.password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

export default function DriverRegisterPage() {
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [ghanaCard, setGhanaCard] = useState(null)
  const [selfie, setSelfie] = useState(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data) => {
    setError('')
    if (!ghanaCard) return setError('Please upload your Ghana card image')
    if (!selfie) return setError('Please upload your selfie')

    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => formData.append(key, value))
    formData.append('ghana_card_image', ghanaCard)
    formData.append('selfie_image', selfie)

    try {
      await api.post('/accounts/register/driver/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSubmitted(true)
    } catch (err) {
      const errData = err.response?.data
      const first = errData && Object.values(errData)[0]
      setError(Array.isArray(first) ? first[0] : 'Registration failed')
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="text-green-600" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-[#0f0f0f] mb-3">Application submitted</h2>
          <p className="text-[#737373] text-sm leading-relaxed mb-8">
            Your registration is under review. Our admin team will verify your Ghana card
            and selfie. You'll be able to log in once approved — usually within 24 hours.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-6 py-3 bg-[#0f0f0f] text-white text-sm font-medium rounded-lg hover:bg-[#2a2a2a] transition-colors"
          >
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-[#0f0f0f] p-12">
        <Link to="/" className="text-xl font-bold tracking-tight text-white">
          JAY'S<span className="text-[#737373] font-light">STORE</span>
        </Link>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Deliver with<br />Jay's Store.
          </h1>
          <p className="text-[#737373] text-sm leading-relaxed">
            Earn money on your own schedule delivering fashion to buyers across the city.
          </p>
        </div>
        <p className="text-xs text-[#404040]">© {new Date().getFullYear()} Jay's Store</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#0f0f0f]">Driver registration</h2>
            <p className="text-sm text-[#737373] mt-1">Requires admin verification</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" error={errors.first_name?.message} {...register('first_name')} />
              <Input label="Last name" error={errors.last_name?.message} {...register('last_name')} />
            </div>
            <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
            <Input label="Phone number" type="tel" error={errors.phone_number?.message} {...register('phone_number')} />
            <Input label="Vehicle type" placeholder="e.g. Motorcycle, Car" error={errors.vehicle_type?.message} {...register('vehicle_type')} />
            <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
            <Input label="Confirm password" type="password" error={errors.confirm_password?.message} {...register('confirm_password')} />

            {/* Ghana card upload */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#0f0f0f]">Ghana Card Image</label>
              <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-[#e5e5e5] rounded-lg cursor-pointer hover:border-[#0f0f0f] transition-colors">
                <Upload size={16} className="text-[#737373]" />
                <span className="text-sm text-[#737373]">
                  {ghanaCard ? ghanaCard.name : 'Upload Ghana card photo'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setGhanaCard(e.target.files[0])}
                />
              </label>
            </div>

            {/* Selfie upload */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#0f0f0f]">Selfie Photo</label>
              <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-[#e5e5e5] rounded-lg cursor-pointer hover:border-[#0f0f0f] transition-colors">
                <Upload size={16} className="text-[#737373]" />
                <span className="text-sm text-[#737373]">
                  {selfie ? selfie.name : 'Upload a clear selfie'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => setSelfie(e.target.files[0])}
                />
              </label>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>
            )}

            <Button type="submit" size="full" loading={isSubmitting}>
              Submit application
            </Button>
          </form>

          <p className="text-sm text-[#737373] text-center mt-6">
            Already approved?{' '}
            <Link to="/login" className="text-[#0f0f0f] font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}