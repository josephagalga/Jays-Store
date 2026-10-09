import useAuthStore from '../store/authStore'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import MainLayout from '../layouts/MainLayout'

const sections = [
  {
    role: 'buyer',
    title: 'Buyer Help',
    icon: '🛍️',
    items: [
      {
        title: 'How to shop',
        body: 'Browse the catalog, add items to your bag, and checkout as a guest or signed-in buyer. You can filter by gender, category, price, and sort by newest or price.'
      },
      {
        title: 'Paying with Paystack',
        body: 'We use Paystack for secure payments. You can pay with Mobile Money (MTN, Telecel, AirtelTigo), Visa, Mastercard, or bank transfer. The total shown at checkout includes all fees — what you see is what you pay.'
      },
      {
        title: 'Delivery & OTP',
        body: 'Delivery is tiered: GHS 5 (1-5 items), GHS 10 (6-10), GHS 20 (11+). After payment, a 4-digit OTP appears on your tracking page and orders inbox. Give this code to the driver on arrival — they cannot mark the order delivered without it.'
      },
      {
        title: 'Returns & Refunds',
        body: 'Defective items can be returned within 7 days at no extra cost. Contact the seller first, then we\'ll arrange pickup. Refunds go back to your original payment method (3-7 business days).'
      },
      {
        title: 'Guest vs Signed-in',
        body: 'You can shop as a guest (just phone + email) or create an account to track orders, save your address, and sync your bag across devices. Guest orders can be claimed later by creating an account with the same email.'
      },
    ]
  },
  {
    role: 'seller',
    title: 'Seller Help',
    icon: '🏪',
    items: [
      {
        title: 'Opening your store',
        body: 'Register as a seller, upload your Ghana Card + selfie for KYC verification. Once approved, you can add products, set prices (your net amount — commission is added on top for buyers), and manage orders from your dashboard.'
      },
      {
        title: 'Pricing & Commission',
        body: 'You set your net price (what you want to receive). The platform adds its commission on top — buyers pay the marked-up price. You always receive exactly what you listed. Commission is fixed: 10% on products under GHS 100, 5% on products of GHS 100 or more.'
      },
      {
        title: 'Self-Delivery Option',
        body: 'You can choose to deliver your own orders. In your dashboard, set your delivery mode to "Self delivery" and a flat per-order fee (GHS 0-50). Buyers see this fee at checkout. You confirm handoff with the buyer\'s OTP in your dashboard — no driver needed.'
      },
      {
        title: 'Payouts',
        body: 'When a buyer pays, your net share goes straight to your MoMo within minutes (up to 24 hours in batch cases) — no withdrawals, no waiting days. A GHS 1 transfer fee comes out of each payout (sales under GHS 5 carry no fee). Payouts go only to your saved account and cannot be reversed. Track every payout in Wallet and the Settlements page.'
      },
      {
        title: 'Order Management',
        body: 'New orders appear in your Seller Dashboard. If self-delivering, confirm handoff with the buyer\'s OTP. If platform-delivering, a driver will pick up from your store address. Keep stock updated to avoid cancellations.'
      },
    ]
  },
  {
    role: 'driver',
    title: 'Driver Help',
    icon: '🏍️',
    items: [
      {
        title: 'Getting started',
        body: 'Register as a driver with your Ghana Card + selfie. Once verified, you\'ll see available orders in your dashboard. Accept an order to see pickup details (vendor address + phone) and drop-off details (buyer address + phone + OTP).'
      },
      {
        title: 'Delivery flow',
        body: '1) Accept order → 2) Pick up from vendor (show vendor the order) → 3) Navigate to buyer → 4) Call buyer on arrival → 5) Buyer gives you the 4-digit OTP → 6) Enter OTP in app → Order marked delivered.'
      },
      {
        title: 'Earnings',
        body: 'Earnings are paid physically by admin (out of system). Your dashboard shows total deliveries, success rate, and earnings history. Maintain a high success rate to get more orders.'
      },
      {
        title: 'Availability',
        body: 'Toggle "Available" on/off in your dashboard to control when you receive new orders. You can only have one active delivery at a time.'
      },
    ]
  },
  {
    role: 'admin',
    title: 'Admin Help',
    icon: '⚙️',
    items: [
      {
        title: 'Dashboard',
        body: 'Overview of orders, revenue, pending driver verifications, and quick actions. Use the finance page to see per-order money flows and the seller earnings leaderboard to see top/least earners.'
      },
      {
        title: 'Seller Management',
        body: 'View all sellers, review the fixed 10/5 commission tiers and past rate-change history. Sellers can be self-delivery or platform-delivery; earnings go out as instant MoMo transfers (GHS 1 fee per payout) — track every transfer on the Settlements page.'
      },
      {
        title: 'Driver Verification',
        body: 'Review pending driver applications (Ghana Card + selfie). Approve or reject with a reason. Approved drivers appear in the available driver pool.'
      },
      {
        title: 'Email & Deliverability',
        body: 'Check the Email Logs page for failed sends. Use the "Send Test Email" button to verify SMTP configuration. Common issues: Gmail app password expired, 2FA not enabled, or daily quota exceeded.'
      },
      {
        title: 'Seller Earnings Leaderboard',
        body: 'View all sellers ranked by lifetime net earnings. See gross revenue, commission paid, delivery share, and net earnings. Identify top and least earners at a glance.'
      },
    ]
  },
]

function HelpItem({ item }) {
  return (
    <details className="group bg-white border border-[var(--border)] rounded-xl overflow-hidden">
      <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
        <h3 className="font-semibold text-[var(--ink)]">{item.title}</h3>
        <span className="text-[var(--muted)] transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="px-5 pb-5 pt-2 text-sm text-[var(--muted)] leading-relaxed border-t border-[var(--border)]">
        {item.body}
      </div>
    </details>
  )
}

function HelpSection({ section }) {
  return (
    <section className="mb-12" aria-labelledby={section.role}>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{section.icon}</span>
        <h2 id={section.role} className="serif text-2xl md:text-3xl font-medium text-[var(--ink)]">
          {section.title}
        </h2>
      </div>
      <div className="space-y-3">
        {section.items.map((item, i) => (
          <HelpItem key={i} item={item} />
        ))}
      </div>
    </section>
  )
}

export default function HelpCenterPage() {
  const { user } = useAuthStore()
  const role = user?.role || 'buyer'
  const currentSection = sections.find(s => s.role === role) || sections[0]
  const otherSections = sections.filter(s => s.role !== role)

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
        <header className="mb-10">
          <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-2">Help Center</h1>
          <p className="text-sm text-[var(--muted)]">
            Quick answers for <strong>{currentSection.title}</strong>. Other roles available below.
          </p>
        </header>

        <HelpSection section={currentSection} />

        <div className="border-t border-[var(--border)] pt-10">
          <h2 className="serif text-2xl font-medium text-[var(--ink)] mb-6">Other guides</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {otherSections.map(section => (
              <Link key={section.role} to={`/help#${section.role}`}
                className="p-4 bg-[var(--off)] border border-[var(--border)] rounded-xl hover:border-[var(--ink)] hover:bg-white transition-colors">
                <div className="text-2xl mb-2">{section.icon}</div>
                <p className="font-medium text-[var(--ink)]">{section.title}</p>
                <p className="text-xs text-[var(--muted)] mt-1">{section.items.length} topics</p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 p-5 bg-[var(--off)] rounded-2xl text-center">
          <p className="text-sm text-[var(--muted)] mb-2">Still need help?</p>
          <p className="text-sm text-[var(--ink)] mb-3">Email us at <a href="mailto:myjaysstore@gmail.com" className="underline hover:no-underline">myjaysstore@gmail.com</a></p>
          <a href="/contact" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--ink)] text-white text-sm font-medium rounded-xl hover:opacity-80 transition-opacity">
            Contact Support
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </MainLayout>
  )
}