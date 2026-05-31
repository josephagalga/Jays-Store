import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Upload, Plus, X } from 'lucide-react'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import toast from 'react-hot-toast'

const schema = z.object({
  name: z.string().min(2, 'Product name is required'),
  description: z.string().min(10, 'Description is required'),
  price: z.string().min(1, 'Price is required'),
  discount_price: z.string().optional(),
  gender: z.string().min(1, 'Select a gender'),
  brand: z.string().optional(),
  tags: z.string().optional(),
  category: z.string().optional(),
})

export default function SellerAddProductPage() {
  const navigate = useNavigate()
  const [images, setImages] = useState([])
  const [variants, setVariants] = useState([{ size: '', color: '', stock: '' }])

  const { data: categories } = useQuery({
  queryKey: ['categories-list'],  // different key to avoid cache conflict
  queryFn: async () => {
    const res = await api.get('/products/categories/')
    console.log('categories raw:', res.data)  // temporary debug
    return Array.isArray(res.data) ? res.data : res.data.results || []
  },
})

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema)
  })

  const addVariant = () => setVariants([...variants, { size: '', color: '', stock: '' }])
  const removeVariant = (i) => setVariants(variants.filter((_, idx) => idx !== i))
  const updateVariant = (i, key, value) => {
    const next = [...variants]
    next[i][key] = value
    setVariants(next)
  }

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name,
        description: data.description,
        price: parseFloat(data.price),
        gender: data.gender,
        brand: data.brand || '',
        tags: data.tags || '',
        is_active: true,
      }

      // Only include optional fields if they have values
      if (data.discount_price) payload.discount_price = parseFloat(data.discount_price)
      if (data.category) payload.category = parseInt(data.category)

      const productRes = await api.post('/products/manage/create/', payload)
      const productId = productRes.data.id

      for (const v of variants) {
        if (v.size && v.color) {
          await api.post(`/products/manage/${productId}/variants/`, {
            size: v.size, color: v.color, stock: parseInt(v.stock) || 0,
          })
        }
      }

      for (let i = 0; i < images.length; i++) {
        const fd = new FormData()
        fd.append('image', images[i])
        fd.append('is_primary', i === 0)
        fd.append('order', i)
        await api.post(`/products/manage/${productId}/images/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      toast.success('Product added successfully!')
      navigate('/seller/products')
    }  catch (err) {
        console.log('Full error:', err.response?.data)
        const errData = err.response?.data
        const first = errData && Object.values(errData)[0]
        const msg = Array.isArray(first) ? first[0] : (err.response?.data?.detail || 'Failed to add product')
        toast.error(msg)
      }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
      <h1 className="serif text-4xl font-medium text-[var(--ink)] mb-10">Add New Product</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic info */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6 space-y-4">
          <h2 className="serif text-xl font-medium text-[var(--ink)]">Basic Information</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Input label="Product Name" error={errors.name?.message} {...register('name')} />
            <Input label="Brand" placeholder="Optional" {...register('brand')} />
            <Input label="Price (GHS)" type="number" step="0.01" error={errors.price?.message} {...register('price')} />
            <Input label="Sale Price (GHS)" type="number" step="0.01" placeholder="Optional" {...register('discount_price')} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">Gender</label>
              <select {...register('gender')}
                className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors">
                <option value="">Select gender</option>
                {['men', 'women', 'kids', 'unisex'].map(g => (
                  <option key={g} value={g} className="capitalize">{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                ))}
              </select>
              {errors.gender && <p className="text-xs text-rose-500">{errors.gender.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
              Category <span className="text-[var(--muted)] font-normal normal-case">(optional)</span>
            </label>
            <select {...register('category')}
              className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors">
              <option value="">Select category</option>
              {categories?.length > 0
                ? categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))
                : <option disabled>Loading...</option>
              }
            </select>
          </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">Description</label>
            <textarea rows={4} {...register('description')}
              className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors resize-none" />
            {errors.description && <p className="text-xs text-rose-500">{errors.description.message}</p>}
          </div>
          <Input label="Tags" placeholder="e.g. casual, summer, cotton (comma separated)" {...register('tags')} />
        </div>

        {/* Images */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6">
          <h2 className="serif text-xl font-medium text-[var(--ink)] mb-4">Product Images</h2>
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--border)] rounded-xl p-10 cursor-pointer hover:border-[var(--ink)] transition-colors">
            <Upload size={24} className="text-[var(--muted)] mb-3" />
            <p className="text-sm font-medium text-[var(--ink)]">Click to upload images</p>
            <p className="text-xs text-[var(--muted)] mt-1">First image will be the cover. PNG, JPG up to 5MB.</p>
            <input type="file" multiple accept="image/*" className="hidden"
              onChange={e => setImages([...images, ...Array.from(e.target.files)])} />
          </label>
          {images.length > 0 && (
            <div className="flex gap-3 mt-4 flex-wrap">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20">
                  <img src={URL.createObjectURL(img)} alt=""
                    className="w-full h-full object-cover rounded-lg" />
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 text-[8px] bg-[var(--ink)] text-white px-1.5 py-0.5 rounded font-medium">
                      Cover
                    </span>
                  )}
                  <button type="button" onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center">
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Variants */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="serif text-xl font-medium text-[var(--ink)]">Sizes & Colors</h2>
            <button type="button" onClick={addVariant}
              className="flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
              <Plus size={15} /> Add variant
            </button>
          </div>
          <div className="space-y-3">
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-3 gap-3 items-end">
                <div className="flex flex-col gap-1.5">
                  {i === 0 && <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">Size</label>}
                  <input value={v.size} onChange={e => updateVariant(i, 'size', e.target.value)}
                    placeholder="e.g. M, 42"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors" />
                </div>
                <div className="flex flex-col gap-1.5">
                  {i === 0 && <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">Color</label>}
                  <input value={v.color} onChange={e => updateVariant(i, 'color', e.target.value)}
                    placeholder="e.g. Black"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors" />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex flex-col gap-1.5 flex-1">
                    {i === 0 && <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">Stock</label>}
                    <input type="number" value={v.stock} onChange={e => updateVariant(i, 'stock', e.target.value)}
                      placeholder="0"
                      className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors" />
                  </div>
                  {variants.length > 1 && (
                    <button type="button" onClick={() => removeVariant(i)}
                      className="mb-0.5 p-2.5 text-[var(--muted)] hover:text-rose-500 transition-colors">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" loading={isSubmitting}>Publish Product</Button>
          <Button variant="secondary" type="button" onClick={() => navigate('/seller/products')}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}