import { useEffect, useState } from 'react'
import { MessageSquareText, X, Send } from 'lucide-react'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

// TESTING-ONLY: floating feedback button + mini form. Posts to the existing
// contact inbox (/accounts/contact/ -> Admin Messages). Delete the two
// mounts (MainLayout, DashboardLayout) at commercial launch.
export default function FeedbackWidget() {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  useEffect(() => {
    const opener = () => {
      setSent(false)
      setOpen(true)
    }
    window.addEventListener('feedback:open', opener)
    return () => window.removeEventListener('feedback:open', opener)
  }, [])

  // Prefill from the signed-in user; guests type their own.
  useEffect(() => {
    if (open && user) {
      setForm((prev) => ({
        name: prev.name || user.full_name || user.store_name || '',
        email: prev.email || user.email || '',
        message: prev.message,
      }))
    }
  }, [open, user])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      return toast.error('Please fill in name, email and your feedback')
    }
    setSending(true)
    try {
      await api.post('/accounts/contact/', {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: 'Testing feedback',
        message: form.message.trim(),
        role: user?.role || 'other',
      })
      setSent(true)
      setForm({ name: '', email: '', message: '' })
      toast.success('Feedback sent — thank you!')
    } catch {
      toast.error('Could not send feedback. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => { setSent(false); setOpen(true) }}
          aria-label="Send feedback"
          className="fixed bottom-24 md:bottom-8 right-4 md:right-6 z-40 flex items-center gap-2 px-4 py-3 min-h-[48px] bg-[var(--ink)] text-white text-sm font-medium rounded-full shadow-lg hover:opacity-90 transition-opacity"
        >
          <MessageSquareText size={16} />
          <span className="hidden sm:inline">Feedback</span>
        </button>
      )}

      {open && (
        <div className="fixed bottom-24 md:bottom-8 right-4 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm bg-white border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Testing feedback</p>
              <p className="text-xs text-[var(--muted)]">Recommendations welcome — tell us anything</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close feedback form"
              className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--muted)] hover:bg-[var(--off)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {sent ? (
            <div className="px-5 py-8 text-center">
              <p className="serif text-xl font-medium text-[var(--ink)] mb-2">Thank you!</p>
              <p className="text-sm text-[var(--muted)]">Your feedback helps shape the store.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="px-5 py-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your name"
                  aria-label="Your name"
                  className="w-full px-4 py-2.5 min-h-[44px] text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-70"
                />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Email"
                  aria-label="Email"
                  className="w-full px-4 py-2.5 min-h-[44px] text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-70"
                />
              </div>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                placeholder="What should we improve or add?"
                aria-label="Your feedback"
                className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors resize-none placeholder:text-[var(--muted)] placeholder:opacity-70"
              />
              <button
                type="submit"
                disabled={sending}
                className="flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-[var(--ink)] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Send size={14} />
                {sending ? 'Sending…' : 'Send feedback'}
              </button>
            </form>
          )}
        </div>
      )}
    </>
  )
}
