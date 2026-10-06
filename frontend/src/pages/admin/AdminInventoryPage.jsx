import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { StatCard } from '../../components/shared/StatCard'
import { adminApi } from '../../services/api'

export default function AdminInventoryPage() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-inventory-stats'],
    queryFn: adminApi.getInventory,
    staleTime: 1000 * 60 * 5,
  })

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['admin-inventory-products'],
    queryFn: () => adminApi.getProducts({}),
    staleTime: 1000 * 60 * 5,
  })

  if (statsLoading || productsLoading) return (
    <>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex justify-center py-32">Loading…</div>
      </div>
    </>
  )

  const products = Array.isArray(productsData) ? productsData : productsData?.results || []
  const lowStock = []
  const outOfStock = []
  products.forEach(p => {
    (p.variants || []).forEach(v => {
      const row = {
        productId: p.id,
        productName: p.name,
        size: v.size,
        color: v.color,
        stock: v.stock ?? 0,
      }
      if ((v.stock ?? 0) === 0) outOfStock.push(row)
      else if ((v.stock ?? 0) <= 5) lowStock.push(row)
    })
  })

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Inventory</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Stock overview across all products and variants</p>
          </div>
          <Link to="/admin/products"
            className="inline-flex items-center justify-center px-5 py-2.5 min-h-[44px] bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity">
            Manage products
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Active Products" value={stats?.total_products ?? products.length} />
          <StatCard label="Out-of-Stock Variants" value={stats?.out_of_stock_variants ?? outOfStock.length} />
          <StatCard label="Low-Stock Variants" value={stats?.low_stock_variants ?? lowStock.length} />
          <StatCard label="Top Sellers Tracked" value={(stats?.top_selling_products || []).length} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="serif text-xl font-medium text-[var(--ink)]">
                Out of stock {outOfStock.length > 0 && `(${outOfStock.length})`}
              </h2>
            </div>
            {!outOfStock.length ? (
              <p className="px-6 py-10 text-sm text-[var(--muted)] text-center">Nothing is out of stock.</p>
            ) : (
              <div className="divide-y divide-[var(--border)] max-h-[420px] overflow-y-auto">
                {outOfStock.map((r, i) => (
                  <div key={`${r.productId}-${r.size}-${r.color}-${i}`} className="px-6 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--ink)] line-clamp-1">{r.productName}</p>
                      <p className="text-xs text-[var(--muted)]">{r.size} · {r.color}</p>
                    </div>
                    <span className="flex-shrink-0 px-2.5 py-1 text-[10px] font-semibold rounded-full bg-rose-50 text-rose-600">Out</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="serif text-xl font-medium text-[var(--ink)]">
                Low stock (1–5 left) {lowStock.length > 0 && `(${lowStock.length})`}
              </h2>
            </div>
            {!lowStock.length ? (
              <p className="px-6 py-10 text-sm text-[var(--muted)] text-center">No low-stock variants.</p>
            ) : (
              <div className="divide-y divide-[var(--border)] max-h-[420px] overflow-y-auto">
                {lowStock.map((r, i) => (
                  <div key={`${r.productId}-${r.size}-${r.color}-${i}`} className="px-6 py-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--ink)] line-clamp-1">{r.productName}</p>
                      <p className="text-xs text-[var(--muted)]">{r.size} · {r.color}</p>
                    </div>
                    <span className="flex-shrink-0 px-2.5 py-1 text-[10px] font-semibold rounded-full bg-amber-50 text-amber-700">{r.stock} left</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {(stats?.top_selling_products || []).length > 0 && (
          <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden mt-6">
            <div className="px-6 py-4 border-b border-[var(--border)]">
              <h2 className="serif text-xl font-medium text-[var(--ink)]">Top selling products</h2>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {(stats.top_selling_products || []).map(p => (
                <div key={p.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--ink)] line-clamp-1 min-w-0">{p.name}</p>
                  <p className="text-xs text-[var(--muted)] flex-shrink-0">{p.total_sold} sold</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
