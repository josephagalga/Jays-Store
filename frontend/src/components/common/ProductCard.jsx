import { Link } from 'react-router-dom'
import { ShoppingBag, Heart } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'
import SafeImage from './SafeImage'
import useCartStore from '../../store/cartStore'
import useAuthStore from '../../store/authStore'
import useWishlistStore from '../../store/wishlistStore'

export default function ProductCard({ product, index = 0 }) {
  const { addToCart, isLoading } = useCartStore()
  const { user } = useAuthStore()
  const { toggleWishlist, isWishlisted } = useWishlistStore()
  const wished = isWishlisted(product.id)
  const [visible, setVisible] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  const handleQuickAdd = async (e) => {
    e.preventDefault()
    const v = product.variants?.[0]
    if (!v) return
    await addToCart(product.id, v.id, 1)
  }

  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: `opacity 0.6s ease ${index * 0.08}s, transform 0.6s ease ${index * 0.08}s`
    }}>
      <Link to={`/products/${product.slug}`} className="group block">
        {/* Image */}
        <div className="relative zoom-wrap bg-[var(--off)] rounded-xl overflow-hidden aspect-[3/4]">
          {product.primary_image ? (
            <SafeImage src={product.primary_image} alt={product.name}
              className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag size={28} className="text-[var(--border)]" />
            </div>
          )}

          {/* Sale tag */}
          {product.discount_percentage > 0 && (
            <span className="absolute top-3 left-3 px-2.5 py-1 bg-rose-500 text-white text-[10px] font-semibold rounded-full">
              -{product.discount_percentage}%
            </span>
          )}

          {/* Wishlist — always visible on touch, scales on hover for desktop */}
          <button onClick={e => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product) }}
            aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-3 right-3 w-10 h-10 min-w-[40px] min-h-[40px] bg-white rounded-full flex items-center justify-center shadow-sm transition-all duration-300 hover:scale-110">
            <Heart size={15} className={wished ? 'fill-rose-500 text-rose-500' : 'text-[var(--muted)]'} />
          </button>

          {/* Quick add */}
          {user?.role === 'buyer' && (
            <div className="absolute bottom-3 left-3 right-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
              <button onClick={handleQuickAdd} disabled={isLoading}
                className="w-full bg-white/95 backdrop-blur-sm text-[var(--ink)] text-xs font-semibold py-2.5 rounded-lg hover:bg-white transition-colors shadow-sm">
                Quick Add
              </button>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-3.5 space-y-1">
          {product.brand && (
            <p className="text-[11px] font-medium text-[var(--accent)] uppercase tracking-wider">
              {product.brand}
            </p>
          )}
          <h3 className="text-sm font-medium text-[var(--ink)] line-clamp-1 group-hover:text-[var(--muted)] transition-colors">
            {product.name}
          </h3>
          {product.store_name && (
            <p className="text-[11px] text-[var(--muted)] line-clamp-1">
              Sold by{' '}
              {product.store_slug ? (
                <Link
                  to={`/stores/${product.store_slug}`}
                  onClick={e => e.stopPropagation()}
                  className="font-medium text-[var(--ink)] hover:underline">
                  {product.store_name}
                </Link>
              ) : (
                <span className="font-medium text-[var(--ink)]">{product.store_name}</span>
              )}
              {product.store_verified && <span className="text-green-600"> ✓</span>}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
              <span className="text-sm font-semibold text-[var(--ink)]">
                GHS {parseFloat(product.effective_price).toFixed(2)}
              </span>
              {product.discount_price && (
                <span className="text-xs text-[var(--muted)] line-through font-light">
                  GHS {parseFloat(product.price).toFixed(2)}
                </span>
              )}
            </div>
            {product.total_ratings > 0 && (
              <span className="text-[11px] text-[var(--muted)] flex-shrink-0">
                ★ {parseFloat(product.average_rating).toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </div>
  )
}