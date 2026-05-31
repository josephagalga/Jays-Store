export default function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-4 py-3 text-sm rounded-xl border outline-none
          bg-white transition-all duration-150
          border-[var(--border)] focus:border-[var(--ink)]
          placeholder:text-[var(--border)]
          disabled:bg-[var(--off)] disabled:cursor-not-allowed
          ${error ? 'border-rose-400 focus:border-rose-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && <p className="text-xs text-rose-500">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  )
}