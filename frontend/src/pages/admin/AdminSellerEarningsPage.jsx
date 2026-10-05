import { useQuery } from '@tanstack/react-query'
import MainLayout from '../../layouts/MainLayout'
import { DataTable } from '../../components/shared/DataTable'
import { adminApi } from '../../services/api'

export default function AdminSellerEarningsPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-seller-earnings'],
    queryFn: adminApi.getSellerEarnings,
    staleTime: 1000 * 60 * 5,
  })


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
          <p className="text-red-600">Failed to load seller earnings</p>
          <button onClick={() => refetch()} className="mt-4 px-4 py-2 bg-[var(--ink)] text-white rounded-xl">Retry</button>
        </div>
      </div>
    </MainLayout>
  )

  const topEarner = data?.top_earner
  const leastEarner = data?.least_earner

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">Seller Earnings Leaderboard</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Lifetime earnings ranked by net earnings. {data?.total_sellers || 0} sellers total.</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"
          >
            Refresh
          </button>
        </div>

        {/* Top/Least Earners Highlight */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {topEarner && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
                  <circle cx="12" cy="8" r="7" />
                  <polyline points="8.21 13.89 7 23 12 23 12 16 22 16 22 23 17 23 22 23" />
                </svg>
                <h3 className="font-semibold text-green-900">Top Earner</h3>
              </div>
              <p className="text-lg font-bold text-green-900">{topEarner.store_name}</p>
              <p className="text-sm text-green-700 mt-1">Net: GHS {parseFloat(topEarner.net_earnings || 0).toFixed(2)} · {topEarner.total_orders} orders</p>
            </div>
          )}
          {leastEarner && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-rose-600">
                  <polyline points="23 4 13 14.17 9 18.17" />
                  <line x1="17" y1="20" x2="29" y2="20" />
                  <polyline points="7 4 17 14.17 21 18.17" />
                </svg>
                <h3 className="font-semibold text-rose-900">Needs Attention</h3>
              </div>
              <p className="text-lg font-bold text-rose-900">{leastEarner.store_name}</p>
              <p className="text-sm text-rose-700 mt-1">Net: GHS {parseFloat(leastEarner.net_earnings || 0).toFixed(2)} · {leastEarner.total_orders} orders</p>
            </div>
          )}
        </div>

        <DataTable
          columns={[
            { key: 'store_name', label: 'Store', width: '200px', render: (v, row) => (
              <div>
                <p className="font-medium text-[var(--ink)]">{v}</p>
                <p className="text-xs text-[var(--muted)]">@{row.store_slug}</p>
              </div>
            )},
            { key: 'total_orders', label: 'Orders', width: '100px', render: (v) => v || 0 },
            { key: 'gross_revenue', label: 'Gross Revenue', width: '140px', render: (v) => `GHS ${parseFloat(v || 0).toFixed(2)}` },
            { key: 'commission', label: 'Commission', width: '120px', render: (v) => `GHS ${parseFloat(v || 0).toFixed(2)}` },
            { key: 'delivery_share', label: 'Delivery Share', width: '120px', render: (v) => `GHS ${parseFloat(v || 0).toFixed(2)}` },
            { key: 'net_earnings', label: 'Net Earnings', width: '140px', render: (v) => `GHS ${parseFloat(v || 0).toFixed(2)}` },
          ]}
          data={data?.rows || []}
          keyField="id"
          emptyMessage="No sellers found"
        />
      </div>
    </MainLayout>
  )
}
