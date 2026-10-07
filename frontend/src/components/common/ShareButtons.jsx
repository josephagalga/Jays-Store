import { useState } from 'react'
import { Share2, Link2, Check, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

// Share a public page link (product, store) anywhere: WhatsApp-first for
// Navrongo, plus copy-link and the native phone share sheet where available.
// `path` must be a public route (e.g. `/products/:slug`), so recipients
// need no account to open it.
export default function ShareButtons({ title = "Check this out", path = '/', label = 'Share' }) {
  const [copied, setCopied] = useState(false)

  // Route shares through preview links: crawlers get item-specific Open
  // Graph tags (photo unfurls), humans are redirected to the real page.
  const previewPath = (() => {
    let m = path.match(/^\/products\/([^/?#]+)/)
    if (m) return `/share/p/${m[1]}`
    m = path.match(/^\/stores\/([^/?#]+)/)
    if (m) return `/share/s/${m[1]}`
    return path
  })()
  const url = `${window.location.origin}${previewPath}`
  const text = `${title} — ${url}`
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(text)}`
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Clipboard API unavailable (older browsers) — fallback select/copy
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand('copy')
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta)
    }
    setCopied(true)
    toast.success('Link copied — paste it anywhere')
    setTimeout(() => setCopied(false), 2000)
  }

  const nativeShare = async () => {
    try {
      await navigator.share({ title, text: title, url })
    } catch {
      // User dismissed the sheet — nothing to do
    }
  }

  const btn =
    'inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] text-xs font-semibold rounded-xl border border-[var(--border)] bg-white text-[var(--ink)] hover:border-[var(--ink)] transition-colors'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={btn} aria-label="Share on WhatsApp">
        <MessageCircle size={14} className="text-green-600" />
        WhatsApp
      </a>
      <button type="button" onClick={copyLink} className={btn} aria-label="Copy link">
        {copied ? <Check size={14} className="text-green-600" /> : <Link2 size={14} />}
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      {canNativeShare && (
        <button type="button" onClick={nativeShare} className={btn} aria-label={label}>
          <Share2 size={14} />
          {label}
        </button>
      )}
    </div>
  )
}
