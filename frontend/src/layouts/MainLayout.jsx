import Navbar from './Navbar'
import Footer from './Footer'
import BottomTabBar from '../components/common/BottomTabBar'
import TestingBanner from '../components/common/TestingBanner'
import FeedbackWidget from '../components/common/FeedbackWidget'

export default function MainLayout({ children, hideFooter = false, hideTabs = false }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* TESTING-ONLY */}
      <TestingBanner />
      <Navbar />
      <main className="flex-1 min-w-0">
        {children}
      </main>
      {!hideFooter && <Footer />}
      {/* TESTING-ONLY */}
      <FeedbackWidget />
      {!hideTabs && (
        <>
          <BottomTabBar />
          {/* Spacer so the fixed tab bar never covers footer content on mobile */}
          <div aria-hidden className="md:hidden h-[calc(4.5rem+env(safe-area-inset-bottom))]" />
        </>
      )}
    </div>
  )
}