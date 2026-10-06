import { useState } from 'react'

const STORAGE_KEY = 'mjs-hide-testing-banner'

export function openFeedbackWidget() {
  window.dispatchEvent(new Event('feedback:open'))
}

// TESTING-ONLY: slim global banner. Delete the two mounts (MainLayout,
// DashboardLayout) at commercial launch.
export default function TestingBanner() {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  if (hidden) return null

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setHidden(true)
  }

  return (
    <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-center">
      <p className="text-xs text-amber-900 leading-relaxed">
        <strong>Testing version</strong> — things may change. Spotted something?{' '}
        <button
          type="button"
          onClick={openFeedbackWidget}
          className="underline font-semibold hover:no-underline"
        >
          Send feedback
        </button>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss testing notice"
        className="flex-shrink-0 w-7 h-7 min-w-[28px] flex items-center justify-center rounded-full text-amber-700 hover:bg-amber-200/60 transition-colors"
      >
        ✕
      </button>
    </div>
  )
}
