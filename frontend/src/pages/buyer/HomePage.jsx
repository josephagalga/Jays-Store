import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles, ShoppingBag, Truck, Shield } from 'lucide-react'
import { useRef, useEffect, useState } from 'react'
import MainLayout from '../../layouts/MainLayout'
import ProductCard from '../../components/common/ProductCard'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'

// ── Data hooks ───────────────────────────────────────────────

function useFeaturedProducts() {
  return useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const res = await api.get('/products/featured/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
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

// ── Reveal hook ──────────────────────────────────────────────

function useReveal() {
  const ref = useRef()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])
  return [ref, visible]
}

// ── Horizontal Drag Slider ───────────────────────────────────

function HorizontalSlider({ children }) {
  const trackRef = useRef()
  const isHovering = useRef(false)
  const animRef = useRef()
  const speed = 0.6

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    let pos = 0
    const totalWidth = track.scrollWidth / 2

    const animate = () => {
      if (!isHovering.current) {
        pos += speed
        if (pos >= totalWidth) pos = 0
        track.style.transform = `translateX(-${pos}px)`
      }
      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div
      className="overflow-hidden cursor-grab active:cursor-grabbing"
      onMouseEnter={() => { isHovering.current = true }}
      onMouseLeave={() => { isHovering.current = false }}
    >
      <div ref={trackRef} className="flex gap-4 w-max will-change-transform">
        {children}
        {/* Duplicate for seamless loop */}
        {children}
      </div>
    </div>
  )
}

// ── Hero ─────────────────────────────────────────────────────

// ── Hero ─────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative w-full overflow-hidden flex items-center justify-center" style={{ height: '92vh', minHeight: 560 }}>
      {/* Background Image */}
      <img
        src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=1600&auto=format&fit=crop&q=80"
        alt="Fashion hero"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 max-w-3xl mx-auto mt-8">
        
        <p className="text-[10px] tracking-[0.3em] text-white/80 mb-6 fade-up uppercase"
          style={{ animationDelay: '0s' }}>
          New Season — 2026 Collection
        </p>
        
        <h1 className="serif font-medium text-white leading-[1.1] mb-6 fade-up"
          style={{ fontSize: 'clamp(40px, 8vw, 96px)', animationDelay: '0.15s' }}>
          Fashion <em className="font-normal italic opacity-80">curated</em><br />
          for you.
        </h1>
        
        <p className="text-white/80 text-sm sm:text-base md:text-lg font-light leading-relaxed max-w-md mb-10 fade-up"
          style={{ animationDelay: '0.25s' }}>
          Discover premium clothing from Ghana's finest local sellers, delivered to your door.
        </p>
        
        {/* Buttons */}
        <div className="flex flex-col sm:flex-row flex-wrap gap-4 w-full sm:w-auto justify-center fade-up" style={{ animationDelay: '0.35s' }}>
          <Link to="/catalog"
            className="inline-flex items-center justify-center gap-2.5 px-8 py-3.5 bg-white text-[var(--ink)] text-sm font-semibold rounded-full hover:bg-[var(--off)] transition-colors group">
            Shop Now
            <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link to="/assistant"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-white/40 text-white text-sm font-medium rounded-full hover:bg-white/10 transition-colors">
            <Sparkles size={15} />
            AI Stylist
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.7s ease both; }
      `}</style>
    </section>
  )
}

// ── Trust bar ────────────────────────────────────────────────

function TrustBar() {
  const [ref, visible] = useReveal()
  return (
    <section ref={ref} className={`border-y border-[var(--border)] reveal ${visible ? 'visible' : ''}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
          {[
            [<Truck size={18} />, 'Free Delivery', 'On orders over GHS 300'],
            [<Shield size={18} />, 'Secure Checkout', 'Your data is always safe'],
            [<ShoppingBag size={18} />, 'Local Sellers', 'Supporting Ghanaian fashion'],
          ].map(([icon, title, desc]) => (
            <div key={title} className="flex items-center gap-4 py-5 px-8">
              <div className="text-[var(--muted)]">{icon}</div>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
                <p className="text-xs text-[var(--muted)] font-light mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Categories ───────────────────────────────────────────────

const CAT_STYLES = [
  { bg: 'bg-[var(--ink)]', text: 'text-white' },
  { bg: 'bg-[var(--off)]', text: 'text-[var(--ink)]' },
  { bg: 'bg-[var(--stone)]', text: 'text-[var(--ink)]' },
  { bg: 'bg-[#E8E0D5]', text: 'text-[var(--ink)]' },
]

function Categories({ categories }) {
  const [ref, visible] = useReveal()
  const items = categories?.length
    ? categories.slice(0, 4)
    : [{ id: 1, name: 'Men', slug: 'men' }, { id: 2, name: 'Women', slug: 'women' }, { id: 3, name: 'Kids', slug: 'kids' }, { id: 4, name: 'Accessories', slug: 'unisex' }]

  return (
    <section ref={ref} className={`max-w-7xl mx-auto px-6 lg:px-10 py-20 reveal ${visible ? 'visible' : ''}`}>
      <div className="flex items-end justify-between mb-10">
        <h2 className="serif text-4xl font-medium text-[var(--ink)]">Shop by Category</h2>
        <Link to="/catalog"
          className="hidden md:flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors group">
          All Products
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((cat, i) => {
          const hasImage = !!cat.image;
          
          return (
            <Link key={cat.id || cat.slug}
              to={`/catalog?${categories?.length ? 'category' : 'gender'}=${cat.slug}`}
              className={`${hasImage ? 'bg-[var(--ink)] text-white' : `${CAT_STYLES[i % 4].bg} ${CAT_STYLES[i % 4].text}`} rounded-2xl p-6 aspect-[4/5] flex flex-col justify-between group overflow-hidden relative`}
            >
              {hasImage && (
                <>
                  {/* Image is now fully visible (no opacity-20) */}
                  <img src={cat.image} alt={cat.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 z-0" 
                  />
                  {/* Gradient overlay to ensure text readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black/80 z-10 transition-opacity duration-300" />
                </>
              )}
              
              <div className={`relative z-20 w-8 h-8 rounded-full bg-current opacity-10`} />
              
              <div className="relative z-20 mt-auto">
                <h3 className="serif text-2xl font-medium mb-2">{cat.name}</h3>
                <div className="flex items-center gap-1.5 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore <ArrowRight size={11} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

// ── Featured products (New Arrivals) ─────────────────────────

function Featured({ products }) {
  const [ref, visible] = useReveal()
  return (
    // Reduced padding: pt-16 (top), pb-0 (bottom) to close the gap
    <section ref={ref} className={`max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-0 reveal ${visible ? 'visible' : ''}`}>
      <div className="flex items-end justify-between mb-8">
        <h2 className="serif text-4xl font-medium text-[var(--ink)]">New Arrivals</h2>
        <Link to="/catalog"
          className="hidden md:flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors group">
          View All
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {!products ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-[var(--off)]">
          <ShoppingBag size={32} className="mx-auto text-[var(--border)] mb-3" />
          <p className="text-sm text-[var(--muted)]">No products yet — check back soon</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-10">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}
    </section>
  )
}

// ── Horizontal auto-scroll banner (The "Sandwich" Section) ──────────

function SliderBanner({ products }) {
  const [ref, visible] = useReveal()
  
  if (!products?.length) return null

  const items = [...products, ...products]

  return (
    // Tightened padding: py-8 (shrunk from 20/12)
    <section ref={ref} className={`py-8 bg-[var(--off)] mt-16 reveal ${visible ? 'visible' : ''}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 mb-6 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-widest mb-1">
            Trending Now
          </p>
          <h2 className="serif text-2xl font-medium text-[var(--ink)]">Popular Picks</h2>
        </div>
        <Link to="/catalog"
          className="hidden md:flex items-center gap-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors group">
          Shop All <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <HorizontalSlider>
        {items.map((product, i) => (
          <Link key={`${product.id}-${i}`} to={`/products/${product.slug}`}
            className="flex-shrink-0 w-52 group">
            <div className="rounded-xl overflow-hidden aspect-[3/4] bg-white mb-3 relative shadow-sm">
              {product.primary_image ? (
                <img src={product.primary_image} alt={product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag size={24} className="text-[var(--border)]" />
                </div>
              )}
            </div>
            <p className="text-[11px] font-medium text-[var(--muted)] truncate group-hover:text-[var(--ink)] transition-colors">
              {product.name}
            </p>
            <p className="text-xs font-bold text-[var(--ink)] mt-0.5">
              GHS {parseFloat(product.effective_price).toFixed(2)}
            </p>
          </Link>
        ))}
      </HorizontalSlider>
    </section>
  )
}

// ── AI banner ────────────────────────────────────────────────

function AIBanner() {
  const [ref, visible] = useReveal()
  return (
    // Minimal top padding (pt-8) to stay close to the slider above
    <section ref={ref} className={`max-w-7xl mx-auto px-6 lg:px-10 pt-8 pb-16 reveal ${visible ? 'visible' : ''}`}>
      <div className="bg-[var(--ink)] rounded-3xl p-8 lg:p-14 grid lg:grid-cols-2 gap-10 items-center shadow-2xl">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-white/70 text-[10px] font-bold uppercase tracking-wider mb-6">
            <Sparkles size={12} />
            Powered by Gemini AI
          </div>
          <h2 className="serif text-4xl lg:text-5xl font-medium text-white leading-tight mb-4">
            Not sure what<br />
            <em className="italic font-normal text-white/50">to wear?</em>
          </h2>
          <p className="text-white/50 text-sm font-light leading-relaxed mb-8 max-w-sm">
            Tell our AI your occasion, budget, and style. It will find your perfect outfit from our full catalog instantly.
          </p>
          <Link to="/assistant"
            className="inline-flex items-center gap-2.5 px-6 py-3 bg-white text-[var(--ink)] text-sm font-semibold rounded-full hover:bg-[var(--off)] transition-colors group">
            <Sparkles size={14} />
            Try AI Stylist
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Sample chat bubbles */}
        <div className="flex flex-col gap-3">
          {[
            ['user', 'I need a casual outfit for a beach day under GHS 200'],
            ['ai', 'I found 6 perfect matches — lightweight linen shirts starting at GHS 89, paired with relaxed shorts...'],
            ['user', 'Show me something in blue'],
          ].map(([role, msg], i) => (
            <div key={i}
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm font-light ${
                role === 'user'
                  ? 'self-end bg-white text-[var(--ink)] rounded-br-sm shadow-lg'
                  : 'self-start bg-white/10 text-white/80 rounded-bl-sm border border-white/5'
              }`}>
              {msg}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Join section ─────────────────────────────────────────────

function JoinSection() {
  const [ref, visible] = useReveal()
  return (
    <section ref={ref} className={`max-w-7xl mx-auto px-6 lg:px-10 pb-20 reveal ${visible ? 'visible' : ''}`}>
      <div className="grid md:grid-cols-2 gap-5">
        {[
          {
            label: 'For Sellers',
            title: 'Open your store today',
            desc: 'Sell your fashion to thousands of buyers across Ghana. Zero upfront cost, instant setup.',
            cta: 'Start Selling',
            to: '/register/seller',
            bg: 'bg-[var(--off)]',
          },
          {
            label: 'For Drivers',
            title: 'Earn on your schedule',
            desc: 'Deliver fashion orders across the city and earn competitive pay on your own time.',
            cta: 'Become a Driver',
            to: '/register/driver',
            bg: 'bg-[var(--stone)]',
          },
        ].map(({ label, title, desc, cta, to, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-10 flex flex-col justify-between min-h-[260px] group`}>
            <div>
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-widest mb-4">{label}</p>
              <h3 className="serif text-3xl font-medium text-[var(--ink)] mb-3">{title}</h3>
              <p className="text-sm text-[var(--muted)] font-light leading-relaxed max-w-xs">{desc}</p>
            </div>
            <Link to={to}
              className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)] hover:gap-3 transition-all">
              {cta} <ArrowRight size={14} />
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Page ─────────────────────────────────────────────────────

export default function HomePage() {
  const { data: featured } = useFeaturedProducts()
  const { data: categories } = useCategories()

  return (
    <MainLayout>
      <Hero />
      <TrustBar />
      <Categories categories={categories} />
      <Featured products={featured} />
      <SliderBanner products={featured} />
      <AIBanner />
      <JoinSection />
    </MainLayout>
  )
}