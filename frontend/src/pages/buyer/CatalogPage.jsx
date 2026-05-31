import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import ProductCard from '../../components/common/ProductCard'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'

function useProducts(params) {
  return useQuery({
    queryKey: ['products', params],
    queryFn: async () => {
      const res = await api.get('/products/', { params })
      return res.data
    },
  })
}

function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/products/categories/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
  })
}

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)

  const filters = {
    search: searchParams.get('search') || '',
    gender: searchParams.get('gender') || '',
    category: searchParams.get('category') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    ordering: searchParams.get('ordering') || '-created_at',
  }

  const { data, isLoading } = useProducts(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
  )
  const { data: categories } = useCategories()

  const products = data?.results || data || []
  const total = data?.count || products.length

  const set = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const clearAll = () => setSearchParams({})

  const hasFilters = filters.gender || filters.category || filters.min_price || filters.max_price

  const sortOptions = [
    ['-created_at', 'Newest'],
    ['price', 'Price: Low to High'],
    ['-price', 'Price: High to Low'],
    ['-average_rating', 'Top Rated'],
    ['-total_sold', 'Best Selling'],
  ]

  const genders = ['Men', 'Women', 'Kids', 'Unisex']

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">

        {/* Header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="serif text-4xl font-medium text-[var(--ink)]">
              {filters.search ? `Results for "${filters.search}"` : 'All Products'}
            </h1>
            {!isLoading && (
              <p className="text-sm text-[var(--muted)] mt-1">{total} items</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {hasFilters && (
              <button onClick={clearAll}
                className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                <X size={14} /> Clear filters
              </button>
            )}
            <button onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-xl text-sm font-medium hover:border-[var(--ink)] transition-colors">
              <SlidersHorizontal size={15} />
              Filters
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-xl text-sm font-medium hover:border-[var(--ink)] transition-colors">
                {sortOptions.find(([v]) => v === filters.ordering)?.[1] || 'Sort'}
                <ChevronDown size={14} />
              </button>
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-[var(--border)] rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
                {sortOptions.map(([value, label]) => (
                  <button key={value} onClick={() => set('ordering', value)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--off)] transition-colors ${filters.ordering === value ? 'font-semibold text-[var(--ink)]' : 'text-[var(--muted)]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filter panel */}
        {filtersOpen && (
          <div className="bg-[var(--off)] rounded-2xl p-6 mb-8 grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Gender */}
            <div>
              <p className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-3">Gender</p>
              <div className="flex flex-wrap gap-2">
                {genders.map(g => (
                  <button key={g} onClick={() => set('gender', filters.gender === g.toLowerCase() ? '' : g.toLowerCase())}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                      filters.gender === g.toLowerCase()
                        ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                        : 'bg-white text-[var(--muted)] border-[var(--border)] hover:border-[var(--ink)]'
                    }`}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <p className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-3">Category</p>
              <div className="flex flex-col gap-1.5">
                {categories?.map(cat => (
                  <button key={cat.id} onClick={() => set('category', filters.category === cat.slug ? '' : cat.slug)}
                    className={`text-left text-sm transition-colors ${
                      filters.category === cat.slug ? 'font-semibold text-[var(--ink)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
                    }`}>
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price */}
            <div>
              <p className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-3">Price (GHS)</p>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Min"
                  value={filters.min_price}
                  onChange={e => set('min_price', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white outline-none focus:border-[var(--ink)]" />
                <span className="text-[var(--muted)]">—</span>
                <input type="number" placeholder="Max"
                  value={filters.max_price}
                  onChange={e => set('max_price', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white outline-none focus:border-[var(--ink)]" />
              </div>
            </div>

            {/* Close */}
            <div className="flex items-end">
              <button onClick={() => setFiltersOpen(false)}
                className="px-5 py-2.5 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity">
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="flex justify-center py-24"><Spinner /></div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <p className="serif text-2xl font-medium text-[var(--ink)] mb-2">No products found</p>
            <p className="text-sm text-[var(--muted)]">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
            {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
          </div>
        )}
      </div>
    </MainLayout>
  )
}