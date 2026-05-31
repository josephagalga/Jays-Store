import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Plus, Package, Edit, Eye, EyeOff } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function SellerProductsPage() {
  const qc = useQueryClient()

  const { data: products, isLoading } = useQuery({
    queryKey: ['seller-products'],
    queryFn: async () => {
      const res = await api.get('/products/manage/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }) =>
      api.patch(`/products/manage/${id}/`, { is_active }),
    onSuccess: () => {
      qc.invalidateQueries(['seller-products'])
      toast.success('Product updated')
    },
  })

  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="flex items-center justify-between mb-10">
        <h1 className="serif text-4xl font-medium text-[var(--ink)]">My Products</h1>
        <Link to="/seller/products/add"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity">
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {!products?.length ? (
        <div className="text-center py-24 border border-dashed border-[var(--border)] rounded-2xl">
          <Package size={40} className="mx-auto text-[var(--border)] mb-4" />
          <p className="serif text-2xl font-medium text-[var(--ink)] mb-2">No products yet</p>
          <p className="text-sm text-[var(--muted)] mb-6">Add your first product to start selling</p>
          <Link to="/seller/products/add"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity">
            <Plus size={16} /> Add Product
          </Link>
        </div>
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-[var(--off)] border-b border-[var(--border)]">
              <tr>
                {['Product', 'Price', 'Stock', 'Sold', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {products.map(product => (
                <tr key={product.id} className="hover:bg-[var(--off)] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-12 bg-[var(--off)] rounded-lg overflow-hidden flex-shrink-0">
                        {product.images?.[0]?.image ? (
                          <img src={product.images[0].image} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package size={14} className="text-[var(--border)]" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink)]">{product.name}</p>
                        <p className="text-xs text-[var(--muted)] capitalize">{product.gender}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-medium">GHS {parseFloat(product.price).toFixed(2)}</td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">
                    {product.variants?.reduce((acc, v) => acc + v.stock, 0) || 0}
                  </td>
                  <td className="px-5 py-4 text-sm text-[var(--muted)]">{product.total_sold}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${product.is_active ? 'bg-green-50 text-green-600' : 'bg-[var(--stone)] text-[var(--muted)]'}`}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Link to={`/products/${product.slug}`}
                        className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                        <Edit size={15} />
                      </Link>
                      <button
                        onClick={() => toggleMutation.mutate({ id: product.id, is_active: !product.is_active })}
                        className="p-1.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                        {product.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}