import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ShoppingBag, CheckCircle, MapPin, Copy } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import SafeImage from '../../components/common/SafeImage'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'
import toast from 'react-hot-toast'

export default function StorePage() {
  const { handle } = useParams()
  const { data, isLoading } = useQuery({
    queryKey: ['store', handle],
    queryFn: async () => {
      const res = await api.get(`/store/${handle}/`)
      return res.data
    },
  })

  const copyLink = () => {
    navigator.clipboard?.writeText(window.location.href)
    toast.success('Store link copied!')
  }

  if (isLoading) return <MainLayout><div className="flex justify-center py-32"><Spinner /></div></MainLayout>
  if (!data) return <MainLayout><div className="max-w-4xl mx-auto py-24 text-center"><h2 className="serif text-3xl">Store Not Found</h2></div></MainLayout>

  const products = data.products || []

  return (
    <MainLayout>
      <div>
        {/* Cover Banner */}
        <div className="relative w-full h-64 md:h-96 bg-gradient-to-br from-amber-900 to-amber-700 overflow-hidden">
          {data.store_banner && <img src={data.store_banner} alt="Banner" className="w-full h-full object-cover opacity-40" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex items-end gap-6">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-2xl flex-shrink-0 bg-white">
              {data.store_logo ? <img src={data.store_logo} alt={data.store_name} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-amber-100 flex items-center justify-center text-amber-900 font-bold text-2xl">{data.store_name?.[0]}</div>}
            </div>
            <div className="text-white pb-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="serif text-3xl md:text-4xl font-medium">{data.store_name}</h1>
                {data.verified && <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wide">Verified</span>}
              </div>
              <p className="text-white/90 text-sm md:text-base mb-2">{data.store_description || 'Welcome to our store.'}</p>
              <div className="flex items-center gap-3 text-xs text-white/70">
                <span className="flex items-center gap-1"><MapPin size={12}/> {data.store_address || 'No address'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 -mt-4 relative z-10">
          <div className="bg-white rounded-2xl shadow-lg border border-[var(--border)] p-4 flex items-center gap-4">
            <button onClick={copyLink} className="flex items-center gap-2 px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"><Copy size={14}/> Copy Store Link</button>
            <a href={`https://wa.me/?text=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] underline">Share on WhatsApp</a>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
          <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-6">Products</h2>
          {products.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No products listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(p => (
                <Link key={p.id} to={`/products/${p.slug}`} className="group bg-white rounded-2xl overflow-hidden border border-[var(--border)] shadow-sm hover:shadow-xl transition-all duration-300">
                  <div className="relative w-full aspect-[3/4] overflow-hidden bg-[var(--off)]">
                    <SafeImage src={p.primary_image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-[var(--ink)] line-clamp-1 group-hover:text-amber-700 transition-colors">{p.name}</h3>
                    <p className="text-xs text-[var(--muted)] mt-1">{p.category || 'Fashion'}</p>
                    <p className="font-bold text-[var(--ink)] mt-2">GHS {parseFloat(p.effective_price || p.price).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </MainLayout>
  )
}
