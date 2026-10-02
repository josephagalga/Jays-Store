import MainLayout from '../layouts/MainLayout'

export default function PrivacyPage() {
  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
        <h1 className="serif text-3xl md:text-4xl font-medium text-[var(--ink)] mb-2">Privacy Policy</h1>
        <p className="text-xs text-[var(--muted)] mb-8">Last updated: October 1, 2026</p>

        <div className="space-y-6 text-sm text-[var(--muted)] leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">1. Introduction</h2>
            <p>Welcome to Jay&apos;s Store (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your personal information and your right to privacy under the Ghana Data Protection Act, 2012 (Act 843). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">2. Information We Collect</h2>
            <p>We collect information you provide directly to us:</p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li><strong>Account Information:</strong> Name, email address, phone number, delivery address</li>
              <li><strong>Identity Documents:</strong> Ghana Card number and image, selfie photograph (for seller and driver verification)</li>
              <li><strong>Payment Information:</strong> Processed securely through Paystack. We do not store your card details</li>
              <li><strong>Business Information:</strong> Store name, bank account details, mobile money number (for sellers)</li>
              <li><strong>Transaction Records:</strong> Orders, payments, settlements, delivery records</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">3. How We Use Your Information</h2>
            <p>We use your information to: process orders and payments, verify seller and driver identities, deliver products to your address, send order confirmations and delivery OTPs, improve our services, and comply with legal obligations.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">4. Data Sharing</h2>
            <p>We share information with sellers (delivery address and phone for fulfillment), drivers (order and delivery address), Paystack (payment processing), and government authorities when required by law. We never sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">5. Data Retention</h2>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Account data: retained while your account is active</li>
              <li>Identity documents: deleted within 30 days of account closure</li>
              <li>Order records: retained for 6 years for legal purposes</li>
              <li>Delivery OTPs: deleted after 24 hours</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">6. Your Rights (Act 843)</h2>
            <p>You have the right to access your personal data, correct inaccurate data, request deletion of your data (within legal limits), and withdraw consent for marketing. To exercise these rights, contact us at myjaysstore@gmail.com.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">7. Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your data, including encryption, secure servers, and access controls.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-[var(--ink)] mb-2">8. Contact Us</h2>
            <p>Email: myjaysstore@gmail.com<br />Address: Navrongo, Ghana</p>
          </section>
        </div>
      </div>
    </MainLayout>
  )
}
