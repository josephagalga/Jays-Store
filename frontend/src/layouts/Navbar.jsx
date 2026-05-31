import { Link, useNavigate } from 'react-router-dom'
import { Search, ShoppingBag, X, Menu, User } from 'lucide-react'
import { useState } from 'react'
import useAuthStore from '../store/authStore'
import useCartStore from '../store/cartStore'

export default function Navbar() {
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [query, setQuery] = useState('')
  const { user, isAuthenticated, logout } = useAuthStore()
  const { cart } = useCartStore()
  const navigate = useNavigate()
  const itemCount = cart?.item_count || 0

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(query.trim())}`)
      setSearchOpen(false)
      setQuery('')
    }
  }

  const navLinks = [
    ['New In', '/catalog?sort=new'],
    ['Men', '/catalog?gender=men'],
    ['Women', '/catalog?gender=women'],
    ['Kids', '/catalog?gender=kids'],
    ['Sale', '/catalog?sale=true'],
  ]

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">

            {/* Left nav */}
            <nav className="hidden md:flex items-center gap-7 flex-1">
              {navLinks.map(([label, to]) => (
                <Link key={label} to={to}
                  className={`text-[13px] font-medium transition-colors ${
                    label === 'Sale'
                      ? 'text-rose-500 hover:text-rose-600'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]'
                  }`}>
                  {label}
                </Link>
              ))}
            </nav>

            {/* Logo */}
            <Link to="/"
              className="serif text-[22px] font-medium tracking-wide text-[var(--ink)] flex-1 text-center md:flex-none select-none">
              Jay's Store
            </Link>

            {/* Right */}
            <div className="flex items-center gap-0.5 flex-1 justify-end">
              <button
                onClick={() => setSearchOpen(true)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--off)] transition-all">
                <Search size={17} />
              </button>

              {(!isAuthenticated || user?.role === 'buyer') && (
                <Link to="/cart"
                  className="relative w-9 h-9 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--off)] transition-all">
                  <ShoppingBag size={17} />
                  {itemCount > 0 && (
                    <span className="absolute top-1 right-1 w-[14px] h-[14px] bg-[var(--ink)] text-white text-[8px] font-semibold rounded-full flex items-center justify-center">
                      {itemCount}
                    </span>
                  )}
                </Link>
              )}

              {isAuthenticated ? (
                <div className="relative group ml-1">
                  <button className="w-8 h-8 rounded-full bg-[var(--ink)] text-white text-xs font-semibold flex items-center justify-center hover:opacity-75 transition-opacity">
                    {user?.first_name?.[0]?.toUpperCase()}
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-[var(--border)] rounded-2xl shadow-lg shadow-black/5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                    <div className="px-4 py-3 bg-[var(--off)] border-b border-[var(--border)]">
                      <p className="text-sm font-semibold text-[var(--ink)]">{user?.full_name}</p>
                      <p className="text-xs text-[var(--muted)] capitalize mt-0.5">{user?.role}</p>
                    </div>
                    <div className="p-1.5">
                      {user?.role === 'buyer' && <>
                        <Link to="/profile" className="block px-3 py-2 text-sm text-[var(--ink)] rounded-lg hover:bg-[var(--off)] transition-colors">Profile</Link>
                        <Link to="/orders" className="block px-3 py-2 text-sm text-[var(--ink)] rounded-lg hover:bg-[var(--off)] transition-colors">My Orders</Link>
                        <Link to="/assistant" className="block px-3 py-2 text-sm text-[var(--ink)] rounded-lg hover:bg-[var(--off)] transition-colors">AI Stylist</Link>
                        <Link to="/about" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">About</Link>
                        <Link to="/contact" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">Contact</Link>
                      </>}
                      {user?.role === 'seller' && <Link to="/seller/dashboard" className="block px-3 py-2 text-sm rounded-lg hover:bg-[var(--off)] transition-colors">Dashboard</Link>}
                      {user?.role === 'driver' && <Link to="/driver/dashboard" className="block px-3 py-2 text-sm rounded-lg hover:bg-[var(--off)] transition-colors">Dashboard</Link>}
                      {user?.role === 'admin' && <Link to="/admin/dashboard" className="block px-3 py-2 text-sm rounded-lg hover:bg-[var(--off)] transition-colors">Admin Panel</Link>}
                      <div className="border-t border-[var(--border)] mt-1.5 pt-1.5">
                        <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-rose-500 rounded-lg hover:bg-rose-50 transition-colors">
                          Sign out
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link to="/login"
                  className="ml-1 w-9 h-9 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--off)] transition-all">
                  <User size={17} />
                </Link>
              )}

              <button
                className="md:hidden w-9 h-9 flex items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--off)] transition-all ml-0.5"
                onClick={() => setMenuOpen(!menuOpen)}>
                {menuOpen ? <X size={17} /> : <Menu size={17} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-[var(--border)] bg-white">
            <nav className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
              {navLinks.map(([label, to]) => (
                <Link key={label} to={to}
                  onClick={() => setMenuOpen(false)}
                  className="px-3 py-2.5 text-sm font-medium text-[var(--ink)] rounded-lg hover:bg-[var(--off)] transition-colors">
                  {label}
                </Link>
              ))}
              {!isAuthenticated && (
                <Link to="/login" onClick={() => setMenuOpen(false)}
                  className="px-3 py-2.5 text-sm font-medium text-[var(--ink)] rounded-lg hover:bg-[var(--off)] transition-colors">
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[200] bg-white/98 backdrop-blur-sm flex flex-col"
          style={{ animation: 'fadeIn 0.2s ease' }}>
          <style>{`@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }`}</style>
          <div className="flex items-center justify-between px-6 lg:px-10 py-4 border-b border-[var(--border)]">
            <span className="serif text-lg font-medium text-[var(--ink)]">Search</span>
            <button onClick={() => setSearchOpen(false)}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[var(--off)] transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 flex items-start justify-center pt-20 px-6">
            <form onSubmit={handleSearch} className="w-full max-w-xl">
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search styles, brands, categories..."
                className="w-full bg-transparent text-2xl font-light text-[var(--ink)] border-b-2 border-[var(--ink)] pb-3 outline-none placeholder:text-[var(--border)]"
              />
              <div className="flex justify-end mt-4">
                <button type="submit"
                  className="px-6 py-2.5 bg-[var(--ink)] text-white text-sm font-medium rounded-full hover:opacity-80 transition-opacity">
                  Search
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}