import { useState } from 'react'
import { Outlet, Navigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useLocation } from 'react-router'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { useAuthStore } from '@/store/auth.store'

export function AppLayout() {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  // Desktop: the side menu can be folded away so a wide sheet (the trip
  // roster, the ledger reports) gets the whole width. Remembered per browser.
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('sidebar_collapsed') === '1' } catch { return false }
  })
  const setCollapsed = (v: boolean) => {
    try { localStorage.setItem('sidebar_collapsed', v ? '1' : '0') } catch { /* storage unavailable */ }
    setSidebarCollapsed(v)
  }
  const toggleCollapsed = () => setCollapsed(!sidebarCollapsed)

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={sidebarCollapsed} onExpand={() => setCollapsed(false)} />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopHeader onMenuToggle={() => setSidebarOpen((o) => !o)} sidebarCollapsed={sidebarCollapsed} onSidebarToggle={toggleCollapsed} />
        <div id="app-scroll-container" className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scrollbar-hide">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="max-w-[1600px] mx-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
