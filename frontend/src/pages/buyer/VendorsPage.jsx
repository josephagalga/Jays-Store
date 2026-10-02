import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Store, Search, Star } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'

export default function VendorsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialQ = searchParams.get('search') || ''
  const [query, setQuery] = useState(initialQ)
  const [submitted, setSubmitted] = useState(initialQ)

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors', submitted],
    queryFn: async () => {
      const res = await api.fetchVendors(submitted)
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
  })

  const onSearch = (e) => {
    e.preventDefault()
    const q = query.trim()
    setSubmitted(q)
    setSearchParams(q ? { search: q } : {})
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <p className="text-sm text-[var(--muted)] mb-1">Marketplace</p>
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-2">Browse Vendors</h1>
        <p className="text-sm text-[var(--muted)] mb-8">
          Discover independent sellers and shop their collections.
        </p>

        <form onSubmit={onSearch} className="flex gap-2 max-w-xl mb-10">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search vendors by store name..."
              className="w-full pl-11 pr-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors placeholder:text-[var(--border)]"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity">
            Search
          </button>
        </form>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : !vendors?.length ? (
          <div className="text-center py-20 border border-dashed border-[var(--border)] rounded-2xl">
            <Store size={36} className="mx-auto text-[var(--border)] mb-4" />
            <p className="serif text-2xl font-medium text-[var(--ink)] mb-2">No vendors found</p>
            <p className="text-sm text-[var(--muted)]">
              {submitted ? `Nothing matches "${submitted}". Try another name.` : 'Check back soon for new sellers.'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vendors.map(v => (
              <Link
                key={v.id}
                to={`/stores/${v.store_slug}`}
                className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 transition-all group">
                <div className="h-28 bg-[var(--off)] overflow-hidden">
                  {v.banner_url ? (
                    <img src={v.banner_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store size={28} className="text-[var(--border)]" />
                    </div>
                  )}
                </div>
                <div className="p-5 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--off)] overflow-hidden flex items-center justify-center flex-shrink-0 -mt-10 border-2 border-white shadow-sm">
                    {v.logo_url ? (
                      <img src={v.logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store size={18} className="text-[var(--muted)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[var(--ink)] line-clamp-1">{v.store_name}</p>
                    {v.store_description && (
                      <p className="text-xs text-[var(--muted)] line-clamp-2 mt-1 leading-relaxed">{v.store_description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--muted)]">
                      <span className="flex items-center gap-1">
                        <Star size={11} className="fill-amber-400 text-amber-400" />
                        {parseFloat(v.seller_average_rating || 0).toFixed(1)}
                      </span>
                      <span>{v.seller_total_sales || 0} sales</span>
                      <span>{v.product_count ?? 0} products</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
