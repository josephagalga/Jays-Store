import { useState, useRef, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Star, ShoppingBag, Heart, ChevronLeft, ChevronRight } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import ProductCard from '../../components/common/ProductCard'
import Spinner from '../../components/ui/Spinner'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import useCartStore from '../../store/cartStore'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

// ── Write Review ──────────────────────────────────────────────



function WriteReview({ productId, slug, autoOpen = false }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [open, setOpen] = useState(autoOpen)
  const qc = useQueryClient()
  const formRef = useRef(null)

  useEffect(() => {
    if (autoOpen && formRef.current) {
      setTimeout(() => {
        formRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 400)
    }
  }, [autoOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!rating) return toast.error('Please select a rating')
    setSubmitting(true)
    try {
      await api.post('/reviews/create/', {
        product: productId,
        rating,
        title,
        body,
      })
      toast.success('Review submitted!')
      setSubmitted(true)
      qc.invalidateQueries(['reviews', slug])
      qc.invalidateQueries(['product', slug])
    } catch (err) {
      const data = err.response?.data
      const msg =
        (typeof data === 'string' ? data : null) ||
        data?.non_field_errors?.[0] ||
        data?.detail ||
        (data && Object.values(data)[0]?.[0]) ||
        'Could not submit review'
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return (
    <div className="bg-green-50 border border-green-100 rounded-2xl p-5 text-sm text-green-700 font-medium mb-6">
      ✓ Your review has been submitted. Thank you!
    </div>
  )

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-5 py-2.5 mb-8 border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--ink)] hover:border-[var(--ink)] transition-colors bg-white">
      <Star size={15} className="text-amber-400" />
      Write a Review
    </button>
  )

  return (
    <div ref={formRef} className="bg-[var(--off)] rounded-2xl p-6 mb-8 border border-[var(--border)]">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-[var(--ink)] uppercase tracking-wider">
          Write a Review
        </h3>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-2">
            Your Rating
          </p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} type="button"
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setRating(s)}
                className="transition-transform hover:scale-110 focus:outline-none">
                <Star size={26}
                  className={(hover || rating) >= s
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-[var(--border)]'} />
              </button>
            ))}
            {rating > 0 && (
              <span className="text-xs text-[var(--muted)] ml-2">
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][rating]}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
            Title{' '}
            <span className="font-normal text-[var(--muted)] normal-case">(optional)</span>
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Summarise your experience"
            className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
            Review{' '}
            <span className="font-normal text-[var(--muted)] normal-case">(optional)</span>
          </label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={3}
            placeholder="Share your thoughts about this product..."
            className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors resize-none"
          />
        </div>

        <Button type="submit" loading={submitting} size="md">
          Submit Review
        </Button>
      </form>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────

export default function ProductDetailPage() {
  const { slug } = useParams()
  const location = useLocation()
  const { addToCart, isLoading } = useCartStore()
  const { user } = useAuthStore()
  const [selectedSize, setSelectedSize] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [imgIndex, setImgIndex] = useState(0)
  const [qty, setQty] = useState(1)

  const autoOpenReview = location.state?.openReview === true

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const res = await api.get(`/products/${slug}/`)
      return res.data
    },
  })

  const { data: reviews } = useQuery({
    queryKey: ['reviews', slug],
    queryFn: async () => {
      const res = await api.get(`/reviews/products/${slug}/`)
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
    enabled: !!product,
  })

  const { data: similar } = useQuery({
    queryKey: ['similar', product?.id],
    queryFn: async () => {
      const res = await api.get(`/recommendations/similar/${product.id}/`)
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
    enabled: !!product?.id,
  })

  useEffect(() => {
    if (product?.id && user?.role === 'buyer') {
      api.post(`/recommendations/view/${product.id}/`).catch(() => {})
    }
  }, [product?.id, user?.role])

  if (loadingProduct) return (
    <MainLayout>
      <div className="flex justify-center py-32"><Spinner /></div>
    </MainLayout>
  )

  if (!product) return (
    <MainLayout>
      <div className="text-center py-32">
        <p className="serif text-2xl font-medium text-[var(--ink)]">Product not found</p>
        <Link to="/catalog"
          className="text-sm text-[var(--muted)] mt-3 inline-block hover:text-[var(--ink)]">
          Back to catalog
        </Link>
      </div>
    </MainLayout>
  )

  const images = product.images || []
  const sizes = [...new Set(product.variants?.map(v => v.size) || [])]
  const colors = [...new Set(product.variants?.map(v => v.color) || [])]

  const getVariant = () => product.variants?.find(v =>
    (!selectedSize || v.size === selectedSize) &&
    (!selectedColor || v.color === selectedColor)
  )

  const handleAddToCart = async () => {
    const variant = getVariant()
    if (!variant) return toast.error('Please select size and colour')
    if (!variant.is_in_stock) return toast.error('This variant is out of stock')
    await addToCart(product.id, variant.id, qty)
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-8">
          <Link to="/" className="hover:text-[var(--ink)] transition-colors">Home</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-[var(--ink)] transition-colors">Shop</Link>
          <span>/</span>
          <span className="text-[var(--ink)]">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">

          {/* Images */}
          <div className="space-y-3">
            <div className="relative aspect-[4/5] bg-[var(--off)] rounded-2xl overflow-hidden">
              {images[imgIndex]?.url ? (
                <img
                  src={images[imgIndex].url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag size={48} className="text-[var(--border)]" />
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIndex(Math.max(0, imgIndex - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setImgIndex(Math.min(images.length - 1, imgIndex + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setImgIndex(i)}
                    className={`flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${imgIndex === i ? 'border-[var(--ink)]' : 'border-transparent'}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col gap-6">
            {product.brand && (
              <p className="text-xs font-semibold text-[var(--accent)] uppercase tracking-widest">
                {product.brand}
              </p>
            )}

            <div>
              <h1 className="serif text-4xl font-medium text-[var(--ink)] leading-tight mb-3">
                {product.name}
              </h1>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={14}
                      className={s <= Math.round(product.average_rating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-[var(--border)]'} />
                  ))}
                </div>
                <span className="text-sm text-[var(--muted)]">
                  ({product.total_ratings} reviews)
                </span>
              </div>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-[var(--ink)]">
                GHS {parseFloat(product.effective_price).toFixed(2)}
              </span>
              {product.discount_price && (
                <span className="text-lg text-[var(--muted)] line-through font-light">
                  GHS {parseFloat(product.price).toFixed(2)}
                </span>
              )}
              {product.discount_percentage > 0 && (
                <span className="px-2.5 py-1 bg-rose-50 text-rose-500 text-xs font-semibold rounded-full">
                  -{product.discount_percentage}% OFF
                </span>
              )}
            </div>

            <p className="text-sm text-[var(--muted)] leading-relaxed">
              {product.description}
            </p>

            {/* Sizes */}
            {sizes.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-3">
                  Size
                </p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map(size => (
                    <button key={size}
                      onClick={() => setSelectedSize(size === selectedSize ? null : size)}
                      className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
                        selectedSize === size
                          ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                          : 'bg-white text-[var(--ink)] border-[var(--border)] hover:border-[var(--ink)]'
                      }`}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Colors */}
            {colors.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-3">
                  Colour{selectedColor && (
                    <span className="font-normal text-[var(--muted)] normal-case ml-1">
                      — {selectedColor}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {colors.map(color => {
                    const variant = product.variants?.find(v => v.color === color)
                    return (
                      <button key={color}
                        onClick={() => setSelectedColor(color === selectedColor ? null : color)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all flex items-center gap-2 ${
                          selectedColor === color
                            ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                            : 'bg-white text-[var(--ink)] border-[var(--border)] hover:border-[var(--ink)]'
                        }`}>
                        {variant?.color_hex && (
                          <span
                            className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
                            style={{ background: variant.color_hex }}
                          />
                        )}
                        {color}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quantity */}
            {user?.role === 'buyer' && (
              <div>
                <p className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-3">
                  Quantity
                </p>
                <div className="flex items-center border border-[var(--border)] rounded-xl overflow-hidden w-fit">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-10 h-10 flex items-center justify-center text-[var(--muted)] hover:bg-[var(--off)] transition-colors text-lg">
                    −
                  </button>
                  <span className="w-12 text-center text-sm font-semibold">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="w-10 h-10 flex items-center justify-center text-[var(--muted)] hover:bg-[var(--off)] transition-colors text-lg">
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Add to cart */}
            {user?.role === 'buyer' ? (
              <div className="flex gap-3">
                <Button
                  size="full"
                  loading={isLoading}
                  onClick={handleAddToCart}
                  className="rounded-xl flex-1">
                  <ShoppingBag size={16} />
                  Add to Cart
                </Button>
                <button className="w-12 h-12 border border-[var(--border)] rounded-xl flex items-center justify-center hover:border-[var(--ink)] transition-colors">
                  <Heart size={16} className="text-[var(--muted)]" />
                </button>
              </div>
            ) : !user ? (
              <Link to="/login"
                className="inline-flex items-center justify-center gap-2 w-full py-3 bg-[var(--ink)] text-white text-sm font-semibold rounded-xl hover:opacity-80 transition-opacity">
                Sign in to purchase
              </Link>
            ) : null}
          </div>
        </div>

        {/* Reviews */}
        <section className="mt-20" id="reviews">
          <div className="flex items-end justify-between mb-8">
            <h2 className="serif text-3xl font-medium text-[var(--ink)]">
              Customer Reviews
              {product.total_ratings > 0 && (
                <span className="text-[var(--muted)] font-normal text-xl ml-3">
                  ★ {parseFloat(product.average_rating).toFixed(1)}{' '}
                  ({product.total_ratings})
                </span>
              )}
            </h2>
          </div>

          {user?.role === 'buyer' && (
            <WriteReview
              productId={product.id}
              slug={slug}
              autoOpen={autoOpenReview}
            />
          )}

          {reviews?.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-5">
              {reviews.map(review => (
                <div key={review.id} className="bg-[var(--off)] rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {review.buyer_name}
                    </p>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12}
                          className={s <= review.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-[var(--border)]'} />
                      ))}
                    </div>
                  </div>
                  {review.title && (
                    <p className="text-sm font-medium mb-1">{review.title}</p>
                  )}
                  <p className="text-sm text-[var(--muted)] font-light leading-relaxed">
                    {review.body}
                  </p>
                  <p className="text-xs text-[var(--muted)] mt-3">
                    {new Date(review.created_at).toLocaleDateString('en-GH')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-[var(--border)] rounded-2xl">
              <Star size={28} className="mx-auto text-[var(--border)] mb-3" />
              <p className="text-sm text-[var(--muted)]">
                No reviews yet — be the first to review
              </p>
            </div>
          )}
        </section>

        {/* Similar products */}
        {similar?.length > 0 && (
          <section className="mt-20">
            <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-8">
              You Might Also Like
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-10">
              {similar.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>
    </MainLayout>
  )
}