import { cn } from '../../utils/cn'

export function StatCard({ icon, label, value, trend, trendUp = true, className }) {
  return (
    <div className={cn('bg-white border border-[var(--border)] rounded-2xl p-6', className)}>
      <div className="flex items-start justify-between">
        <div>
          {icon && <div className="text-[var(--muted)] mb-3">{icon}</div>}
          <p className="text-2xl font-bold text-[var(--ink)]">{value}</p>
          <p className="text-xs text-[var(--muted)] mt-1">{label}</p>
        </div>
        {trend !== undefined && (
          <span className={cn(
            'text-xs font-semibold px-2 py-1 rounded-full',
            trendUp ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'
          )}>
            {trendUp ? '↑' : '↓'} {trend}%
          </span>
        )}
      </div>
    </div>
  )
}