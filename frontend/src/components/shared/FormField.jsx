import { cn } from '../../utils/cn'

export function FormField({ label, hint, error, children, required, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className={cn(
          'text-xs font-semibold text-[var(--ink)] uppercase tracking-wider',
          required && 'text-rose-500'
        )}>
          {label} {required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-rose-500">{error}</p>}
      {hint && !error && <p className="text-xs text-[var(--muted)]">{hint}</p>}
    </div>
  )
}

export function Input({ label, hint, error, className, type = 'text', disabled, ...props }) {
  return (
    <FormField label={label} hint={hint} error={error}>
      <input
        type={type}
        disabled={disabled}
        className={`
          w-full px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border outline-none
          bg-white transition-all duration-150
          border-[var(--border)] focus:border-[var(--ink)]
          placeholder:text-[var(--muted)] placeholder:opacity-70
          disabled:bg-[var(--off)] disabled:cursor-not-allowed
          ${error ? 'border-rose-400 focus:border-rose-500' : ''}
          ${disabled ? 'opacity-50' : ''}
          ${className || ''}
        `}
        {...props}
      />
    </FormField>
  )
}

export function Select({ label, hint, error, options, placeholder, className, disabled, ...props }) {
  return (
    <FormField label={label} hint={hint} error={error}>
      <select
        disabled={disabled}
        className={`
          w-full px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border outline-none
          bg-white transition-all duration-150
          border-[var(--border)] focus:border-[var(--ink)]
          disabled:bg-[var(--off)] disabled:cursor-not-allowed
          ${error ? 'border-rose-400 focus:border-rose-500' : ''}
          ${disabled ? 'opacity-50' : ''}
          ${className || ''}
        `}
        {...props}
      >
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </FormField>
  )
}

export function Textarea({ label, hint, error, className, rows = 3, disabled, ...props }) {
  return (
    <FormField label={label} hint={hint} error={error}>
      <textarea
        rows={rows}
        disabled={disabled}
        className={`
          w-full px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border outline-none
          bg-white transition-all duration-150
          border-[var(--border)] focus:border-[var(--ink)]
          disabled:bg-[var(--off)] disabled:cursor-not-allowed
          resize-none placeholder:text-[var(--muted)] placeholder:opacity-70
          ${error ? 'border-rose-400 focus:border-rose-500' : ''}
          ${disabled ? 'opacity-50' : ''}
          ${className || ''}
        `}
        {...props}
      />
    </FormField>
  )
}

export function Checkbox({ label, hint, error, ...props }) {
  return (
    <FormField label={label} hint={hint} error={error}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="w-5 h-5 min-w-[18px] min-h-[18px] accent-[var(--ink)] border-[var(--border)] rounded-lg mt-0.5"
          {...props}
        />
        <label className="text-sm text-[var(--ink)] leading-relaxed cursor-pointer">
          {props.children}
        </label>
      </div>
    </FormField>
  )
}

export function FileInput({ label, hint, error, accept, className, ...props }) {
  return (
    <FormField label={label} hint={hint} error={error}>
      <input
        type="file"
        accept={accept}
        className={`
          w-full px-4 py-2.5 text-sm border border-[var(--border)] rounded-xl
          bg-white outline-none focus:border-[var(--ink)] transition-colors
          ${error ? 'border-rose-400' : ''}
          ${className || ''}
        `}
        {...props}
      />
    </FormField>
  )
}