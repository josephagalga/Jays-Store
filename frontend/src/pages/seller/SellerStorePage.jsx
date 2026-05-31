import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Store } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import ProductCard from '../../components/common/ProductCard'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'

export default function SellerStorePage() {
  const { storeSlug } = useParams()

  const { data: seller, isLoading } = useQuery({
    queryKey: ['seller-store', storeSlug],
    queryFn: async () => {
      const res = await api.get(`/accounts/stores/${storeSlug}/`)
      return res.data
    },
  })

  const { data: products } = useQuery({
    queryKey: ['store-products', storeSlug],
    queryFn: async () => {
      const res = await api.get('/products/', { params: { seller_store: storeSlug } })
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
    enabled: !!seller,
  })

  if (isLoading) return (
    <MainLayout>
      <div className="flex justify-center py-32"><Spinner /></div>
    </MainLayout>
  )

  if (!seller) return (
    <MainLayout>
      <div className="text-center py-32">
        <p className="serif text-2xl font-medium">Store not found</p>
      </div>
    </MainLayout>
  )

  return (
    <MainLayout>
      {/* Store banner */}
      <div className="bg-[var(--off)] border-b border-[var(--border)]">
        {seller.store_banner && (
          <div className="h-52 overflow-hidden">
            <img src={seller.store_banner} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 flex items-end gap-5">
          <div className="w-16 h-16 bg-[var(--stone)] rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0">
            {seller.store_logo ? (
              <img src={seller.store_logo} alt="" className="w-full h-full object-cover" />
            ) : (
              <Store size={24} className="text-[var(--muted)]" />
            )}
          </div>
          <div>
            <h1 className="serif text-3xl font-medium text-[var(--ink)]">{seller.store_name}</h1>
            {seller.store_description && (
              <p className="text-sm text-[var(--muted)] mt-1 max-w-lg">{seller.store_description}</p>
            )}
            <div className="flex items-center gap-5 mt-2">
              <span className="text-xs text-[var(--muted)]">★ {parseFloat(seller.seller_average_rating || 0).toFixed(1)} rating</span>
              <span className="text-xs text-[var(--muted)]">{seller.seller_total_sales || 0} sales</span>
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-8">Products</h2>
        {!products?.length ? (
          <div className="text-center py-16 text-[var(--muted)]">No products listed yet</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </div>
    </MainLayout>
  )
}