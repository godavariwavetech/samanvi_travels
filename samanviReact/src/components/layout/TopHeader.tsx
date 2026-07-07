import { useState, useRef, useEffect } from 'react'
import { Bell, Search, ChevronRight, CalendarDays, ChevronDown, Check, Menu } from 'lucide-react'
import { useLocation } from 'react-router'
import { useFYStore } from '@/store/fy.store'
import { getFYList } from '@/lib/fy'

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/analysis': 'Document Expiry Analysis',
  '/helpdesk': 'Help Desk',
  '/trips/approvals': 'Admin Approvals',
  '/booking/collection-agent': 'Collection Agent',
  '/booking/accountant': 'Accountant Dashboard',
  '/accounting/voucher-approvals': 'Voucher Approvals',
  '/accounting/profit-loss': 'Profit & Loss',
  '/users': 'User Management',
  '/roles': 'Roles & Permissions',
  '/masters/service-for': 'Service For',
  '/masters/bus-no': 'Bus Numbers',
  '/masters/service-no': 'Service Numbers',
  '/masters/staff': 'Staff Register',
  '/masters/spare-tank': 'Spare Tank',
  '/mainmasters/vehicle-type': 'Vehicle Types',
  '/mainmasters/vehicle-company': 'Vehicle Companies',
  '/mainmasters/seating-capacity': 'Seating Capacities',
  '/mainmasters/chassis-model': 'Chassis Models',
  '/trips/creation': 'Trip Creation',
  '/trips/expenses': 'Trip Expenses',
  '/trips/reports': 'Trip Reports',
  '/trips/deleted': 'Deleted Trips',
  '/trips/logs': 'Trip Logs',
  '/booking/data': 'Booking Data',
  '/booking/expenses': 'Booking Expenses',
  '/booking/history': 'Booking History',
  '/booking/all-expenses': 'All Expenses',
  '/fuel/entry': 'Fuel Entry',
  '/fuel/target': 'Fuel Target',
  '/fuel/reports': 'Fuel Reports',
  '/fuel/bus-wise': 'Bus Wise Reports',
  '/fuel/driver-wise': 'Driver Wise Reports',
  '/fuel/approved': 'Approved Fuel Reports',
  '/laundry/vendor': 'Add Vendor',
  '/laundry/bill': 'Laundry Bill',
  '/laundry/statement': 'Laundry Statement',
  '/laundry/approved': 'Approved Vouchers',
  '/accounting/voucher': 'Voucher Entry',
  '/accounting/approved': 'Approved Vouchers',
  '/accounting/daybook': 'Day Book',
  '/accounting/trial-balance': 'Trial Balance',
  '/accounting/balance-sheet': 'Balance Sheet',
  '/accounting/ledger-wise': 'Ledger Wise',
  '/accounting/group-wise': 'Group Wise',
  '/payroll/payment': 'Salary Payment',
  '/payroll/statement': 'Salary Statement',
  '/garage/repair-entry': 'Repair Entry',
  '/garage/tracking': 'Repair Tracking',
  '/garage/reports': 'Garage Reports',
  '/garage/service-reminders': 'Service Reminders',
  '/garage/tyre-inventory': 'Tyre Inventory',
  '/garage/tyre-position': 'Tyre Position',
  '/garage/battery-management': 'Battery Management',
  '/mainmasters/voucher-type': 'Voucher Types',
  '/mainmasters/groups': 'Group Management',
  '/mainmasters/static-entry': 'Static Entry',
  '/mainmasters/laundry-products': 'Laundry Products',
  '/mainmasters/garage-masters': 'Garage Masters',
  '/reports': 'Reports',
}

const fyList = getFYList(4)

interface TopHeaderProps {
  onMenuToggle: () => void
}

export function TopHeader({ onMenuToggle }: TopHeaderProps) {
  const { pathname } = useLocation()
  const label = ROUTE_LABELS[pathname] ?? pathname.split('/').pop() ?? 'Dashboard'
  const { selectedFY, setFY } = useFYStore()

  const [open, setOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!searchOpen) return
    const handler = (e: MouseEvent) => {
      if (!searchRef.current?.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [searchOpen])

  return (
    <header className="h-14 sm:h-20 bg-white/40 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-3 sm:px-6 lg:px-10 z-20 sticky top-0 shadow-[0_4px_30px_rgb(0,0,0,0.02)] gap-2 sm:gap-3">

      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden flex-shrink-0 p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider min-w-0">
          <span className="text-[#2563EB] hidden sm:block whitespace-nowrap">Samanvi Hub</span>
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 hidden sm:block flex-shrink-0" />
          <span className="text-slate-900 truncate">{label}</span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">

        {/* Financial Year Selector — hidden on xs, visible sm+ */}
        <div ref={ref} className="relative hidden sm:block">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl border border-slate-200 bg-white/70 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-white hover:border-blue-300 transition-all shadow-sm"
          >
            <CalendarDays className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
            <span className="text-blue-600 hidden md:inline">{selectedFY.label}</span>
            <span className="text-blue-600 md:hidden">{selectedFY.startYear}/{String(selectedFY.startYear + 1).slice(2)}</span>
            <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Financial Year
              </div>
              {fyList.map((fy) => (
                <button
                  key={fy.startYear}
                  onClick={() => { setFY(fy); setOpen(false) }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    fy.startYear === selectedFY.startYear
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{fy.label}</span>
                  <span className="text-xs text-slate-400 font-normal">
                    {fy.startYear === selectedFY.startYear
                      ? <Check className="w-3.5 h-3.5 text-blue-500" />
                      : `Apr ${fy.startYear}`}
                  </span>
                </button>
              ))}
              <div className="px-3 py-1.5 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                Apr 1 – Mar 31
              </div>
            </div>
          )}
        </div>

        {/* Search — desktop always visible, mobile as expandable icon */}
        <div ref={searchRef} className="relative group">
          {/* Desktop search */}
          <div className="hidden md:block relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search anything..."
              className="w-44 lg:w-56 h-9 sm:h-10 pl-11 pr-4 rounded-xl bg-white/60 border border-slate-200/60 text-sm focus:ring-2 focus:ring-[#2563EB]/50 outline-none transition-all focus:bg-white font-medium placeholder:text-slate-400"
            />
          </div>
          {/* Mobile search icon */}
          <button
            onClick={() => setSearchOpen((o) => !o)}
            className="md:hidden p-2 text-slate-500 hover:text-slate-700 bg-white/60 border border-slate-200/60 rounded-xl hover:bg-white transition-all"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>
          {/* Mobile search dropdown */}
          {searchOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 p-2 rounded-xl border border-slate-200 bg-white shadow-xl z-50 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search anything..."
                  className="w-full h-10 pl-10 pr-4 rounded-lg bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-[#2563EB]/50 outline-none font-medium placeholder:text-slate-400"
                />
              </div>
            </div>
          )}
        </div>

        {/* Notifications bell */}
        <button className="relative p-2 sm:p-2.5 text-slate-400 hover:text-slate-700 bg-white/60 border border-slate-200/60 rounded-full hover:bg-white transition-all shadow-sm">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#EF4444] rounded-full border-2 border-white" />
        </button>
      </div>
    </header>
  )
}
