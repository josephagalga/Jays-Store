import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, ChevronRight, Trash2 } from 'lucide-react'
import MainLayout from '../../layouts/MainLayout'
import Button from '../../components/ui/Button'

const KEY = 'jays-guest-orders'

function readGuestOrders() {
  try {
    const raw = localStorage.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter(e => e?.reference) : []
  } catch {
    return []
  }
}

export default function GuestOrdersPage() {
  const [orders, setOrders] = useState(() => readGuestOrders())

  const forget = (ref) => {
    try {
      const next = readGuestOrders().filter(e => e.reference !== ref)
      localStorage.setItem(KEY, JSON.stringify(next))
      setOrders(next)
    } catch { /* ignore */ }
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto px-6 lg:px-10 py-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
          Guest inbox
        </p>
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-3">
          My tracked orders
        </h1>
        <p className="text-sm text-[var(--muted)] mb-8">
          Orders you placed as a guest on this browser. Your receipt and delivery OTP live on each tracking page — no email needed.
        </p>

        {!orders.length ? (
          <div className="text-center py-16 border border-dashed border-[var(--border)] rounded-2xl">
            <Package size={40} className="mx-auto text-[var(--border)] mb-4" />
            <p className="serif text-2xl font-medium text-[var(--ink)] mb-2">No saved orders</p>
            <p className="text-sm text-[var(--muted)] mb-6">
              Guest orders appear here automatically after checkout. You can also open any tracking link from your receipt.
            </p>
            <Link to="/catalog">
              <Button>Browse catalog</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map(e => (
              <div key={e.reference} className="bg-white border border-[var(--border)] rounded-2xl px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link to={`/track/${e.reference}`} className="block">
                    <p className="text-sm font-semibold text-[var(--ink)] truncate">
                      {e.reference}
                    </p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">
                      {e.guest_email || 'Guest order'}
                      {e.payment_status === 'paid' ? ' · Paid' : ''}
                      {e.delivery_otp ? ' · OTP saved' : ''}
                    </p>
                  </Link>
                </div>
                <Link
                  to={`/track/${e.reference}`}
                  className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold text-[var(--ink)] hover:text-[var(--muted)] transition-colors"
                >
                  Open <ChevronRight size={14} />
                </Link>
                <button
                  onClick={() => forget(e.reference)}
                  aria-label="Remove from this browser"
                  className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-rose-500 hover:bg-rose-50 transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}
