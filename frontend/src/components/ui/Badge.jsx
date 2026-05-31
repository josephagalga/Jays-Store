const variants = {
  default: 'bg-[#f5f5f5] text-[#0f0f0f]',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-600',
  info: 'bg-blue-50 text-blue-700',
}

export default function Badge({ children, variant = 'default', className = '' }) {
  return (
    <span className={`
      inline-flex items-center px-2.5 py-0.5 rounded-full
      text-xs font-medium ${variants[variant]} ${className}
    `}>
      {children}
    </span>
  )
}