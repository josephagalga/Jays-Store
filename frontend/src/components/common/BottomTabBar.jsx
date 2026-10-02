import { Link, useLocation } from 'react-router-dom'
import { Home, LayoutGrid, Heart, ShoppingBag, User } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import useCartStore from '../../store/cartStore'
import useWishlistStore from '../../store/wishlistStore'

/**
 * Mobile-only bottom tab bar — primary navigation lives in the thumb zone.
 * Rendered by MainLayout (buyer/public pages). Dashboards keep their own nav.
 */
export default function BottomTabBar() {
  const location = useLocation()
  const { user, isAuthenticated } = useAuthStore()
  const { cart } = useCartStore()
  const { wishlistIds } = useWishlistStore()

  const bagCount = cart?.item_count || 0
  const wishCount = wishlistIds?.length || 0

  const accountTo =
    !isAuthenticated ? '/login'
    : user?.role === 'seller' ? '/seller/dashboard'
    : user?.role === 'driver' ? '/driver/dashboard'
    : user?.role === 'admin' ? '/admin/dashboard'
    : '/profile'

  const tabs = [
    { label: 'Home', to: '/', icon: Home, badge: 0, match: (p) => p === '/' },
    { label: 'Shop', to: '/catalog', icon: LayoutGrid, badge: 0, match: (p) => p.startsWith('/catalog') || p.startsWith('/products') },
    { label: 'Saved', to: '/wishlist', icon: Heart, badge: wishCount, match: (p) => p.startsWith('/wishlist') },
    { label: 'Bag', to: '/cart', icon: ShoppingBag, badge: bagCount, match: (p) => p.startsWith('/cart') || p.startsWith('/checkout') },
    { label: 'Account', to: accountTo, icon: User, badge: 0, match: (p) => ['/profile', '/login', '/orders', '/assistant'].some(x => p.startsWith(x)) },
  ]

  return (
    <nav aria-label="Primary"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--border)]">
      <div className="grid grid-cols-5 px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
        {tabs.map(({ label, to, icon: Icon, badge, match }) => {
          const active = match(location.pathname)
          return (
            <Link key={label} to={to} aria-label={label} aria-current={active ? 'page' : undefined}
              onClick={() => { if (location.pathname === to) window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className={`relative flex flex-col items-center gap-0.5 py-1.5 min-h-[56px] justify-center rounded-xl transition-colors ${
                active ? 'text-[var(--ink)]' : 'text-[var(--muted)]'
              }`}>
              <span className="relative">
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] leading-none ${active ? 'font-semibold' : 'font-normal'}`}>
                {label}
              </span>
              {active && <span className="absolute bottom-0.5 w-8 h-0.5 rounded-full bg-[var(--ink)]" />}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
