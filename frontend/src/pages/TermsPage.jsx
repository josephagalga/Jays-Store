import MainLayout from '../layouts/MainLayout'

export default function TermsPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-2">Terms of Service</h1>
        <p className="text-xs text-[var(--muted)] mb-8">Last updated: October 1, 2026</p>

        <div className="space-y-6 text-sm text-[var(--muted)] leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">1. Agreement to Terms</h2>
            <p>By accessing and using My Jay&apos;s Store, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not use our platform.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">2. Platform Overview</h2>
            <p>My Jay&apos;s Store is an online marketplace connecting buyers with independent sellers in Ghana. We provide the platform for transactions but are not a party to the direct sale between buyer and seller.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">3. User Accounts</h2>
            <p><strong>Buyers:</strong> You must provide accurate information, keep your account secure, be at least 18 years old, and pay for orders you place.</p>
            <p className="mt-2"><strong>Sellers:</strong> You must provide valid identification (Ghana Card) and business details. Your store and products are subject to approval. You agree to fulfill orders within the stated timeframe and authorize us to add our commission on top of your listed prices.</p>
            <p className="mt-2"><strong>Drivers:</strong> You must provide valid Ghana Card and selfie for verification. Delivery OTP is required for order handoff.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">4. Ordering and Payment</h2>
            <p>All prices are in Ghana Cedis (GHS). The price shown on each product is the price you pay — no hidden charges. Payments are processed securely through Paystack. Orders are confirmed only after successful payment.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">5. Delivery</h2>
            <p>Platform delivery fees: GHS 5 (1-5 items), GHS 10 (6-10 items), GHS 20 (11+ items). Vendors who deliver themselves set their own flat per-order fee, shown at checkout. Delivery only within Navrongo and surrounding areas — more towns will be added as we grow. You must provide a valid address and phone number. OTP verification is required upon delivery.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">6. Returns and Refunds</h2>
            <p>Contact the seller within 7 days of delivery for defective items. Defective items may be returned at no extra cost. Refunds are processed through the original payment method. See our Refund Policy for full details.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">7. Prohibited Activities</h2>
            <p>You may not list illegal items, engage in fraudulent transactions, harass other users, or attempt to circumvent our fee structure.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">8. Limitation of Liability</h2>
            <p>My Jay&apos;s Store is not liable for disputes between buyers and sellers beyond mediation, product quality, delivery delays beyond our control, or third-party service failures.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">9. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">10. Governing Law</h2>
            <p>These terms are governed by the laws of Ghana. Questions? Contact myjaysstore@gmail.com.</p>
          </section>
        </div>
      </div>
    </MainLayout>
  )
}
