import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Package, Eye, EyeOff, Star } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function AdminProductsPage() {
  const qc = useQueryClient()

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const res = await api.get('/products/manage/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) =>
      api.patch(`/products/manage/${id}/`, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-products'])
      toast.success('Product updated')
    },
  })

  const featureMutation = useMutation({
    mutationFn: ({ id, is_featured }) =>
      api.patch(`/products/manage/${id}/`, { is_featured }),
    onSuccess: () => {
      qc.invalidateQueries(['admin-products'])
      toast.success('Product updated')
    },
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="flex items-center justify-between mb-10">
        <h1 className="serif text-4xl font-medium text-[var(--ink)]">All Products</h1>
        <span className="text-sm text-[var(--muted)]">{products?.length || 0} total</span>
      </div>

      <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
        <table className="w-full">
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
                      {product.images?.[0]?.image ? (
                        <img src={product.images[0].image} alt="" className="w-full h-full object-cover" />
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
                  GHS {parseFloat(product.price).toFixed(2)}
                </td>
                <td className="px-5 py-4 text-sm text-[var(--muted)]">{product.total_sold}</td>
                <td className="px-5 py-4 text-sm text-[var(--muted)]">
                  ★ {parseFloat(product.average_rating).toFixed(1)}
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