/**
 * Skeleton loaders — perceived performance on slow networks.
 * Shapes match the real content so there's no layout shift when data arrives.
 */

export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="bg-[var(--stone)] rounded-xl aspect-[3/4]" />
      <div className="mt-3.5 space-y-2">
        <div className="h-3.5 w-3/4 bg-[var(--stone)] rounded-full" />
        <div className="h-3.5 w-1/3 bg-[var(--stone)] rounded-full" />
      </div>
    </div>
  )
}

export function ProductGridSkeleton({ count = 8 }) {
  return (
    <div aria-label="Loading products" role="status"
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 md:gap-x-5 gap-y-10">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div aria-label="Loading product" role="status" className="animate-pulse">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        <div className="bg-[var(--stone)] rounded-2xl aspect-[4/5]" />
        <div className="space-y-5">
          <div className="h-9 w-3/4 bg-[var(--stone)] rounded-xl" />
          <div className="h-7 w-1/3 bg-[var(--stone)] rounded-xl" />
          <div className="h-4 w-full bg-[var(--stone)] rounded-full" />
          <div className="h-4 w-5/6 bg-[var(--stone)] rounded-full" />
          <div className="flex gap-2">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-11 w-14 bg-[var(--stone)] rounded-lg" />
            ))}
          </div>
          <div className="h-12 w-full bg-[var(--stone)] rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function OrderListSkeleton({ count = 3 }) {
  return (
    <div aria-label="Loading orders" role="status" className="space-y-5 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-[var(--border)] rounded-2xl p-6 space-y-3">
          <div className="h-4 w-1/3 bg-[var(--stone)] rounded-full" />
          <div className="h-4 w-full bg-[var(--stone)] rounded-full" />
          <div className="h-4 w-2/3 bg-[var(--stone)] rounded-full" />
        </div>
      ))}
    </div>
  )
}
