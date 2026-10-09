import MainLayout from '../layouts/MainLayout'

export default function RefundPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-2">Refund &amp; Return Policy</h1>
        <p className="text-xs text-[var(--muted)] mb-8">Last updated: October 1, 2026</p>

        <div className="space-y-6 text-sm text-[var(--muted)] leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Eligibility</h2>
            <p>You may request a return or refund if the item is defective or damaged upon delivery, the item does not match its description, and the request is made within <strong>7 days of delivery</strong>.</p>
            <p className="mt-2">Not returnable: used or worn items, custom or made-to-order items, digital products, perishable or hygiene-sensitive items, sale or clearance items (final sale).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Return Process</h2>
            <ol className="list-decimal ml-5 mt-2 space-y-1">
              <li>Contact the seller within 7 days with photos and details</li>
              <li>Seller arranges pickup at no extra cost (for valid returns)</li>
              <li>Seller inspects the returned item</li>
              <li>If approved, refund is processed to your original payment method</li>
              <li>Refunds take 3-7 business days to appear in your account</li>
            </ol>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Refund Method</h2>
            <p>Card purchases: original card (3-7 business days). Mobile Money: original MoMo number (1-2 business days). Note: Paystack processing fees are non-refundable.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Damaged or Lost in Transit</h2>
            <p>If your order arrives damaged or is lost during delivery, report to support within 24 hours with photos of packaging and damage. We will work with the seller to arrange a replacement or refund.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Disputes</h2>
            <p>If you and the seller cannot agree, contact support at myjaysstore@gmail.com with your order number, photos, and explanation. We will mediate and make a fair decision. Sellers are the first and primary resolver — platform mediation is a last resort, not a first step.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">Seller Timeline</h2>
            <p>Sellers must process approved refunds within 5 business days. Failure to do so may result in account suspension.</p>
          </section>
        </div>
      </div>
    </MainLayout>
  )
}
