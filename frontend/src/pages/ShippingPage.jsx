import MainLayout from '../layouts/MainLayout'

export default function ShippingPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-2">Shipping &amp; Delivery Policy</h1>
        <p className="text-xs text-[var(--muted)] mb-8">Last updated: October 1, 2026</p>

        <div className="space-y-6 text-sm text-[var(--muted)] leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Delivery Areas</h2>
            <p>Currently serving <strong>Navrongo and surrounding areas</strong> in Ghana. We&apos;re expanding to more regions soon.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Delivery Fees</h2>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>1-5 items: GHS 5</li>
              <li>6-10 items: GHS 10</li>
              <li>11+ items: GHS 20</li>
            </ul>
            <p className="mt-2">Delivery fees are calculated at checkout and are non-refundable unless the entire order is cancelled before dispatch.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Delivery Timeframes</h2>
            <p>Within Navrongo: 1-2 business days. Surrounding areas: 2-3 business days. Delivery time starts when the seller confirms the order is ready for pickup. Sellers have 3 business days to prepare orders.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Delivery Process</h2>
            <ol className="list-decimal ml-5 mt-2 space-y-1">
              <li>Our driver collects the order from the seller</li>
              <li>Driver calls the provided phone number upon arrival</li>
              <li>You provide the 4-digit OTP from your email</li>
              <li>Item is handed over once OTP is verified</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Failed Deliveries</h2>
            <p>A GHS 5 redelivery fee applies for incorrect address, no response after 15 minutes wait, or recipient unavailable. We attempt delivery up to 2 times, after which the order returns to the seller.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Order Tracking</h2>
            <p>Track your order in real time: go to &quot;My Orders&quot; in your account and click &quot;Track Order&quot; for your active order.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Damage During Transit</h2>
            <p>If your order arrives damaged, do not accept delivery — inform the driver immediately, then contact support within 24 hours at myjaysstore@gmail.com with photos. We&apos;ll arrange a replacement or refund.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Contact Us</h2>
            <p>Email: myjaysstore@gmail.com<br />Phone: 053-566-8728<br />Hours: Monday-Friday, 9am-5pm</p>
          </section>
        </div>
      </div>
    </MainLayout>
  )
}
