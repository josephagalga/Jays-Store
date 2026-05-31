import { Link } from 'react-router-dom'
import { ArrowRight, ShoppingBag, Truck, Sparkles, Users } from 'lucide-react'
import MainLayout from '../layouts/MainLayout'

export default function AboutPage() {
  const values = [
    {
      icon: <ShoppingBag size={22} />,
      title: 'Local First',
      desc: 'We champion Ghanaian fashion designers and sellers, giving them a professional platform to reach thousands of buyers.',
    },
    {
      icon: <Sparkles size={22} />,
      title: 'AI-Powered Discovery',
      desc: 'Our Gemini-powered AI stylist helps buyers find the perfect outfit based on their occasion, budget and personal style.',
    },
    {
      icon: <Truck size={22} />,
      title: 'Reliable Delivery',
      desc: 'Our verified driver network ensures every order reaches buyers safely and on time, with real-time tracking.',
    },
    {
      icon: <Users size={22} />,
      title: 'Community Driven',
      desc: 'We are building more than a store — a community where local fashion thrives and every voice matters.',
    },
  ]

  const team = [
    { name: 'Joseph Agalga', role: 'Founder & CEO', initial: 'JA' },
    { name: 'Operations', role: 'Platform & Logistics', initial: 'OP' },
    { name: 'Design', role: 'UI/UX & Brand', initial: 'DS' },
    { name: 'Tech', role: 'Engineering', initial: 'TC' },
  ]

  return (
    <MainLayout>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-16">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[var(--accent)] uppercase tracking-widest mb-5">
            Our Story
          </p>
          <h1 className="serif text-5xl lg:text-6xl font-medium text-[var(--ink)] leading-tight mb-6">
            Fashion that<br />
            <em className="italic font-normal text-[var(--muted)]">celebrates</em><br />
            Ghana.
          </h1>
          <p className="text-base text-[var(--muted)] font-light leading-relaxed max-w-xl">
            Jay's Store was built with one mission — to give Ghanaian fashion the
            platform it deserves. We connect talented local sellers with style-conscious
            buyers, powered by AI and delivered with care.
          </p>
        </div>
      </section>

      {/* Full-width banner */}
      <section className="bg-[var(--ink)] py-20 mb-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            {[
              ['200+', 'Products Listed'],
              ['50+', 'Local Sellers'],
              ['Ghana', 'Made with Pride 🇬🇭'],
            ].map(([num, label]) => (
              <div key={label}>
                <p className="serif text-5xl font-medium text-white mb-2">{num}</p>
                <p className="text-sm text-white/40 font-light">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-20">
        <div className="mb-12">
          <p className="text-xs font-medium text-[var(--accent)] uppercase tracking-widest mb-3">
            What We Stand For
          </p>
          <h2 className="serif text-4xl font-medium text-[var(--ink)]">Our Values</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map(({ icon, title, desc }) => (
            <div key={title}
              className="bg-white border border-[var(--border)] rounded-2xl p-6">
              <div className="w-11 h-11 bg-[var(--off)] rounded-xl flex items-center justify-center text-[var(--ink)] mb-5">
                {icon}
              </div>
              <h3 className="serif text-xl font-medium text-[var(--ink)] mb-3">
                {title}
              </h3>
              <p className="text-sm text-[var(--muted)] font-light leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-20">
        <div className="bg-[var(--off)] rounded-3xl p-10 lg:p-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-medium text-[var(--accent)] uppercase tracking-widest mb-4">
              Our Mission
            </p>
            <h2 className="serif text-4xl font-medium text-[var(--ink)] leading-tight mb-5">
              Building Ghana's<br />
              <em className="italic font-normal text-[var(--muted)]">fashion future.</em>
            </h2>
            <p className="text-sm text-[var(--muted)] font-light leading-relaxed mb-8">
              We believe fashion is more than clothing — it's culture, identity and
              expression. Our platform exists to ensure that Ghanaian creativity
              reaches everyone, and that every seller has the tools to build a
              sustainable business.
            </p>
            <Link to="/register/seller"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink)] hover:gap-3 transition-all">
              Start selling with us <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Sellers supported', value: '50+' },
              { label: 'Orders delivered', value: '1000+' },
              { label: 'Driver earnings paid', value: 'GHS 10k+' },
              { label: 'Buyer satisfaction', value: '4.8 ★' },
            ].map(({ label, value }) => (
              <div key={label}
                className="bg-white border border-[var(--border)] rounded-2xl p-5">
                <p className="serif text-3xl font-medium text-[var(--ink)] mb-1">
                  {value}
                </p>
                <p className="text-xs text-[var(--muted)] font-light">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-20">
        <div className="mb-12">
          <p className="text-xs font-medium text-[var(--accent)] uppercase tracking-widest mb-3">
            The People
          </p>
          <h2 className="serif text-4xl font-medium text-[var(--ink)]">Our Team</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {team.map(({ name, role, initial }) => (
            <div key={name}
              className="bg-white border border-[var(--border)] rounded-2xl p-6 text-center">
              <div className="w-16 h-16 bg-[var(--ink)] rounded-full flex items-center justify-center text-white serif text-xl font-medium mx-auto mb-4">
                {initial}
              </div>
              <p className="font-semibold text-sm text-[var(--ink)]">{name}</p>
              <p className="text-xs text-[var(--muted)] mt-1">{role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-20">
        <div className="bg-[var(--ink)] rounded-3xl p-10 lg:p-16 text-center">
          <h2 className="serif text-4xl font-medium text-white mb-4">
            Ready to join us?
          </h2>
          <p className="text-sm text-white/40 font-light mb-8 max-w-md mx-auto">
            Whether you're a buyer, seller or driver — there's a place for you
            in the Jay's Store community.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/catalog"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[var(--ink)] text-sm font-semibold rounded-full hover:bg-[var(--off)] transition-colors">
              Start Shopping
            </Link>
            <Link to="/register/seller"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/20 text-white text-sm font-medium rounded-full hover:bg-white/10 transition-colors">
              Open a Store
            </Link>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}