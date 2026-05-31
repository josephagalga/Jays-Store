export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && (
        <div className="text-[#e5e5e5] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[#0f0f0f] mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-[#737373] max-w-sm mb-6">{description}</p>
      )}
      {action && action}
    </div>
  )
}