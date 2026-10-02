import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Package, TrendingUp, ShoppingBag, Star, Plus, Wallet, Landmark, CheckCircle, AlertTriangle } from 'lucide-react'
import Spinner from
'../../components/ui/Spinner'
import SafeImage from '../../components/common/SafeImage'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function SellerDashboardPage() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const [payoutForm, setPayoutForm] = useState({ payout_account_number: '', payout_bank_code: '', payout_account_name: '' })
  const [showPayoutForm, setShowPayoutForm] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['seller-profile'],
    queryFn: async () => {
      const res = await api.get('/accounts/profile/seller/')
      return res.data
    },
  })

  const { data: products } = useQuery({
    queryKey: ['seller-products'],
    queryFn: async () => {
      const res = await api.get('/products/manage/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
  })

  const { data: settlements } = useQuery({
    queryKey: ['seller-settlements'],
    queryFn: async () => {
      const res = await api.get('/seller/settlements/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
  })

  const { data: banks } = useQuery({
    queryKey: ['settlement-banks'],
    queryFn: async () => {
      const res = await api.get('/accounts/seller/banks/')
      return Array.isArray(res.data) ? res.data : []
    },
    enabled: showPayoutForm,
    retry: false,
  })

  const { data: commissionInfo } = useQuery({
    queryKey: ['seller-commission-info'],
    queryFn: async () => {
      const res = await api.get('/accounts/seller/commission-info/')
      return res.data
    },
  })

  const payoutMutation = useMutation({
    mutationFn: (payload) => api.patch('/accounts/seller/payout-account/', payload),
    onSuccess: (res) => {
      qc.invalidateQueries(['seller-profile'])
      setShowPayoutForm(false)
      if (res.data?.subaccount_status === 'active') {
        toast.success('Payout account connected! Buyers can now check out your items.')
      } else {
        toast.error(res.data?.subaccount_note || 'Could not verify account. Check the details.')
      }
    },
    onError: (err) => {
      const data = err.response?.data
      const first = data && Object.values(data)[0]
      toast.error(Array.isArray(first) ? first[0] : 'Could not save payout account')
    },
  })

  const savePayoutAccount = (e) => {
    e.preventDefault()
    if (!payoutForm.payout_account_number || !payoutForm.payout_bank_code || !payoutForm.payout_account_name) {
      return toast.error('Fill in account number, bank/network and account name')
    }
    payoutMutation.mutate(payoutForm)
  }

  const subaccountActive = profile?.subaccount_status === 'active'
  const settledTotal = (settlements || [])
    .filter(s => s.status === 'settled')
    .reduce((acc, s) => acc + parseFloat(s.net_share || 0), 0)



  if (isLoading) return <div className="flex justify-center py-32"><Spinner /></div>

  const stats = [
    { icon: <TrendingUp size={20} />, label: 'Total Revenue', value: `GHS ${parseFloat(profile?.seller_total_revenue || 0).toFixed(2)}` },
    { icon: <ShoppingBag size={20} />, label: 'Total Sales', value: profile?.seller_total_sales || 0 },
    { icon: <Package size={20} />, label: 'Products Listed', value: profile?.seller_total_products || 0 },
    { icon: <Star size={20} />, label: 'Avg Rating', value: parseFloat(profile?.seller_average_rating || 0).toFixed(1) },
  ]

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <p className="text-sm text-[var(--muted)] mb-1">Welcome back,</p>
          <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)]">{profile?.store_name || user?.full_name}</h1>
        </div>
        <Link to="/seller/products/add"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity">
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {stats.map(({ icon, label, value }) => (
          <div key={label} className="bg-[var(--off)] rounded-2xl p-6">
            <div className="text-[var(--muted)] mb-3">{icon}</div>
            <p className="text-2xl font-bold text-[var(--ink)]">{value}</p>
            <p className="text-xs text-[var(--muted)] mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Commission Info Widget */}
      {commissionInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                Your Commission Rate: {commissionInfo.commission_rate}%
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                {commissionInfo.explanation}
              </p>
              <div className="bg-white rounded-lg px-4 py-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-blue-700">You list at:</span>
                  <span className="font-semibold text-blue-900">GHS {commissionInfo.example.your_price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Buyers pay:</span>
                  <span className="font-semibold text-blue-900">GHS {commissionInfo.example.buyer_pays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">You receive:</span>
                  <span className="font-bold text-green-600">GHS {commissionInfo.example.your_price}</span>
                </div>
              </div>
              {commissionInfo.last_updated && (
                <p className="text-xs text-blue-600 mt-2">
                  Last updated: {new Date(commissionInfo.last_updated).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payout account — instant settlement target */}
      {!subaccountActive && !isLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800">Connect your payout account</p>
            <p className="text-amber-700 mt-0.5">
              Buyers pay on Paystack and your share settles straight to your account — but checkout of your
              items is blocked until you connect it.
              {profile?.subaccount_status === 'failed' && profile?.subaccount_note && (
                <span className="block mt-1 font-medium">Last error: {profile.subaccount_note}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Instant settlement */}
      <div className="bg-[var(--ink)] rounded-2xl p-6 lg:p-8 mb-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wider">Settled to you (instant)</p>
              <p className="text-3xl font-bold">GHS {settledTotal.toFixed(2)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {subaccountActive ? (
              <span className="flex items-center gap-1.5 text-xs font-semibold bg-green-500/20 text-green-300 px-3 py-2 rounded-xl">
                <CheckCircle size={14} /> {profile?.payout_account_name} · {profile?.payout_account_number}
              </span>
            ) : null}
            <button onClick={() => setShowPayoutForm(!showPayoutForm)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-[var(--ink)] text-sm font-semibold rounded-xl hover:bg-[var(--off)] transition-colors">
              <Landmark size={15} /> {subaccountActive ? 'Change payout account' : 'Connect payout account'}
            </button>
          </div>
        </div>
        <p className="text-xs text-white/40 mt-4">
          No withdrawals needed — every sale settles instantly to your account (item total minus 10% commission).
        </p>

        {showPayoutForm && (
          <form onSubmit={savePayoutAccount} className="grid md:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10">
            <input value={payoutForm.payout_account_number} onChange={e => setPayoutForm(p => ({ ...p, payout_account_number: e.target.value }))}
              placeholder="MoMo / account number"
              className="px-4 py-2.5 text-sm rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-white/40" />
            <select value={payoutForm.payout_bank_code} onChange={e => setPayoutForm(p => ({ ...p, payout_bank_code: e.target.value }))}
              className="px-4 py-2.5 text-sm rounded-xl bg-white/10 border border-white/10 text-white outline-none focus:border-white/40 [&>option]:text-black">
              <option value="">Select bank / network</option>
              {(banks || []).map(b => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
            <input value={payoutForm.payout_account_name} onChange={e => setPayoutForm(p => ({ ...p, payout_account_name: e.target.value }))}
              placeholder="Account name"
              className="px-4 py-2.5 text-sm rounded-xl bg-white/10 border border-white/10 text-white placeholder:text-white/30 outline-none focus:border-white/40" />
            <Button type="submit" loading={payoutMutation.isPending} className="!bg-white !text-[var(--ink)] rounded-xl">
              Save & Verify
            </Button>
          </form>
        )}

        {settlements?.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-wider mb-3">Recent settlements</p>
            <div className="space-y-2">
              {settlements.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm bg-white/5 rounded-xl px-4 py-2.5">
                  <span className="text-white/70">Order #{s.order} · net GHS {parseFloat(s.net_share).toFixed(2)}</span>
                  <span className={`text-xs font-semibold capitalize px-2.5 py-1 rounded-full ${
                    s.status === 'settled' ? 'bg-green-500/20 text-green-300'
                    : s.status === 'failed' ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-amber-500/20 text-amber-300'
                  }`}>{s.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent products */}
      <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="serif text-xl font-medium text-[var(--ink)]">My Products</h2>
          <Link to="/seller/products" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] transition-colors">
            View all
          </Link>
        </div>
        {!products?.length ? (
          <div className="text-center py-16">
            <Package size={32} className="mx-auto text-[var(--border)] mb-3" />
            <p className="text-sm text-[var(--muted)]">No products yet</p>
            <Link to="/seller/products/add" className="text-sm font-medium text-[var(--ink)] hover:underline mt-2 inline-block">
              Add your first product
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {products.slice(0, 5).map(product => (
              <div key={product.id} className="flex items-center justify-between gap-3 px-4 md:px-6 py-4">
                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                  <div className="w-12 h-14 bg-[var(--off)] rounded-lg overflow-hidden flex-shrink-0">
                    {product.images?.[0]?.url || product.images?.[0]?.image ? (
                      <SafeImage src={product.images[0].url || product.images[0].image} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package size={16} className="text-[var(--border)]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--ink)] line-clamp-1">{product.name}</p>
                    <p className="text-xs text-[var(--muted)]">GHS {parseFloat(product.price).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${product.is_active ? 'bg-green-50 text-green-600' : 'bg-[var(--stone)] text-[var(--muted)]'}`}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <span className="hidden sm:inline text-xs text-[var(--muted)]">{product.total_sold} sold</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}