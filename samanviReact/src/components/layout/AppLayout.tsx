import { useEffect, useMemo, useState } from 'react'
import { Outlet, Navigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { useLocation } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ShieldOff } from 'lucide-react'
import { Sidebar, firstAllowedPath } from './Sidebar'
import { TopHeader } from './TopHeader'
import { useAuthStore } from '@/store/auth.store'
import { authService } from '@/services/auth.service'
import { buildAccess, canAccess } from '@/lib/access'

export function AppLayout() {
  const { isAuthenticated, menu, setMenu } = useAuthStore()
  const location = useLocation()

  // Permissions are re-read from the server (on load, and when the tab regains
  // focus), so a change made on User Management applies without signing out.
  // A deactivated user gets status 401 back, which the API client signs out.
  const { data: freshMenu } = useQuery({
    queryKey: ['my-menu'],
    queryFn: () => authService.getMyMenu(),
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  })
  useEffect(() => {
    if (freshMenu?.status === 200 && Array.isArray(freshMenu.data)) setMenu(freshMenu.data)
  }, [freshMenu, setMenu])
  const access = useMemo(() => buildAccess(menu), [menu])
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

  // Typing or bookmarking the URL of a screen the user has no permission for
  // lands them on the first screen they do have.
  const allowed = canAccess(location.pathname, access)
  const home = allowed ? null : firstAllowedPath(access)
  if (home && home !== location.pathname) {
    return <Navigate to={home} replace />
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
              {allowed ? <Outlet /> : (
                <div className="flex flex-col items-center justify-center text-center py-24 text-slate-500">
                  <ShieldOff className="w-12 h-12 text-slate-300 mb-3" />
                  <p className="font-semibold text-slate-700">You don't have access to any screens yet</p>
                  <p className="text-sm mt-1">Ask an admin to assign module permissions to your user.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
