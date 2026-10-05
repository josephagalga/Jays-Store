import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import useAuthStore from './store/authStore'

// Auth pages
import LoginPage from './pages/auth/LoginPage'
import BuyerRegisterPage from './pages/auth/BuyerRegisterPage'
import DriverRegisterPage from './pages/auth/DriverRegisterPage'
import SellerRegisterPage from './pages/auth/SellerRegisterPage'

// Buyer pages
import HomePage from './pages/buyer/HomePage'
import CatalogPage from './pages/buyer/CatalogPage'
import ProductDetailPage from './pages/buyer/ProductDetailPage'
import CartPage from './pages/buyer/CartPage'
import CheckoutPage from './pages/buyer/CheckoutPage'
import OrdersPage from './pages/buyer/OrdersPage'
import OrderTrackingPage from './pages/buyer/OrderTrackingPage'
import BuyerOrderReceiptPage from './pages/buyer/BuyerOrderReceiptPage'
import GuestTrackPage from './pages/buyer/GuestTrackPage'
import StorePage from './pages/buyer/StorePage'
import VendorsPage from './pages/buyer/VendorsPage'
import AIChatPage from './pages/buyer/AIChatPage'
import BuyerProfilePage from './pages/buyer/BuyerProfilePage'
import WishlistPage from './pages/buyer/WishlistPage'

// Seller pages
import SellerDashboardPage from './pages/seller/SellerDashboardPage'
import SellerProductsPage from './pages/seller/SellerProductsPage'
import SellerAddProductPage from './pages/seller/SellerAddProductPage'
import SellerStorePage from './pages/seller/SellerStorePage'
import SellerOrdersPage from './pages/seller/SellerOrdersPage'
import SellerWalletPage from './pages/seller/SellerWalletPage'
import SellerPayoutsPage from './pages/seller/SellerPayoutsPage'

// Driver pages
import DriverDashboardPage from './pages/driver/DriverDashboardPage'
import DriverOrdersPage from './pages/driver/DriverOrdersPage'
import DriverHistoryPage from './pages/driver/DriverHistoryPage'

// Admin pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminProductsPage from './pages/admin/AdminProductsPage'
import AdminOrdersPage from './pages/admin/AdminOrdersPage'
import AdminDriversPage from './pages/admin/AdminDriversPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminPayoutsPage from './pages/admin/AdminPayoutsPage'
import AdminCommissionPage from './pages/admin/AdminCommissionPage'
import AdminFinancePage from './pages/admin/AdminFinancePage'
import AdminSellerEarningsPage from './pages/admin/AdminSellerEarningsPage'
import AdminCommissionAuditLogsPage from './pages/admin/AdminCommissionAuditLogsPage'
import AdminContactMessagesPage from './pages/admin/AdminContactMessagesPage'
import AdminNewsletterPage from './pages/admin/AdminNewsletterPage'
import AdminEmailLogsPage from './pages/admin/AdminEmailLogsPage'
import AdminPayoutActionsPage from './pages/admin/AdminPayoutActionsPage'
import AdminInventoryPage from './pages/admin/AdminInventoryPage'
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage'

// General pages
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'
import RefundPage from './pages/RefundPage'
import ShippingPage from './pages/ShippingPage'
import HelpCenterPage from './pages/HelpCenterPage'

// ── Route guards ──────────────────────────────────────────────

function useIsHydrated() {
  const [hydrated, setHydrated] = useState(
    () => useAuthStore.persist?.hasHydrated?.() ?? true
  )
  useEffect(() => {
    if (!useAuthStore.persist?.onFinishHydration) return
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])
  return hydrated
}

function hasToken() {
  return !!localStorage.getItem('access_token')
}

function PrivateRoute({ children, roles }) {
  const hydrated = useIsHydrated()
  const { isAuthenticated, user } = useAuthStore()

  // Wait for persisted auth to rehydrate — otherwise a reload on a
  // protected page flashes /login while the landing page also renders.
  if (!hydrated) {
    return <div className="flex justify-center py-32 text-sm text-[var(--muted)]">Loading…</div>
  }

  if (!isAuthenticated || !hasToken()) return <Navigate to="/login" replace />

  // If roles required but user role not loaded yet, wait
  if (roles && !user?.role) return null

  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />

  return children
}

function PublicOnlyRoute({ children }) {
  const hydrated = useIsHydrated()
  const { isAuthenticated, user } = useAuthStore()

  if (!hydrated) {
    return <div className="flex justify-center py-32 text-sm text-[var(--muted)]">Loading…</div>
  }

  // Only bounce logged-in users with a live token; a stale persisted
  // flag + expired token used to flip /login and / at the same time.
  if (isAuthenticated && hasToken()) {
    const map = {
      buyer: '/',
      seller: '/seller/dashboard',
      driver: '/driver/dashboard',
      admin: '/admin/dashboard',
    }
    return <Navigate to={map[user?.role] || '/'} replace />
  }
  return children
}

// ── Dashboard layout ──────────────────────────────────────────

function DashboardLayout({ children }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const handleLogout = () => {
    logout()
    setMobileNavOpen(false)
    navigate('/login', { replace: true })
  }

  const navLinks = {
    seller: [
      { label: 'Dashboard', to: '/seller/dashboard' },
      { label: 'My Products', to: '/seller/products' },
      { label: 'Add Product', to: '/seller/products/add' },
      { label: 'My Orders', to: '/seller/orders' },
      { label: 'Wallet', to: '/seller/wallet' },
      { label: 'Payouts', to: '/seller/payouts' },
      { label: 'View Store', to: user?.store_slug ? `/stores/${user.store_slug}` : '/' },
    ],
    driver: [
      { label: 'Dashboard', to: '/driver/dashboard' },
      { label: 'Available Orders', to: '/driver/orders' },
      { label: 'My Deliveries', to: '/driver/history' },
    ],
    admin: [
      { label: 'Dashboard', to: '/admin/dashboard' },
      { label: 'Products', to: '/admin/products' },
      { label: 'Inventory', to: '/admin/inventory' },
      { label: 'Categories', to: '/admin/categories' },
      { label: 'Orders', to: '/admin/orders' },
      { label: 'Finance', to: '/admin/finance' },
      { label: 'Seller Earnings', to: '/admin/seller-earnings' },
      { label: 'Settlements', to: '/admin/payouts' },
      { label: 'Payout Actions', to: '/admin/payout-actions' },
      { label: 'Commissions', to: '/admin/commissions' },
      { label: 'Audit Logs', to: '/admin/commission-audit-logs' },
      { label: 'Drivers', to: '/admin/drivers' },
      { label: 'Users', to: '/admin/users' },
      { label: 'Messages', to: '/admin/contact-messages' },
      { label: 'Newsletter', to: '/admin/newsletter' },
      { label: 'Email Logs', to: '/admin/email-logs' },
    ],
  }

  const links = navLinks[user?.role] || []

  return (
    <div className="min-h-screen bg-[var(--off)] flex flex-col">
      <header className="bg-white border-b border-[var(--border)] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between gap-6">
          <Link to="/" className="serif text-lg font-medium text-[var(--ink)] flex-shrink-0">
            Jay's Store
          </Link>

          <nav className="hidden md:flex items-center gap-1 flex-1">
            {links.map(({ label, to }) => (
              <Link key={label} to={to}
                className="px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--off)] rounded-lg transition-all">
                {label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-[var(--ink)] leading-none">
                {user?.full_name || user?.store_name}
              </p>
              <p className="text-xs text-[var(--muted)] capitalize mt-0.5">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="hidden md:block text-sm font-medium text-rose-500 hover:text-rose-600 transition-colors">
              Sign out
            </button>
            <button
              onClick={() => setMobileNavOpen(v => !v)}
              aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileNavOpen}
              className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--off)] transition-colors">
              {mobileNavOpen ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
              )}
            </button>
          </div>
        </div>

        {mobileNavOpen && (
          <nav className="md:hidden border-t border-[var(--border)] bg-white px-6 py-3 flex flex-col gap-1">
            {links.map(({ label, to }) => (
              <Link key={label} to={to}
                onClick={() => setMobileNavOpen(false)}
                className="px-3 py-2.5 text-sm font-medium text-[var(--ink)] rounded-lg hover:bg-[var(--off)] transition-colors">
                {label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="text-left px-3 py-2.5 text-sm font-medium text-rose-500 rounded-lg hover:bg-rose-50 transition-colors">
              Sign out
            </button>
          </nav>
        )}
      </header>

      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────

export default function App() {
  return (
    <Routes>
      {/* Public auth */}
      <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
      <Route path="/register" element={<PublicOnlyRoute><BuyerRegisterPage /></PublicOnlyRoute>} />
      <Route path="/register/driver" element={<PublicOnlyRoute><DriverRegisterPage /></PublicOnlyRoute>} />
      <Route path="/register/seller" element={<PublicOnlyRoute><SellerRegisterPage /></PublicOnlyRoute>} />

      {/* General pages */}
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/refund" element={<RefundPage />} />
      <Route path="/shipping" element={<ShippingPage />} />
      <Route path="/help" element={<HelpCenterPage />} />

      {/* Public buyer */}
      <Route path="/" element={<HomePage />} />
      <Route path="/catalog" element={<CatalogPage />} />
      <Route path="/vendors" element={<VendorsPage />} />
      <Route path="/products/:slug" element={<ProductDetailPage />} />
      <Route path="/stores/:storeSlug" element={<SellerStorePage />} />

      {/* Vendor storefront */}
      <Route path="/store/:handle" element={<PrivateRoute roles={['buyer']}><StorePage /></PrivateRoute>} />

      {/* Bag + checkout work for guests too (guest bag + guest checkout) */}
      <Route path="/cart" element={<CartPage />} />
      <Route path="/checkout" element={<CheckoutPage />} />
      <Route path="/track/:reference" element={<GuestTrackPage />} />

      {/* Protected buyer */}
      <Route path="/orders" element={<PrivateRoute roles={['buyer']}><OrdersPage /></PrivateRoute>} />
      <Route path="/orders/:id/track" element={<PrivateRoute roles={['buyer']}><OrderTrackingPage /></PrivateRoute>} />
      <Route path="/orders/:id/receipt" element={<PrivateRoute roles={['buyer']}><BuyerOrderReceiptPage /></PrivateRoute>} />
      <Route path="/wishlist" element={<PrivateRoute roles={['buyer']}><WishlistPage /></PrivateRoute>} />
      <Route path="/assistant" element={<PrivateRoute roles={['buyer']}><AIChatPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute roles={['buyer']}><BuyerProfilePage /></PrivateRoute>} />

      {/* Seller */}
      <Route path="/seller/dashboard" element={
        <PrivateRoute roles={['seller']}>
          <DashboardLayout><SellerDashboardPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/seller/products" element={
        <PrivateRoute roles={['seller']}>
          <DashboardLayout><SellerProductsPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/seller/products/add" element={
        <PrivateRoute roles={['seller']}>
          <DashboardLayout><SellerAddProductPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/seller/orders" element={
        <PrivateRoute roles={['seller']}>
          <DashboardLayout><SellerOrdersPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/seller/wallet" element={
        <PrivateRoute roles={['seller']}>
          <DashboardLayout><SellerWalletPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/seller/payouts" element={
        <PrivateRoute roles={['seller']}>
          <DashboardLayout><SellerPayoutsPage /></DashboardLayout>
        </PrivateRoute>
      } />

      {/* Driver */}
      <Route path="/driver/dashboard" element={
        <PrivateRoute roles={['driver']}>
          <DashboardLayout><DriverDashboardPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/driver/orders" element={
        <PrivateRoute roles={['driver']}>
          <DashboardLayout><DriverOrdersPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/driver/history" element={
        <PrivateRoute roles={['driver']}>
          <DashboardLayout><DriverHistoryPage /></DashboardLayout>
        </PrivateRoute>
      } />

      {/* Admin */}
      <Route path="/admin/dashboard" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminDashboardPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/products" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminProductsPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/orders" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminOrdersPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/drivers" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminDriversPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/users" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminUsersPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/payouts" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminPayoutsPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/commissions" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminCommissionPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/finance" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminFinancePage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/seller-earnings" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminSellerEarningsPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/commission-audit-logs" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminCommissionAuditLogsPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/contact-messages" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminContactMessagesPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/newsletter" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminNewsletterPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/email-logs" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminEmailLogsPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/payout-actions" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminPayoutActionsPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/inventory" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminInventoryPage /></DashboardLayout>
        </PrivateRoute>
      } />
      <Route path="/admin/categories" element={
        <PrivateRoute roles={['admin']}>
          <DashboardLayout><AdminCategoriesPage /></DashboardLayout>
        </PrivateRoute>
      } />

      {/* 404 — unknown URLs used to render blank, which looked like a stuck double-render */}
      <Route path="*" element={
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="serif text-4xl font-medium text-[var(--ink)]">Page not found</p>
          <p className="text-sm text-[var(--muted)]">The page you’re looking for doesn’t exist.</p>
          <Link to="/" className="text-sm font-medium text-[var(--ink)] underline underline-offset-4">
            Back to home
          </Link>
        </div>
      } />
    </Routes>
  )
}