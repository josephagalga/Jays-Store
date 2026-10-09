import MainLayout from '../layouts/MainLayout'

export default function TermsPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-2">Terms of Service</h1>
        <p className="text-xs text-[var(--muted)] mb-8">Last updated: October 9, 2026 (v2026-10-2.0)</p>

        <div className="space-y-6 text-sm text-[var(--muted)] leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">1. Agreement to Terms</h2>
            <p>By accessing and using My Jay&apos;s Store, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not use our platform.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">2. Platform Overview</h2>
            <p>My Jay&apos;s Store is an online marketplace connecting buyers with independent sellers in Ghana. We provide the platform for transactions but are not a party to the direct sale between buyer and seller. Delivery issues, product quality, and returns are strictly between buyer and seller: buyers must contact the seller first (within 7 days, with photos), and the seller alone resolves it — replacement, fix, or approved return. The platform does not intervene in disputes and does not guarantee any outcome.</p>
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
            <p>My Jay&apos;s Store is not a party to any sale and assumes no liability for dispute outcomes, product quality, delivery delays beyond our control, third-party service failures, payouts misdirected by seller-entered details, or unauthorized use of a user&apos;s account. We may suspend accounts that violate these terms, but suspension is enforcement — not compensation and not mediation.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">9. Termination</h2>
            <p>We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">10. Governing Law</h2>
            <p>These terms are governed by the laws of Ghana. Questions? Contact myjaysstore@gmail.com.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">11. Seller Payout Liability</h2>
            <p>You are solely responsible for the correctness of your payout (MoMo/bank) details. Payouts are processed automatically to the account on record and cannot be reversed. If a payout fails or goes to the wrong account because of details you entered, the loss is yours — the platform will help trace it but will not reimburse it. A GHS 1 transfer fee applies per payout (absorbed by the platform on sales under GHS 5). Payouts are sent within minutes of each paid order (up to 24 hours in batch cases).</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">12. Account Security</h2>
            <p>You are responsible for keeping your login credentials secret. If someone accesses your account and changes your payout details or otherwise acts as you, those actions are attributed to you. Tell us immediately if you suspect compromise so we can lock the account — but completed payouts made before the lock cannot be recovered by us.</p>
          </section>
        </div>
      </div>
    </MainLayout>
  )
}
