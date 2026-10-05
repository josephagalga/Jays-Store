export function StatusBadge({ status, className }) {
  const variants = {
    default: 'bg-[var(--off)] text-[var(--muted)]',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-600',
    info: 'bg-blue-50 text-blue-700',
    pending: 'bg-amber-50 text-amber-700',
    active: 'bg-green-50 text-green-700',
    inactive: 'bg-[var(--off)] text-[var(--muted)]',
    settled: 'bg-green-50 text-green-700',
    failed: 'bg-rose-50 text-rose-600',
    paid: 'bg-green-50 text-green-700',
    unpaid: 'bg-amber-50 text-amber-700',
    cancelled: 'bg-[var(--off)] text-[var(--muted)]',
    delivered: 'bg-green-50 text-green-700',
    accepted: 'bg-blue-50 text-blue-700',
    picked_up: 'bg-blue-50 text-blue-700',
    approved: 'bg-green-50 text-green-700',
    rejected: 'bg-rose-50 text-rose-600',
    read: 'bg-green-50 text-green-700',
    unread: 'bg-amber-50 text-amber-700',
    visible: 'bg-green-50 text-green-700',
    hidden: 'bg-[var(--off)] text-[var(--muted)]',
  }

  return (
    <span className={`
      inline-flex items-center px-2.5 py-1 text-[10px] font-semibold rounded-full
      ${variants[status] || variants.default}
      ${className || ''}
    `}>
    {status?.charAt(0).toUpperCase() + status?.slice(1).replace('_', ' ')}
  </span>
  )
}