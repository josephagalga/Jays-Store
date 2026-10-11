import { Link } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'

export default function ComingSoonPage({ title = 'Coming soon' }) {
  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-24 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--muted)] mb-4">
          My Jay&apos;s Store
        </p>
        <h1 className="serif text-4xl md:text-5xl font-medium text-[var(--ink)] mb-4">
          {title}
        </h1>
        <p className="text-sm text-[var(--muted)] max-w-md mx-auto mb-8">
          We&apos;re busy building the marketplace first. This page opens soon —
          meanwhile, come shop with us.
        </p>
        <Link to="/"
          className="inline-flex items-center px-6 py-3 bg-[var(--ink)] text-white text-sm font-semibold rounded-full hover:opacity-80 transition-opacity">
          Back to home
        </Link>
      </div>
    </MainLayout>
  )
}
