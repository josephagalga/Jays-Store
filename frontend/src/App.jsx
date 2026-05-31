import { Routes, Route, Navigate } from 'react-router-dom'
import { Link } from 'react-router-dom'
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
import AIChatPage from './pages/buyer/AIChatPage'
import BuyerProfilePage from './pages/buyer/BuyerProfilePage'

// Seller pages
import SellerDashboardPage from './pages/seller/SellerDashboardPage'
import SellerProductsPage from './pages/seller/SellerProductsPage'
import SellerAddProductPage from './pages/seller/SellerAddProductPage'
import SellerStorePage from './pages/seller/SellerStorePage'

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

// General pages
import AboutPage from './pages/AboutPage'
import ContactPage from './pages/ContactPage'

// ── Route guards ──────────────────────────────────────────────

function PrivateRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore()
  if (isAuthenticated) {
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

  const navLinks = {
    seller: [
      { label: 'Dashboard', to: '/seller/dashboard' },
      { label: 'My Products', to: '/seller/products' },
      { label: 'Add Product', to: '/seller/products/add' },
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
      { label: 'Orders', to: '/admin/orders' },
      { label: 'Drivers', to: '/admin/drivers' },
      { label: 'Users', to: '/admin/users' },
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

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-[var(--ink)] leading-none">
                {user?.full_name || user?.store_name}
              </p>
              <p className="text-xs text-[var(--muted)] capitalize mt-0.5">{user?.role}</p>
            </div>
            <button
              onClick={logout}
              className="text-sm font-medium text-rose-500 hover:text-rose-600 transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
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

      {/* Public buyer */}
      <Route path="/" element={<HomePage />} />
      <Route path="/catalog" element={<CatalogPage />} />
      <Route path="/products/:slug" element={<ProductDetailPage />} />
      <Route path="/stores/:storeSlug" element={<SellerStorePage />} />

      {/* Protected buyer */}
      <Route path="/cart" element={<PrivateRoute roles={['buyer']}><CartPage /></PrivateRoute>} />
      <Route path="/checkout" element={<PrivateRoute roles={['buyer']}><CheckoutPage /></PrivateRoute>} />
      <Route path="/orders" element={<PrivateRoute roles={['buyer']}><OrdersPage /></PrivateRoute>} />
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
    </Routes>
  )
}