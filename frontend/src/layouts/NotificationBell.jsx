import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import useAuthStore from '../store/authStore'

// Inbox bell: badge is derived from already-cached order queries (no extra
// fetches) plus per-role last-seen markers written by the inbox pages.
// Guests get a plain link to their saved-orders list.
export default function NotificationBell({ onNavigate }) {
  const { user, isAuthenticated } = useAuthStore()
  const qc = useQueryClient()

  const role = !isAuthenticated ? 'guest' : user?.role
  const inboxTo =
    role === 'buyer' ? '/orders'
    : role === 'seller' ? '/seller/orders'
    : role === 'driver' ? '/driver/orders'
    : role === 'admin' ? '/admin/dashboard'
    : '/track-saved'

  const seenKey =
    role === 'buyer' ? 'jays-inbox-seen-buyer'
    : role === 'seller' ? 'jays-inbox-seen-seller'
    : null
  const queryKey = role === 'buyer' ? ['buyer-orders'] : role === 'seller' ? ['seller-orders'] : null

  let count = 0
  if (seenKey && queryKey) {
    try {
      const seen = parseInt(localStorage.getItem(seenKey) || '0', 10) || 0
      const rows = qc.getQueryData(queryKey) || []
      count = rows.filter(o => {
        if (o?.payment_status !== 'paid') return false
        try { return new Date(o.created_at).getTime() > seen } catch { return false }
      }).length
    } catch { count = 0 }
  }

  return (
    <Link
      to={inboxTo}
      onClick={onNavigate}
      aria-label="Notifications"
      className="relative w-9 h-9 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--off)] transition-all"
    >
      <Bell size={17} />
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 bg-rose-500 text-white text-[8px] font-semibold rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
