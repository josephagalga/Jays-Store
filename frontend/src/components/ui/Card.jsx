export default function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-[#e5e5e5]
        ${hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}