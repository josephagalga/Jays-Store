import { useQuery } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import { DataTable, Column } from '../../components/shared/DataTable'
import { StatCard } from '../../components/shared/StatCard'
import { Truck, DollarSign, CreditCard, TrendingUp } from 'lucide-react'
import { adminApi } from '../../services/api'

export default function AdminFinancePage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-finance'],
    queryFn: adminApi.getFinance,
    staleTime: 1000 * 60 * 5,
  })

  const formatCurrency = (val) => `GHS ${parseFloat(val || 0).toFixed(2)}`

  const columns = [
    new Column({ key: 'order_id', label: 'Order', width: '100px' }),
    new Column({ key: 'paid_at', label: 'Paid At', width: '160px', render: (v) => v ? new Date(v).toLocaleString('en-GH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-' }),
    new Column({ key: 'paystack_reference', label: 'Paystack Ref', width: '200px' }),
    new Column({ key: 'charged', label: 'Buyer Charged', width: '140px', render: formatCurrency }),
    new Column({ key: 'sellers_net', label: 'To Sellers', width: '140px', render: formatCurrency }),
    new Column({ key: 'commission', label: 'Commission', width: '120px', render: formatCurrency }),
    new Column({ key: 'delivery_fee', label: 'Delivery', width: '120px', render: formatCurrency }),
    new Column({ key: 'paystack_fee', label: 'Paystack Fee', width: '120px', render: (v, row) => `${formatCurrency(v)}${row.fee_estimated ? ' (est.)' : ''}` }),
    new Column({ key: 'platform_net', label: 'Platform Net', width: '140px', render: formatCurrency }),
    new Column({ key: 'fee_estimated', label: 'Est.', width: '80px', render: (v) => v ? 'est.' : '—' }),
  ]

  if (isLoading) return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex justify-center py-32">Loading…</div>
      </div>
    </MainLayout>
  )

  if (error) return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="text-center py-20">
          <p className="text-red-600">Failed to load finance data</p>
          <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[var(--ink)] text-white rounded-xl">Retry</button>
        </div>
      </div>
    </MainLayout>
  )

  const totals = data?.totals || {}
  const rows = data?.rows || []

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Finance Dashboard</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Per-order money flows: what buyers paid, what sellers got, platform net</p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={false}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<DollarSign size={20} />}
            label="Total Charged"
            value={formatCurrency(totals.charged)}
          />
          <StatCard
            icon={<TrendingUp size={20} />}
            label="To Sellers"
            value={formatCurrency(totals.sellers)}
          />
          <StatCard
            icon={<CreditCard size={20} />}
            label="Paystack Fees"
            value={formatCurrency(totals.fees)}
          />
          <StatCard
            icon={<Truck size={20} />}
            label="Platform Net"
            value={formatCurrency(totals.platform)}
          />
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={rows}
          keyField="order_id"
          emptyMessage="No paid orders found"
          pagination={{
            page: 1,
            pageSize: rows.length || 10,
            total: rows.length,
            totalPages: 1,
            onPageChange: () => {},
          }}
        />
      </div>
    </MainLayout>
  )
}
