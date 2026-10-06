import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Package, Eye, EyeOff, Star } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import SafeImage from '../../components/common/SafeImage'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminProductsPage() {
  const qc = useQueryClient()

  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await api.get('/products/manage/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) =>
      api.patch(`/products/manage/${id}/`, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-products'])
      toast.success('Product updated')
    },
    onError: () => toast.error('Failed to update product'),
  })

  const featureMutation = useMutation({
    mutationFn: ({ id, is_featured }) =>
      api.patch(`/products/manage/${id}/`, { is_featured }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-products'])
      toast.success('Product updated')
    },
    onError: () => toast.error('Failed to update product'),
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  if (isError) return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="text-center py-20">
        <p className="text-red-600 text-sm">Failed to load products</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[var(--ink)] text-white text-sm rounded-xl">Retry</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="flex items-center justify-between mb-10">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">All Products</h1>
        <span className="text-sm text-[var(--muted)]">{products?.length || 0} total</span>
      </div>

      <div className="bg-white border border-[var(--border)] rounded-2xl overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="bg-[var(--off)] border-b border-[var(--border)]">
            <tr>
              {['Product', 'Seller', 'Price', 'Sold', 'Rating', 'Featured', 'Status'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {products?.map(product => (
              <tr key={product.id} className="hover:bg-[var(--off)] transition-colors">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-12 bg-[var(--off)] rounded-lg overflow-hidden flex-shrink-0">
                      {product.images?.[0]?.url || product.images?.[0]?.image ? (
                        <SafeImage src={product.images[0].url || product.images[0].image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={14} className="text-[var(--border)]" />
                        </div>
                      )}
                    </div>
                    <div>
                      <Link to={`/products/${product.slug}`}
                        className="text-sm font-semibold text-[var(--ink)] hover:underline line-clamp-1">
                        {product.name}
                      </Link>
                      <p className="text-xs text-[var(--muted)] capitalize">{product.gender}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-sm text-[var(--muted)]">
                  {product.seller?.store_name || 'Admin'}
                </td>
                <td className="px-5 py-4 text-sm font-medium">
                  GHS {parseFloat(product.price ?? 0).toFixed(2)}
                </td>
                <td className="px-5 py-4 text-sm text-[var(--muted)]">{product.total_sold ?? 0}</td>
                <td className="px-5 py-4 text-sm text-[var(--muted)]">
                  ★ {Number.isFinite(parseFloat(product.average_rating)) ? parseFloat(product.average_rating).toFixed(1) : '0.0'}
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => featureMutation.mutate({ id: product.id, is_featured: !product.is_featured })}
                    className={`p-1.5 rounded-lg transition-colors ${product.is_featured ? 'text-amber-500 bg-amber-50' : 'text-[var(--border)] hover:text-amber-400'}`}>
                    <Star size={15} className={product.is_featured ? 'fill-amber-400' : ''} />
                  </button>
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => toggleMutation.mutate({ id: product.id, is_active: !product.is_active })}
                    className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                      product.is_active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-[var(--stone)] text-[var(--muted)] hover:bg-[var(--border)]'
                    }`}>
                    {product.is_active ? <><Eye size={11} /> Active</> : <><EyeOff size={11} /> Hidden</>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}