import { cn } from '../../utils/cn'

const columnStyles = 'px-5 py-3.5 text-left text-xs font-semibold text-[var(--muted)] uppercase tracking-wider'
const cellStyles = 'px-5 py-4 text-sm'

export function DataTable({
  columns,
  data,
  keyField = 'id',
  emptyMessage = 'No data available',
  className,
  striped = true,
  hoverable = true,
  pagination,
  onRowClick,
  rowClassName,
  actions,
}) {
  if (!data?.length) {
    return (
      <div className={cn('bg-white border border-[var(--border)] rounded-2xl', className)}>
        <div className="text-center py-20">
          <p className="text-sm text-[var(--muted)]">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-white border border-[var(--border)] rounded-2xl overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full" role="table">
          <thead className="bg-[var(--off)] border-b border-[var(--border)]">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className={cn(columnStyles, col.className)} style={{ width: col.width }}>
                  {col.label}
                </th>
              ))}
              {actions && <th className={cn(columnStyles, 'w-24 text-right')} />}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {data.map((row, i) => (
              <tr
                key={row[keyField] || i}
                className={cn(
                  striped && i % 2 === 1 && 'bg-[var(--off)]',
                  hoverable && 'hover:bg-[var(--off)]/50',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(row)
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn(cellStyles, col.className)}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className={cn(cellStyles, 'text-right')}>
                    <div className="flex items-center justify-end gap-2">
                      {actions.map((action) => (
                        <button
                          key={action.key}
                          onClick={(e) => { e.stopPropagation(); action.onClick(row) }}
                          className={cn(
                            'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                            action.variant === 'danger' && 'text-rose-600 hover:bg-rose-50',
                            action.variant === 'primary' && 'bg-[var(--ink)] text-white hover:opacity-80',
                            action.variant === 'ghost' && 'text-[var(--muted)] hover:text-[var(--ink)]'
                          )}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination && (
        <div className="px-6 py-4 border-t border-[var(--border)] flex items-center justify-between">
          <p className="text-sm text-[var(--muted)]">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page === 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={pagination.page === pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="px-3 py-1.5 text-sm border border-[var(--border)] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function Column({ key, label, render, width, className }) {
  return { key, label, render, width, className }
}