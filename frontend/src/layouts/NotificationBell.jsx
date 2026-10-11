import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import useAuthStore from '../store/authStore'
import api from '../services/api'

/**
 * Real inbox bell: server unread badge + dropdown panel with mark-read.
 * Guests keep a plain link to their saved-orders list.
 */
export default function NotificationBell({ onNavigate }) {
  const { user, isAuthenticated } = useAuthStore()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  const role = !isAuthenticated ? 'guest' : user?.role
  const inboxTo =
    role === 'buyer' ? '/orders'
    : role === 'seller' ? '/seller/orders'
    : role === 'driver' ? '/driver/orders'
    : role === 'admin' ? '/admin/dashboard'
    : '/track-saved'

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/accounts/notifications/')
      return res.data
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
    retry: 1,
  })
  const rows = Array.isArray(data) ? data : data?.results || []
  const unread = typeof data?.unread_count === 'number'
    ? data.unread_count
    : rows.filter(r => !r.is_read).length

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open ])

  const readOne = useMutation({
    mutationFn: (id) => api.patch(`/accounts/notifications/${id}/read/`, {}),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })
  const readAll = useMutation({
    mutationFn: () => api.post('/accounts/notifications/read-all/', {}),
    onSuccess: () => qc.invalidateQueries(['notifications']),
  })

  const openItem = (item) => {
    if (!item.is_read) readOne.mutate(item.id)
    setOpen(false)
    onNavigate?.()
    navigate(item.link || inboxTo)
  }

  if (!isAuthenticated) {
    return (
      <Link to={inboxTo} onClick={onNavigate} aria-label="Notifications"
        className="relative w-9 h-9 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--off)] transition-all">
        <Bell size={17} />
      </Link>
    )
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Notifications"
        className="relative w-9 h-9 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--off)] transition-all">
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 bg-rose-500 text-white text-[8px] font-semibold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-3rem)] bg-white border border-[var(--border)] rounded-2xl shadow-lg shadow-black/5 overflow-hidden z-50">
          <div className="px-4 py-3 bg-[var(--off)] border-b border-[var(--border)] flex items-center justify-between">
            <p className="text-sm font-semibold text-[var(--ink)]">Notifications</p>
            {unread > 0 && (
              <button onClick={() => readAll.mutate()}
                className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {!rows.length ? (
              <p className="text-sm text-[var(--muted)] text-center py-8">No notifications yet</p>
            ) : rows.slice(0, 20).map(item => (
              <button key={item.id} onClick={() => openItem(item)}
                className={`w-full text-left px-4 py-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--off)] transition-colors ${item.is_read ? '' : 'bg-blue-50/40'}`}>
                <p className="text-sm font-semibold text-[var(--ink)] line-clamp-1">{item.title}</p>
                {item.body && (
                  <p className="text-xs text-[var(--muted)] line-clamp-2 mt-0.5">{item.body}</p>
                )}
                <p className="text-[11px] text-[var(--muted)] mt-1">
                  {item.created_at ? new Date(item.created_at).toLocaleString('en-GH') : ''}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
