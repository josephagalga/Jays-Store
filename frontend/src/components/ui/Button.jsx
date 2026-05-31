const variants = {
  primary: 'bg-[var(--ink)] text-white hover:opacity-80',
  secondary: 'bg-[var(--off)] text-[var(--ink)] hover:bg-[var(--stone)]',
  outline: 'border border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white',
  ghost: 'text-[var(--ink)] hover:bg-[var(--off)]',
  danger: 'bg-rose-500 text-white hover:bg-rose-600',
}

const sizes = {
  sm: 'px-4 py-1.5 text-xs',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-sm',
  full: 'w-full py-3 text-sm',
}

export default function Button({
  children, variant = 'primary', size = 'md',
  loading = false, disabled = false, className = '', ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        rounded-xl transition-all duration-150 cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        active:scale-[0.98]
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}