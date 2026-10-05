import { Link } from 'react-router-dom'
import { useState } from 'react'
import api from '../services/api'
import toast from 'react-hot-toast'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [subscribing, setSubscribing] = useState(false)

  const subscribe = async (e) => {
    e.preventDefault()
    if (!email.trim()) return toast.error('Enter your email address')
    setSubscribing(true)
    try {
      const res = await api.post('/accounts/newsletter/subscribe/', { email: email.trim() })
      toast.success(res.data.message || 'Subscribed!')
      setEmail('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Subscription failed. Try again.')
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <footer className="bg-[var(--ink)] text-white mt-16 md:mt-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-12 md:pt-16 pb-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 pb-12 border-b border-white/10">

          {/* Brand */}
          <div className="col-span-2 md:col-span-2">
            <h2 className="serif text-2xl font-medium mb-4">Jay's Store</h2>
            <p className="text-sm text-white/45 font-light leading-relaxed max-w-xs mb-8">
              A modern fashion marketplace celebrating Ghanaian style. Shop from local sellers, delivered to your door.
            </p>
            <div>
              <p className="text-xs text-white/30 font-medium mb-3 uppercase tracking-wider">Newsletter</p>
              <form onSubmit={subscribe} className="flex gap-0 border-b border-white/20 pb-2 max-w-xs">
                <input type="email" placeholder="your@email.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none" />
                <button type="submit" disabled={subscribing}
                  className="text-xs text-white/50 hover:text-white transition-colors ml-3 font-medium disabled:opacity-40">
                  {subscribing ? '...' : 'Join →'}
                </button>
              </form>
            </div>
          </div>

          {/* Links */}
          {[
            ['Shop', [['New In', '/catalog'], ['Men', '/catalog?gender=men'], ['Women', '/catalog?gender=women'], ['Kids', '/catalog?gender=kids'], ['Sale', '/catalog?sale=true']]],
            ['Help', [['Help Center', '/help'],['About', '/about'],['Contact', '/contact'],['Careers', '/'],['Press', '/']]],
            ['Legal', [['Privacy Policy', '/privacy'],['Terms of Service', '/terms'],['Refund Policy', '/refund'],['Shipping', '/shipping']]],
            ['Join', [['Buy Fashion', '/register'], ['Sell Fashion', '/register/seller'], ['Deliver Orders', '/register/driver']]],
          ].map(([heading, links]) => (
            <div key={heading}>
              <p className="text-xs font-medium text-white/30 uppercase tracking-wider mb-5">{heading}</p>
              <ul className="flex flex-col gap-3">
                {links.map(([label, to]) => (
                  <li key={label}>
                    <Link to={to} className="text-sm text-white/50 hover:text-white transition-colors font-light">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-8">
          <p className="text-xs text-white/25">© {new Date().getFullYear()} Jay's Store. All rights reserved.</p>
          <p className="text-xs text-white/25">Made with care in Ghana 🇬🇭</p>
        </div>
      </div>
    </footer>
  )
}