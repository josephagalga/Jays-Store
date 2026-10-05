import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Star, Package } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import SafeImage from '../../components/common/SafeImage'
import Spinner from '../../components/ui/Spinner'
import api from '../../services/api'

const FIT_LABEL = { runs_small: 'Runs small', true_to_size: 'True to size', runs_large: 'Runs large' }

export default function MyReviewsPage() {
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['my-reviews'],
    queryFn: async () => {
      const res = await api.getMyReviews()
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
  })

  if (isLoading) return (
    <MainLayout>
      <div className="flex justify-center py-32"><Spinner /></div>
    </MainLayout>
  )

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-2">My Reviews</h1>
        <p className="text-sm text-[var(--muted)] mb-10">
          {reviews?.length || 0} review{(reviews?.length || 0) === 1 ? '' : 's'} written
        </p>

        {!reviews?.length ? (
          <div className="text-center py-20 border border-dashed border-[var(--border)] rounded-2xl">
            <Star size={36} className="mx-auto text-[var(--border)] mb-4" />
            <p className="serif text-2xl font-medium text-[var(--ink)] mb-2">No reviews yet</p>
            <p className="text-sm text-[var(--muted)] mb-6">Reviews appear here after your orders are delivered.</p>
            <Link to="/orders" className="text-sm font-medium text-[var(--ink)] underline underline-offset-4">
              Go to My Orders
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map(review => (
              <div key={review.id} className="bg-white border border-[var(--border)] rounded-2xl p-5 md:p-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={13}
                        className={s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-[var(--border)]'} />
                    ))}
                  </div>
                  <span className="text-xs text-[var(--muted)]">
                    {new Date(review.created_at).toLocaleDateString('en-GH')}
                  </span>
                </div>
                {review.title && <p className="text-sm font-semibold text-[var(--ink)] mb-1">{review.title}</p>}
                {review.fit && (
                  <p className="mb-2">
                    <span className="inline-block text-[11px] font-medium text-[var(--ink)] bg-[var(--off)] border border-[var(--border)] px-2.5 py-1 rounded-full">
                      Fit: {FIT_LABEL[review.fit] || review.fit}
                    </span>
                  </p>
                )}
                {review.body && (
                  <p className="text-sm text-[var(--muted)] font-light leading-relaxed">{review.body}</p>
                )}
                {review.images?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-3">
                    {review.images.map(img => (
                      <SafeImage key={img.id} src={img.image_url || img.image} alt=""
                        className="w-16 h-20 rounded-lg object-cover border border-[var(--border)]" />
                    ))}
                  </div>
                )}
                <p className="text-xs text-[var(--muted)] mt-3 flex items-center gap-1.5">
                  <Package size={12} /> {review.helpful_votes || 0} found this helpful
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
