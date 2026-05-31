import { useState } from 'react'
import { Mail, Phone, MapPin, Clock, Send } from 'lucide-react'
import MainLayout from '../layouts/MainLayout'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '', email: '', subject: '', message: '', role: 'buyer',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) {
      return toast.error('Please fill in all required fields')
    }
    setSubmitting(true)
    // Simulate submission — connect to email service in production
    await new Promise(r => setTimeout(r, 1200))
    setSubmitting(false)
    setSubmitted(true)
    toast.success('Message sent! We\'ll get back to you soon.')
  }

  const contacts = [
    {
      icon: <Mail size={20} />,
      label: 'Email us',
      value: 'josephagalga5@gmail.com',
      sub: 'We reply within 24 hours',
    },
    {
      icon: <Phone size={20} />,
      label: 'Call us',
      value: '0535668728',
      sub: 'Mon–Fri, 8am–6pm',
    },
    {
      icon: <MapPin size={20} />,
      label: 'Visit us',
      value: 'Navrongo, Ghana',
      sub: 'By appointment only',
    },
    {
      icon: <Clock size={20} />,
      label: 'Support hours',
      value: 'Mon–Sat',
      sub: '8:00am – 8:00pm GMT',
    },
  ]

  const faqs = [
    {
      q: 'How do I track my order?',
      a: 'Log into your buyer account and go to My Orders. You\'ll see the real-time status of every order.',
    },
    {
      q: 'How do I become a verified driver?',
      a: 'Register as a driver, upload your Ghana Card and a selfie. Our admin team reviews and verifies within 24 hours.',
    },
    {
      q: 'Can I sell on Jay\'s Store?',
      a: 'Yes! Register as a seller, set up your store and start listing products immediately. No upfront cost.',
    },
    {
      q: 'What is the AI Stylist?',
      a: 'Our AI Stylist is powered by Google Gemini. Tell it your occasion, budget and style and it finds the perfect outfit from our catalog.',
    },
    {
      q: 'How much does delivery cost?',
      a: 'Delivery is free on all orders over GHS 300. A flat GHS 30 fee applies to orders below that.',
    },
    {
      q: 'How do I return a product?',
      a: 'Contact us within 7 days of delivery. We\'ll arrange a return pickup at no extra cost for defective items.',
    },
  ]

  return (
    <MainLayout>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pt-20 pb-16">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-[var(--accent)] uppercase tracking-widest mb-5">
            Get in Touch
          </p>
          <h1 className="serif text-5xl lg:text-6xl font-medium text-[var(--ink)] leading-tight mb-6">
            We're here<br />
            <em className="italic font-normal text-[var(--muted)]">to help.</em>
          </h1>
          <p className="text-base text-[var(--muted)] font-light leading-relaxed">
            Have a question about an order, need help with your store, or just
            want to say hello? We'd love to hear from you.
          </p>
        </div>
      </section>

      {/* Contact info cards */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {contacts.map(({ icon, label, value, sub }) => (
            <div key={label}
              className="bg-white border border-[var(--border)] rounded-2xl p-5">
              <div className="w-10 h-10 bg-[var(--off)] rounded-xl flex items-center justify-center text-[var(--ink)] mb-4">
                {icon}
              </div>
              <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1">
                {label}
              </p>
              <p className="text-sm font-semibold text-[var(--ink)]">{value}</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Form + FAQ */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-20">
        <div className="grid lg:grid-cols-2 gap-12">

          {/* Contact form */}
          <div>
            <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-6">
              Send a message
            </h2>

            {submitted ? (
              <div className="bg-green-50 border border-green-100 rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send size={22} className="text-green-600" />
                </div>
                <h3 className="serif text-2xl font-medium text-[var(--ink)] mb-2">
                  Message sent!
                </h3>
                <p className="text-sm text-[var(--muted)]">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Role */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
                    I am a
                  </label>
                  <div className="flex gap-2">
                    {['buyer', 'seller', 'driver', 'other'].map(r => (
                      <button key={r} type="button"
                        onClick={() => setForm(p => ({ ...p, role: r }))}
                        className={`px-4 py-2 text-xs font-medium rounded-full border capitalize transition-all ${
                          form.role === r
                            ? 'bg-[var(--ink)] text-white border-[var(--ink)]'
                            : 'bg-white text-[var(--muted)] border-[var(--border)] hover:border-[var(--ink)]'
                        }`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Full Name *"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your name"
                  />
                  <Input
                    label="Email *"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                  />
                </div>

                <Input
                  label="Subject"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="What is this about?"
                />

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[var(--ink)] uppercase tracking-wider">
                    Message *
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    rows={5}
                    placeholder="Tell us how we can help..."
                    className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-white outline-none focus:border-[var(--ink)] transition-colors resize-none placeholder:text-[var(--border)]"
                  />
                </div>

                <Button
                  type="submit"
                  loading={submitting}
                  className="rounded-xl w-fit">
                  <Send size={15} />
                  Send Message
                </Button>
              </form>
            )}
          </div>

          {/* FAQ */}
          <div>
            <h2 className="serif text-3xl font-medium text-[var(--ink)] mb-6">
              Frequently asked
            </h2>
            <div className="space-y-3">
              {faqs.map(({ q, a }) => (
                <FaqItem key={q} question={q} answer={a} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  )
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-[var(--border)] rounded-2xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-[var(--off)] transition-colors">
        <span className="text-sm font-semibold text-[var(--ink)]">{question}</span>
        <span className={`text-[var(--muted)] text-lg leading-none flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-45' : ''}`}>
          +
        </span>
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--muted)] font-light leading-relaxed pt-4">
            {answer}
          </p>
        </div>
      )}
    </div>
  )
}