import { useState, useRef, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Star, ShoppingBag, Heart, ChevronLeft, ChevronRight } from 'lucide-react'
import ShareButtons from '../../components/common/ShareButtons'
import MainLayout from '../../layouts/MainLayout'
import SafeImage from '../../components/common/SafeImage'
import ProductCard from '../../components/common/ProductCard'
import { ProductDetailSkeleton } from '../../components/common/Skeletons'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import useCartStore from '../../store/cartStore'
import useGuestCartStore from '../../store/guestCartStore'
import useAuthStore from '../../store/authStore'
import useWishlistStore from '../../store/wishlistStore'
import toast from 'react-hot-toast'

// ── Write Review ──────────────────────────────────────────────



const FIT_OPTIONS = [
  { value: '', label: 'Skip' },
  { value: 'runs_small', label: 'Runs small' },
  { value: 'true_to_size', label: 'True to size' },
  { value: 'runs_large', label: 'Runs large' },
]

const FIT_LABEL = { runs_small: 'Runs small', true_to_size: 'True to size', runs_large: 'Runs large' }

function ReviewCard({ review, slug }) {
  const qc = useQueryClient()
  const [voting, setVoting] = useState(false)
  const [voted, setVoted] = useState(!!review.has_voted_helpful)
  const [votes, setVotes] = useState(review.helpful_votes || 0)

  const vote = async () => {
    if (voting) return
    setVoting(true)
    try {
      const res = await api.voteHelpful(review.id)
      if (typeof res.data?.helpful_votes === 'number') {
        setVotes(res.data.helpful_votes)
      }
      setVoted(prev => !prev)
      qc.invalidateQueries(['reviews', slug])
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not vote')
    } finally {
      setVoting(false)
    }
  }

  return (
    <div className="bg-[var(--off)] rounded-2xl p-6">
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
      {review.fit && (
        <p className="mb-2">
          <span className="inline-block text-[11px] font-medium text-[var(--ink)] bg-white border border-[var(--border)] px-2.5 py-1 rounded-full">
            Fit: {FIT_LABEL[review.fit] || review.fit}
          </span>
        </p>
      )}
      <p className="text-sm text-[var(--muted)] font-light leading-relaxed">
        {review.body}
      </p>
      {review.images?.length > 0 && (
        <div className="flex gap-2 flex-wrap mt-3">
          {review.images.map(img => (
            <SafeImage key={img.id} src={img.image_url || img.image} alt=""
              className="w-16 h-20 rounded-lg object-cover border border-[var(--border)]" />
          ))}
        </div>
      )}
      <div className="flex items-center justify-between mt-3">
        <p className="text-xs text-[var(--muted)]">
          {new Date(review.created_at).toLocaleDateString('en-GH')}
        </p>
        <button type="button" onClick={vote} disabled={voting}
          aria-pressed={voted}
          className={`text-xs font-medium px-3 py-2 min-h-[44px] rounded-full border transition-colors ${
            voted
              ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
              : 'bg-white text-[var(--muted)] border-[var(--border)] hover:border-[var(--ink)]'
          }`}>
          Helpful{votes > 0 ? ` (${votes})` : ''}
        </button>
      </div>
    </div>
  )
}

function FitMeter({ summary }) {
  const small = Number(summary?.fit_runs_small || 0)
  const trueSize = Number(summary?.fit_true_to_size || 0)
  const large = Number(summary?.fit_runs_large || 0)
  const total = small + trueSize + large
  if (!total) return null
  const rows = [
    ['runs_small', small],
    ['true_to_size', trueSize],
    ['runs_large', large],
  ]
  const top = rows.reduce((a, b) => (b[1] > a[1] ? b : a))
  return (
    <div className="bg-[var(--off)] rounded-2xl p-5 mb-6">
      <p className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1">
        Fit feedback
      </p>
      <p className="text-sm text-[var(--muted)] mb-4">
        Most buyers say: <strong className="text-[var(--ink)]">{FIT_LABEL[top[0]]}</strong> ({total} vote{total === 1 ? '' : 's'})
      </p>
      <div className="space-y-2">
        {rows.map(([key, count]) => (
          <div key={key} className="flex items-center gap-3">
            <span className="text-xs text-[var(--muted)] w-20 flex-shrink-0">{FIT_LABEL[key]}</span>
            <div className="flex-1 h-2 bg-white rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--ink)] rounded-full transition-all"
                style={{ width: `${Math.round((count / total) * 100)}%` }}
              />
            </div>
            <span className="text-xs text-[var(--muted)] w-8 text-right flex-shrink-0">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function WriteReview({ productId, slug, autoOpen = false, requirePurchase = false, hasPurchased = null }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [fit, setFit] = useState('')
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

  const [photos, setPhotos] = useState([])
  const [photoError, setPhotoError] = useState('')

  const pickPhotos = (e) => {
    setPhotoError('')
    const files = Array.from(e.target.files || []).slice(0, 3 - photos.length)
    const ok = []
    for (const f of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        setPhotoError('Only JPG, PNG or WebP photos allowed')
        continue
      }
      if (f.size > 5 * 1024 * 1024) {
        setPhotoError('Each photo must be under 5MB')
        continue
      }
      ok.push({ file: f, preview: URL.createObjectURL(f) })
    }
    if (photos.length + ok.length > 3) {
      setPhotoError('Maximum 3 photos per review')
    }
    setPhotos(prev => [...prev, ...ok].slice(0, 3))
    e.target.value = ''
  }

  const removePhoto = (idx) => {
    setPhotos(prev => {
      try { URL.revokeObjectURL(prev[idx]?.preview) } catch { /* ignore */ }
      return prev.filter((_, i) => i !== idx)
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!rating) return toast.error('Please select a rating')
    setSubmitting(true)
    try {
      const res = await api.post('/reviews/create/', {
        product: productId,
        rating,
        title,
        body,
        fit,
      })
      const reviewId = res.data?.id
      if (reviewId && photos.length) {
        let uploaded = 0
        for (const p of photos) {
          try {
            await api.uploadReviewImage(reviewId, p.file)
            uploaded += 1
          } catch {
            // one failed photo must not fail the whole review
          }
        }
        if (uploaded < photos.length) {
          toast.error('Review saved, but some photos failed to upload')
        }
      }
      photos.forEach(p => { try { URL.revokeObjectURL(p.preview) } catch { /* ignore */ } })
      toast.success('Review submitted!')
      setSubmitted(true)
      qc.invalidateQueries(['reviews', slug])
      qc.invalidateQueries(['review-summary', slug])
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

  if (requirePurchase && hasPurchased === false) return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800 mb-6">
      Only buyers who have received this product can write a review. Order it and review after delivery.
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
            maxLength={100}
            placeholder="Summarise your experience"
            className="w-full px-4 py-3 text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors placeholder:text-[var(--muted)] placeholder:opacity-70"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
            How did it fit?{' '}
            <span className="font-normal text-[var(--muted)] normal-case">(optional, apparel)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {FIT_OPTIONS.map(o => (
              <button key={o.value || 'skip'} type="button"
                onClick={() => setFit(o.value)}
                aria-pressed={fit === o.value}
                className={`px-4 py-2 min-h-[44px] text-sm font-medium rounded-full border transition-all ${
                  fit === o.value
                    ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                    : 'bg-white text-[var(--muted)] border-[var(--border)] hover:border-[var(--ink)]'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
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
            maxLength={2000}
            placeholder="Share your thoughts about this product..."
            className="w-full px-4 py-3 text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors resize-none placeholder:text-[var(--muted)] placeholder:opacity-70"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
            Photos{' '}
            <span className="font-normal text-[var(--muted)] normal-case">(optional, up to 3)</span>
          </label>
          <input
            type="file" accept="image/jpeg,image/png,image/webp" multiple
            onChange={pickPhotos}
            className="w-full px-4 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors"
          />
          {photoError && <p className="text-xs text-red-600">{photoError}</p>}
          {photos.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {photos.map((p, i) => (
                <div key={i} className="relative w-16 h-20 rounded-lg overflow-hidden border border-[var(--border)]">
                  <img src={p.preview} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removePhoto(i)} aria-label="Remove photo"
                    className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white text-xs rounded-full flex items-center justify-center">
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
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
  const addGuestItem = useGuestCartStore(s => s.addGuestItem)
  const { user } = useAuthStore()
  const { toggleWishlist, isWishlisted } = useWishlistStore()
  const isBuyer = user?.role === 'buyer'
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

  const { data: fitSummary } = useQuery({
    queryKey: ['review-summary', slug],
    queryFn: async () => {
      const res = await api.get(`/reviews/products/${slug}/summary/`)
      return res.data
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

  const { data: myOrders } = useQuery({
    queryKey: ['my-orders-check', product?.id],
    queryFn: async () => {
      const res = await api.get('/orders/')
      const orders = Array.isArray(res.data) ? res.data : res.data.results || []
      return orders
    },
    enabled: !!product?.id && user?.role === 'buyer',
  })

  const hasPurchased = (() => {
    if (user?.role !== 'buyer' || !product?.id || !myOrders) return null
    return myOrders.some(o =>
      o.status === 'delivered' &&
      (o.items?.some(i => i.product === product.id || i.product_slug === slug))
    )
  })()

  useEffect(() => {
    if (product?.id && user?.role === 'buyer') {
      api.post(`/recommendations/view/${product.id}/`).catch(() => {})
    }
  }, [product?.id, user?.role])

  if (loadingProduct) return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <ProductDetailSkeleton />
      </div>
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

  // When a colour with its own photo is picked, preview that variant image first
  const selectedVariant = getVariant()
  const variantPreview = selectedVariant?.image_url || selectedVariant?.image || null
  const gallery = variantPreview ? [{ url: variantPreview }, ...images] : images
  const activeImg = gallery[imgIndex]?.url || null

  const handleAddToCart = async () => {
    const variant = getVariant()
    if (!variant) return toast.error('Please select size and colour')
    if (!variant.is_in_stock) return toast.error('This variant is out of stock')
    if (isBuyer) {
      await addToCart(product.id, variant.id, qty)
    } else {
      addGuestItem({ product, variant, quantity: qty })
    }
  }

  return (
    <MainLayout>
      <div className={`max-w-7xl mx-auto px-6 lg:px-10 py-10 ${(isBuyer || !user) ? 'pb-28 md:pb-10' : ''}`}>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[var(--muted)] mb-8">
          <Link to="/" className="hover:text-[var(--ink)] transition-colors">Home</Link>
          <span>/</span>
          <Link to="/catalog" className="hover:text-[var(--ink)] transition-colors">Shop</Link>
          <span>/</span>
          <span className="text-[var(--ink)]">{product.name}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">

          {/* Images */}
          <div className="space-y-3">
            <div className="relative aspect-[4/5] bg-[var(--off)] rounded-2xl overflow-hidden">
              {activeImg ? (
                <SafeImage
                  key={activeImg}
                  src={activeImg}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag size={48} className="text-[var(--border)]" />
                </div>
              )}
              {variantPreview && imgIndex === 0 && (
                <span className="absolute top-3 left-3 text-[10px] font-semibold bg-[var(--ink)] text-white px-2.5 py-1 rounded-full">
                  {selectedColor} colourway
                </span>
              )}
              {gallery.length > 1 && (
                <>
                  <button
                    onClick={() => setImgIndex(Math.max(0, imgIndex - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setImgIndex(Math.min(gallery.length - 1, imgIndex + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {gallery.map((img, i) => (
                  <button key={i} onClick={() => setImgIndex(i)}
                    className={`flex-shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${imgIndex === i ? 'border-[var(--ink)]' : 'border-transparent'}`}>
                    <SafeImage src={img.url} alt="" className="w-full h-full object-cover" />
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
              <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] leading-tight mb-3">
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

            <ShareButtons
              title={`${product.name} — GHS ${parseFloat(product.effective_price || 0).toFixed(2)} on My Jay's Store`}
              path={`/products/${product.slug}`}
            />

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

            {/* Seller */}
            {product.store_name && (
              <div className="flex items-center gap-3 bg-white border border-[var(--border)] rounded-xl p-4">
                {product.store_logo_url ? (
                  <SafeImage src={product.store_logo_url} alt={product.store_name}
                    className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[var(--ink)] text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {product.store_name?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--muted)]">Sold by</p>
                  <p className="text-sm font-semibold text-[var(--ink)] line-clamp-1">
                    {product.store_name}
                    {product.store_verified && <span className="text-green-600 font-medium"> ✓ Verified</span>}
                  </p>
                </div>
                {product.store_slug && (
                  <Link to={`/stores/${product.store_slug}`}
                    className="flex-shrink-0 px-4 py-2 min-h-[44px] inline-flex items-center text-xs font-semibold text-[var(--ink)] border border-[var(--border)] rounded-full hover:border-[var(--ink)] transition-colors">
                    Visit store
                  </Link>
                )}
              </div>
            )}

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
                      className={`px-4 py-2 min-h-[44px] min-w-[44px] text-sm font-medium rounded-lg border transition-all ${
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
                    aria-label="Decrease quantity"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--muted)] hover:bg-[var(--off)] transition-colors text-lg">
                    −
                  </button>
                  <span className="w-12 text-center text-sm font-semibold">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    aria-label="Increase quantity"
                    className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-[var(--muted)] hover:bg-[var(--off)] transition-colors text-lg">
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Add to bag — guests shop with a local bag, no account needed.
                Demo showcase items are display-only and cannot be purchased. */}
            {product.is_demo ? (
              <div className="bg-[var(--off)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-center">
                <p className="text-sm font-semibold text-[var(--ink)]">Display only</p>
                <p className="text-xs text-[var(--muted)] mt-1">
                  This showcase piece isn't for sale — browse vendor stores for buyable items.
                </p>
              </div>
            ) : (isBuyer || !user ? (
              <div className="flex gap-3">
                <Button
                  size="full"
                  loading={isLoading}
                  onClick={handleAddToCart}
                  className="rounded-xl flex-1">
                  <ShoppingBag size={16} />
                  Add to Bag
                </Button>
                <button
                  type="button"
                  onClick={() => toggleWishlist(product)}
                  aria-label="Toggle wishlist"
                  className="w-12 h-12 min-w-[48px] min-h-[48px] border border-[var(--border)] rounded-xl flex items-center justify-center hover:border-[var(--ink)] transition-colors">
                  <Heart size={16} className={isWishlisted(product.id) ? 'fill-rose-500 text-rose-500' : 'text-[var(--muted)]'} />
                </button>
              </div>
            ) : null)}
            {!user && !product.is_demo && (
              <p className="text-xs text-[var(--muted)]">
                No account needed — <Link to="/login" className="underline text-[var(--ink)]">sign in</Link> anytime to sync your bag across devices.
              </p>
            )}

            {/* Pre-purchase reassurance */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {[
                ['Secure Paystack checkout', 'MoMo & cards accepted'],
                ['OTP-secured handoff', 'Driver needs your code'],
                ['7-day easy returns', 'Defective? Full refund'],
              ].map(([title, sub]) => (
                <div key={title} className="bg-[var(--off)] rounded-xl px-3 py-3 text-center">
                  <p className="text-[11px] font-semibold text-[var(--ink)] leading-tight">{title}</p>
                  <p className="text-[10px] text-[var(--muted)] leading-tight mt-1">{sub}</p>
                </div>
              ))}
            </div>
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
              requirePurchase={true}
              hasPurchased={hasPurchased}
            />
          )}

          <FitMeter summary={fitSummary} />

          {reviews?.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-5">
              {reviews.map(review => (
                <ReviewCard key={review.id} review={review} slug={slug} />
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-3 md:gap-x-5 gap-y-10">
              {similar.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky mobile buy bar — hidden for display-only demo items */}
      {(isBuyer || !user) && !product.is_demo && (
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-[var(--border)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-[11px] text-[var(--muted)] leading-none mb-1">Total</p>
              <p className="text-base font-bold text-[var(--ink)] leading-none">
                GHS {parseFloat(product.effective_price).toFixed(2)}
              </p>
            </div>
            <Button
              size="full"
              loading={isLoading}
              onClick={handleAddToCart}
              className="rounded-xl flex-1">
              <ShoppingBag size={16} />
              Add to Bag
            </Button>
          </div>
        </div>
      )}
    </MainLayout>
  )
}