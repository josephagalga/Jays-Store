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
  const { user, setUser } = useAuthStore()
  const qc = useQueryClient()
  const [payoutForm, setPayoutForm] = useState({ payout_account_number: '', payout_bank_code: '', payout_account_name: '' })
  const [showPayoutForm, setShowPayoutForm] = useState(false)
  const [termsNoticeSeen, setTermsNoticeSeen] = useState(false)

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

  // Inbox: surface paid orders needing handoff right on the landing page —
  // sellers land here, not on My Orders, so alerts must live here too.
  // Same queryKey as SellerOrdersPage: one fetch feeds both + the bell badge.
  const { data: recentOrders } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: async () => {
      const res = await api.get('/seller/orders/')
      return Array.isArray(res.data) ? res.data : res.data.results || []
    },
    refetchInterval: 30000,
    retry: 1,
  })
  const pendingHandoff = (recentOrders || []).filter(o =>
    o.payment_status === 'paid' && o.my_handoff === 'pending' &&
    o.status !== 'cancelled' && o.status !== 'delivered')

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

  const [deliveryFee, setDeliveryFee] = useState('')
  const deliveryMutation = useMutation({
    mutationFn: (payload) => api.patch('/accounts/profile/seller/', payload),
    onSuccess: (res) => {
      qc.invalidateQueries(['seller-profile'])
      setUser(res.data)
      toast.success('Delivery settings saved')
    },
    onError: (err) => {
      const data = err.response?.data
      const first = data && Object.values(data)[0]
      toast.error(Array.isArray(first) ? first[0] : 'Could not save delivery settings')
    },
  })

  const setDeliveryMode = (mode) => {
    deliveryMutation.mutate({ delivery_mode: mode })
  }

  const absMedia = (path) => {
    if (!path) return null
    const s = String(path)
    if (/^https?:\/\//i.test(s)) return s
    const origin = (api.defaults.baseURL || '').replace(/\/api$/, '')
    return `${origin}${s.startsWith('/') ? s : `/${s}`}`
  }

  const brandingMutation = useMutation({
    mutationFn: (formData) => api.patch('/accounts/profile/seller/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    onSuccess: (res) => {
      qc.invalidateQueries(['seller-profile'])
      setUser(res.data)
      toast.success('Store profile saved')
    },
    onError: (err) => {
      const data = err.response?.data
      const first = data && Object.values(data)[0]
      toast.error(Array.isArray(first) ? first[0] : 'Could not save store profile')
    },
  })

  const saveBranding = (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    const payload = new FormData()
    // Only send images the seller actually picked — untouched ones stay as-is.
    for (const key of ['store_logo', 'store_banner']) {
      const file = form.get(key)
      if (file instanceof File && file.size > 0) payload.append(key, file)
    }
    if ([...payload.keys()].length === 0) return toast.error('Choose a profile picture or banner first')
    brandingMutation.mutate(payload)
  }

  const linksMutation = useMutation({
    mutationFn: (payload) => api.patch('/accounts/profile/seller/', payload),
    onSuccess: (res) => {
      qc.invalidateQueries(['seller-profile'])
      setUser(res.data)
      toast.success('Store links saved')
    },
    onError: (err) => {
      const data = err.response?.data
      const first = data && Object.values(data)[0]
      toast.error(Array.isArray(first) ? first[0] : 'Could not save store links')
    },
  })

  const saveLinks = (e) => {
    e.preventDefault()
    const form = new FormData(e.target)
    linksMutation.mutate({
      whatsapp_number: (form.get('whatsapp_number') || '').toString().trim(),
      tiktok_url: (form.get('tiktok_url') || '').toString().trim(),
      facebook_url: (form.get('facebook_url') || '').toString().trim(),
      instagram_url: (form.get('instagram_url') || '').toString().trim(),
      youtube_url: (form.get('youtube_url') || '').toString().trim(),
    })
  }

  const saveDeliveryFee = (e) => {
    e.preventDefault()
    const fee = parseFloat(deliveryFee)
    if (Number.isNaN(fee) || fee < 0 || fee > 50) {
      return toast.error('Enter a delivery fee between GHS 0 and 50')
    }
    deliveryMutation.mutate({ custom_delivery_fee: fee.toFixed(2) })
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

      {/* New sales — the alert sellers actually see on login */}
      {pendingHandoff.length > 0 && (
        <Link to="/seller/orders"
          className="block bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 mb-6 hover:border-amber-400 transition-colors">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
            <AlertTriangle size={16} />
            {pendingHandoff.length} new sale{pendingHandoff.length === 1 ? '' : 's'} — confirm handoff
          </p>
          <p className="text-xs text-amber-700 mt-1">
            {pendingHandoff.slice(0, 3).map(o => `#${o.id} (GHS ${parseFloat(o.total).toFixed(2)})`).join(' · ')}
            {pendingHandoff.length > 3 ? ` +${pendingHandoff.length - 3} more` : ''}
            {' '}— tap to open My Orders. Payouts land in your wallet.
          </p>
        </Link>
      )}

      {/* New payout terms + instant MoMo (existing sellers never signed these) */}
      {!termsNoticeSeen && (() => {
        try {
          if (localStorage.getItem('jays-seller-terms-v2026-10-2.0')) return null
        } catch { /* show anyway */ }
        const inPilot = !!profile?.auto_transfer_enabled
        return (
          <div className="bg-white border border-[var(--border)] rounded-2xl px-5 py-4 mb-6">
            <p className="text-sm font-bold text-[var(--ink)] mb-1">
              New: payouts in minutes{inPilot ? ' — you&apos;re in' : ' — coming to you soon'}
            </p>
            <p className="text-xs text-[var(--muted)] leading-relaxed">
              {inPilot
                ? 'Your share now goes straight to your MoMo within minutes of each paid order. A GHS 1 fee comes out of each payout (sales under GHS 5 are free). '
                : 'Instant MoMo payouts are rolling out seller by seller — you&apos;ll be switched on soon. Until then your sales settle on the Paystack schedule. '}
              Payouts go only to the account below and can&apos;t be reversed — a wrong number means the loss is
              yours (§11). Keep your login secret (§12). Continued selling means you accept the updated{' '}
              <Link to="/terms" target="_blank" className="underline font-medium">Terms</Link>.
            </p>
            <button
              onClick={() => {
                try { localStorage.setItem('jays-seller-terms-v2026-10-2.0', '1') } catch { /* ignore */ }
                setTermsNoticeSeen(true)
              }}
              className="mt-2 text-xs font-semibold text-[var(--ink)] underline underline-offset-2">
              Got it
            </button>
          </div>
        )
      })()}

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

      {/* Store profile — logo + banner (existing sellers update here) */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 mb-6">
        <h2 className="serif text-xl font-medium text-[var(--ink)] mb-1">Store profile</h2>
        <p className="text-sm text-[var(--muted)] mb-5">
          Your profile picture and banner show on your public store page. Pick a file only for
          what you want to change — anything you leave empty stays as it is.
        </p>
        <form onSubmit={saveBranding} className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1.5">
              Profile picture
            </p>
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-[var(--off)] border border-[var(--border)] mb-2">
              <SafeImage src={absMedia(profile?.store_logo)} alt="Store profile picture" className="w-full h-full object-cover" />
            </div>
            <input name="store_logo" type="file" accept="image/*"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors" />
            <p className="text-[11px] text-[var(--muted)] mt-1">Square looks best (e.g. 800 × 800 px).</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1.5">
              Banner image
            </p>
            <div className="h-20 rounded-2xl overflow-hidden bg-[var(--off)] border border-[var(--border)] mb-2">
              <SafeImage src={absMedia(profile?.store_banner)} alt="Store banner" className="w-full h-full object-cover" />
            </div>
            <input name="store_banner" type="file" accept="image/*"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors" />
            <p className="text-[11px] text-[var(--muted)] mt-1">Wide banner works best (e.g. 1600 × 400 px).</p>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" loading={brandingMutation.isPending} className="rounded-xl w-full sm:w-auto">
              Save profile pictures
            </Button>
          </div>
        </form>
      </div>

      {/* Commission Info Widget — fixed 10/5 tiers */}
      {commissionInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">
                Commission: 10% under GHS 100 · 5% from GHS 100
              </h3>
              <p className="text-sm text-blue-800 mb-3">
                {commissionInfo.explanation}
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {(commissionInfo.tiers || []).map(tier => (
                  <div key={tier.label} className="bg-white rounded-lg px-4 py-3 text-xs space-y-1">
                    <p className="font-semibold text-blue-900">{tier.label} — {tier.rate}%</p>
                    <div className="flex justify-between">
                      <span className="text-blue-700">You list at:</span>
                      <span className="font-semibold text-blue-900">GHS {tier.example.your_price}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Buyers pay:</span>
                      <span className="font-semibold text-blue-900">GHS {tier.example.buyer_pays}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">You receive:</span>
                      <span className="font-bold text-green-600">GHS {tier.example.your_price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery mode — platform drivers or self-delivery */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between gap-3 mb-1">
          <h2 className="serif text-xl font-medium text-[var(--ink)]">Delivery mode</h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            (profile?.delivery_mode || 'platform') === 'self'
              ? 'bg-amber-50 text-amber-700'
              : 'bg-green-50 text-green-700'
          }`}>
            {(profile?.delivery_mode || 'platform') === 'self' ? 'Self delivery' : 'Platform delivery'}
          </span>
        </div>
        <p className="text-sm text-[var(--muted)] mb-5">
          Platform drivers pick up from your store (tiered fee goes to the platform), or deliver
          yourself and keep your own flat fee on every order.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { mode: 'platform', title: 'Platform delivery', desc: 'Drivers handle pickup & drop-off. You focus on products.' },
            { mode: 'self', title: 'Self delivery', desc: 'You deliver. Your fee below is added at checkout and settled to you.' },
          ].map(({ mode, title, desc }) => {
            const selected = (profile?.delivery_mode || 'platform') === mode
            return (
              <button key={mode} type="button" onClick={() => !deliveryMutation.isPending && setDeliveryMode(mode)}
                disabled={deliveryMutation.isPending}
                aria-pressed={selected}
                className={`text-left rounded-xl border p-4 transition-all min-h-[44px] ${
                  selected
                    ? 'border-[var(--ink)] bg-[var(--off)]'
                    : 'border-[var(--border)] bg-white hover:border-[var(--muted)]'
                }`}>
                <p className="text-sm font-semibold text-[var(--ink)] flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selected ? 'border-[var(--ink)]' : 'border-[var(--border)]'}`}>
                    {selected && <span className="w-2 h-2 rounded-full bg-[var(--ink)]" />}
                  </span>
                  {title}
                </p>
                <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">{desc}</p>
              </button>
            )
          })}
        </div>
        {(profile?.delivery_mode || 'platform') === 'self' && (
          <form onSubmit={saveDeliveryFee} className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="flex-1">
              <label htmlFor="delivery-fee" className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1.5 block">
                Your delivery fee per order (GHS 0–50)
              </label>
              <input
                id="delivery-fee"
                type="number" min="0" max="50" step="0.5"
                value={deliveryFee}
                onChange={e => setDeliveryFee(e.target.value)}
                placeholder={parseFloat(profile?.custom_delivery_fee || 0).toFixed(2)}
                className="w-full px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-70"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" loading={deliveryMutation.isPending} className="rounded-xl w-full sm:w-auto">
                Save fee
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Store links & contact — shown on your public store page */}
      <div className="bg-white border border-[var(--border)] rounded-2xl p-6 mb-6">
        <h2 className="serif text-xl font-medium text-[var(--ink)] mb-1">Store links &amp; contact</h2>
        <p className="text-sm text-[var(--muted)] mb-5">
          Add your social pages so buyers can watch your product videos, plus a WhatsApp
          number they can chat with you on. All optional — only filled ones show on your store.
        </p>
        <form onSubmit={saveLinks} key={profile?.id || 'loading'} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-1">
            <label htmlFor="link-whatsapp" className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1.5 block">
              WhatsApp number
            </label>
            <input
              id="link-whatsapp"
              name="whatsapp_number"
              type="tel"
              defaultValue={profile?.whatsapp_number || ''}
              placeholder="e.g. 0244123456"
              className="w-full px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-70"
            />
          </div>
          {[
            { name: 'tiktok_url', label: 'TikTok link', placeholder: 'https://tiktok.com/@yourstore', value: profile?.tiktok_url },
            { name: 'facebook_url', label: 'Facebook link', placeholder: 'https://facebook.com/yourstore', value: profile?.facebook_url },
            { name: 'instagram_url', label: 'Instagram link', placeholder: 'https://instagram.com/yourstore', value: profile?.instagram_url },
            { name: 'youtube_url', label: 'YouTube link', placeholder: 'https://youtube.com/@yourstore', value: profile?.youtube_url },
          ].map(({ name, label, placeholder, value }) => (
            <div key={name} className="sm:col-span-1">
              <label htmlFor={`link-${name}`} className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider mb-1.5 block">
                {label}
              </label>
              <input
                id={`link-${name}`}
                name={name}
                type="url"
                inputMode="url"
                defaultValue={value || ''}
                placeholder={placeholder}
                className="w-full px-4 py-3 min-h-[48px] text-base md:text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] placeholder:text-[var(--muted)] placeholder:opacity-70"
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Button type="submit" loading={linksMutation.isPending} className="rounded-xl w-full sm:w-auto">
              Save links
            </Button>
          </div>
        </form>
      </div>

      {/* Payout account — Paystack settlement target (T+1/T+2, not instant) */}
      {!subaccountActive && !isLoading && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-6 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-800">Connect your payout account</p>
            <p className="text-amber-700 mt-0.5">
              Buyers pay on Paystack and your share is allocated to you at checkout — but checkout of your
              items is blocked until you connect it. Payouts reach your account in 1–2 business days.
              {profile?.subaccount_status === 'failed' && profile?.subaccount_note && (
                <span className="block mt-1 font-medium">Last error: {profile.subaccount_note}</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Settlement summary (allocated at checkout, paid out in 1–2 business days) */}
      <div className="bg-[var(--ink)] rounded-2xl p-6 lg:p-8 mb-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/10 rounded-xl flex items-center justify-center">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wider">Settled to you</p>
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
          No withdrawals needed — your share of every sale is allocated to you at checkout (item total
          minus commission: 10% under GHS 100, 5% from GHS 100).
        </p>
        <div className="mt-4 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-xs text-white/70 leading-relaxed">
          <p className="font-semibold text-white mb-1">How and when you get paid</p>
          <p>
            Your share goes straight to your MoMo within <span className="font-semibold text-white">minutes of each paid order</span> (up
            to 24 hours in batch cases) — no withdrawals, no waiting days. A <span className="font-semibold text-white">GHS 1 transfer fee</span> comes
            out of each payout (list 50 → receive 49); sales under GHS 5 carry no fee. Payouts go only to the
            account above and can&apos;t be reversed — a wrong number means the loss is yours (§11). Keep your
            login secret: anyone in your account can change where money goes (§12).
          </p>
        </div>

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
            <p className="md:col-span-4 text-[11px] text-white/50 leading-relaxed">
              I confirm this MoMo/bank number is mine and correct. I understand payouts go only to this
              account, transfers can&apos;t be reversed, and a wrong number means the loss is mine (§11).
            </p>
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