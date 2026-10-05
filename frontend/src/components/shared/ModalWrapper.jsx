import { cn } from '../../utils/cn'

export default function ModalWrapper({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  className,
}) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[90vw]',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={title ? 'modal-title' : undefined}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          'bg-white rounded-2xl shadow-2xl w-full',
          sizeClasses[size],
          className
        )}
        role="document"
      >
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            {title && <h2 id="modal-title" className="serif text-xl font-medium text-[var(--ink)]">{title}</h2>}
            {showClose && (
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--off)] transition-colors"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        )}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}