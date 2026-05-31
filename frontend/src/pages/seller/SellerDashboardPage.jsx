import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Package, TrendingUp, ShoppingBag, Star, Plus } from 'lucide-react'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'

export default function SellerDashboardPage() {
  const { user } = useAuthStore()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['seller-profile'],
    queryFn: async () => {
      const res = await api.get('/accounts/profile/seller/')
      return res.data
    },
  })

  const { data: products } = useQuery({
    queryKey: ['seller-products'],
    queryFn: async () => {
      const res = await api.get('/products/manage/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
  })



  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  const stats = [
    { icon: <TrendingUp size={20} />, label: 'Total Revenue', value: `GHS ${parseFloat(profile?.seller_total_revenue || 0).toFixed(2)}` },
    { icon: <ShoppingBag size={20} />, label: 'Total Sales', value: profile?.seller_total_sales || 0 },
    { icon: <Package size={20} />, label: 'Products Listed', value: profile?.seller_total_products || 0 },
    { icon: <Star size={20} />, label: 'Avg Rating', value: parseFloat(profile?.seller_average_rating || 0).toFixed(1) },
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-sm text-[var(--muted)] mb-1">Welcome back,</p>
          <h1 className="serif text-4xl font-medium text-[var(--ink)]">{profile?.store_name || user?.full_name}</h1>
        </div>
        <Link to="/seller/products/add"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity">
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map(({ icon, label, value }) => (
          <div key={label} className="bg-[var(--off)] rounded-2xl p-6">
            <div className="text-[var(--muted)] mb-3">{icon}</div>
            <p className="text-2xl font-bold text-[var(--ink)]">{value}</p>
            <p className="text-xs text-[var(--muted)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent products */}
      <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="serif text-xl font-medium text-[var(--ink)]">My Products</h2>
          <Link to="/seller/products" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
            View all
          </Link>
        </div>
        {!products?.length ? (
          <div className="text-center py-16">
            <Package size={32} className="mx-auto text-[var(--border)] mb-3" />
            <p className="text-sm text-[var(--muted)]">No products yet</p>
            <Link to="/seller/products/add" className="text-sm font-medium text-[var(--ink)] hover:underline mt-2 inline-block">
              Add your first product
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {products.slice(0, 5).map(product => (
              <div key={product.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-14 bg-[var(--off)] rounded-lg overflow-hidden flex-shrink-0">
                    {product.images?.[0]?.image ? (
                      <img src={product.images[0].image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={16} className="text-[var(--border)]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{product.name}</p>
                    <p className="text-xs text-[var(--muted)]">GHS {parseFloat(product.price).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${product.is_active ? 'bg-green-50 text-green-600' : 'bg-[var(--stone)] text-[var(--muted)]'}`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="text-xs text-[var(--muted)]">{product.total_sold} sold</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}