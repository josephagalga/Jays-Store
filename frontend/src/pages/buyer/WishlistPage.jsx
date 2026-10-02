import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import ProductCard from '../../components/common/ProductCard'
import Spinner from '../../components/ui/Spinner'
import useWishlistStore from '../../store/wishlistStore'

export default function WishlistPage() {
  const { wishlistItems, isLoading, fetchWishlistItems } = useWishlistStore()

  useEffect(() => {
    fetchWishlistItems()
  }, [])

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-[var(--border)]">
          <div>
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">My Wishlist</h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              {wishlistItems.length} {wishlistItems.length === 1 ? 'saved item' : 'saved items'}
            </p>
          </div>
          <Link
            to="/catalog"
            className="flex items-center gap-1.5 text-sm font-medium text-[var(--ink)] hover:text-[var(--muted)] transition-colors">
            Continue Shopping <ArrowRight size={14} />
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24"><Spinner /></div>
        ) : wishlistItems.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-20">
            <div className="w-16 h-16 bg-[var(--off)] rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart size={28} className="text-[var(--muted)]" />
            </div>
            <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-2">Your wishlist is empty</h2>
            <p className="text-sm text-[var(--muted)] mb-8">
              Explore our collection and click the heart icon on any product to save it for later.
            </p>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--ink)] text-white text-sm font-semibold rounded-full hover:opacity-80 transition-opacity">
              <ShoppingBag size={15} />
              Explore Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
            {wishlistItems.map((item, i) => (
              <ProductCard key={item.id} product={item.product} index={i} />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
