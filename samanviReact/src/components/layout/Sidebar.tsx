import type { ElementType } from 'react'
import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { NavLink, useLocation } from 'react-router'
import {
  LayoutDashboard, Users, Map, Building2, Briefcase,
  CreditCard, Shirt, Settings, LogOut,
  Fuel, ChevronDown, ChevronRight, X, Wrench, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'

// ── Types ─────────────────────────────────────────────────────────────────────
interface NavLeaf {
  label: string
  path: string
}

interface NavSubGroup {
  label: string
  children: NavChild[]
}

type NavChild = NavLeaf | NavSubGroup

function isSubGroup(c: NavChild): c is NavSubGroup {
  return 'children' in c
}

function flattenLeafs(children: NavChild[]): NavLeaf[] {
  return children.flatMap(c => (isSubGroup(c) ? flattenLeafs(c.children) : [c]))
}

interface NavItem {
  id: string
  label: string
  icon: ElementType
  path?: string
  children?: NavChild[]
}

// ── Nav data ──────────────────────────────────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'users', label: 'Users', icon: Users, path: '/users' },
  {
    id: 'masters', label: 'Masters', icon: Settings,
    children: [
      { label: 'Bus Numbers',    path: '/masters/bus-no' },
      { label: 'Service Numbers',path: '/masters/service-no' },
      { label: 'Staff Register', path: '/masters/staff' },
      { label: 'Sold Out / Service Out', path: '/masters/service-out' },
    ],
  },
  { id: 'validations', label: 'Validations', icon: ShieldCheck, path: '/validations' },
  {
    id: 'trips', label: 'Trip Management', icon: Map,
    children: [
      { label: 'Trip Creation',  path: '/trips/creation' },
      { label: 'Trip Expenses',  path: '/trips/expenses' },
      { label: 'Admin Approvals',path: '/trips/approvals' },
      { label: 'Trip Reports',   path: '/trips/reports' },
      { label: 'Deleted Trips',  path: '/trips/deleted' },
      { label: 'Trip Logs',      path: '/trips/logs' },
    ],
  },
  {
    id: 'fuel', label: 'Fuel', icon: Fuel,
    children: [
      { label: 'Fuel Entry',       path: '/fuel/entry' },
      { label: 'Fuel Approved Reports', path: '/fuel/reports' },
      { label: 'Fuel Target',      path: '/fuel/target' },
      { label: 'Day Wise',         path: '/fuel/day-wise' },
      { label: 'Station Wise',     path: '/fuel/station-wise' },
      { label: 'Bus Wise',         path: '/fuel/bus-wise' },
      { label: 'Driver Wise',      path: '/fuel/driver-wise' },
      { label: 'Target Report',    path: '/fuel/target-report' },
      { label: 'Top Performers',   path: '/fuel/top-performers' },
    ],
  },
  {
    id: 'laundry', label: 'Laundry', icon: Shirt,
    children: [
      { label: 'Add Vendor',       path: '/laundry/vendor' },
      { label: 'Laundry Bill',     path: '/laundry/bill' },
      { label: 'Statement',        path: '/laundry/statement' },
      { label: 'Approved Vouchers',path: '/laundry/approved' },
    ],
  },
  {
    id: 'garage', label: 'Garage', icon: Wrench,
    children: [
      {
        label: 'Maintenance',
        children: [
          { label: 'Job Creation',      path: '/garage/repair-entry' },
          { label: 'Repair Tracking',   path: '/garage/tracking' },
          { label: 'Repeat Jobs',       path: '/garage/repeat-jobs' },
          { label: 'Service Reminders', path: '/garage/service-reminders' },
          { label: 'Reports',           path: '/garage/reports' },
        ],
      },
      {
        label: 'Tyre Management',
        children: [
          {
            label: 'Inventory',
            children: [
              { label: 'New Tyre Entry',     path: '/garage/tyre-inventory' },
              { label: 'Retread Tyre Entry', path: '/garage/tyre-retread' },
            ],
          },
          { label: 'Allocation',    path: '/garage/tyre-position' },
          { label: 'Tyre Movement', path: '/garage/tyre-movement' },
          { label: 'Tyre Repair',   path: '/garage/tyre-repair' },
          { label: 'Tyre Stock & Status', path: '/garage/tyre-stock-availability' },
          { label: 'Tyre Sale',     path: '/garage/tyre-sale' },
          { label: 'Reports',       path: '/garage/tyre-reports' },
        ],
      },
      { label: 'Battery Management', path: '/garage/battery-management' },
    ],
  },
  {
    id: 'payroll', label: 'Pay Roll', icon: Briefcase,
    children: [
      { label: 'Salary Generation', path: '/payroll/generation' },
      { label: 'Salary Payment',    path: '/payroll/payment' },
      { label: 'Salary Statement',  path: '/payroll/statement' },
    ],
  },
  {
    id: 'accounting', label: 'Accounts', icon: CreditCard,
    children: [
      // NavSubGroup labels are now section dividers — all items visible directly
      {
        label: 'Entry',
        children: [
          { label: 'Voucher Entry', path: '/accounting/voucher' },
        ],
      },
      {
        label: 'Reports',
        children: [
          { label: 'Voucher',            path: '/accounting/voucher-approvals' },
          { label: 'Ledger',            path: '/accounting/ledger-wise' },
          { label: 'Group',             path: '/accounting/group-wise' },
          { label: 'Day Book',          path: '/accounting/daybook' },
          { label: 'Trial Balance',     path: '/accounting/trial-balance' },
          { label: 'Balance Sheet',     path: '/accounting/balance-sheet' },
          { label: 'Profit & Loss',     path: '/accounting/profit-loss' },
        ],
      },
    ],
  },
  {
    id: 'mainmasters', label: 'Main Masters', icon: Building2,
    children: [
      { label: 'Service For',        path: '/masters/service-for' },
      { label: 'Static Entry',       path: '/mainmasters/static-entry' },
      { label: 'Voucher Types',      path: '/mainmasters/voucher-type' },
      { label: 'Group Management',   path: '/mainmasters/groups' },
      { label: 'Laundry Products',   path: '/mainmasters/laundry-products' },
      { label: 'Garage Masters',     path: '/mainmasters/garage-masters' },
      { label: 'Tyre Masters',       path: '/mainmasters/tyre-masters' },
      { label: 'Vehicle Type',       path: '/mainmasters/vehicle-type' },
      { label: 'Vehicle Company',    path: '/mainmasters/vehicle-company' },
      { label: 'Seating Capacity',   path: '/mainmasters/seating-capacity' },
      { label: 'Chassis Model',      path: '/mainmasters/chassis-model' },
      { label: 'Body Builder',       path: '/mainmasters/body-builder' },
      { label: 'Luxury Type',        path: '/mainmasters/luxury-type' },
      { label: 'Mfg Year',           path: '/mainmasters/mfg-year' },
      { label: 'Battery Brand',      path: '/mainmasters/battery-brand' },
      { label: 'Battery Capacity',   path: '/mainmasters/battery-capacity' },
      { label: 'City List',          path: '/mainmasters/city-list' },
      { label: 'Boarding Point',     path: '/mainmasters/boarding-point' },
      { label: 'Bus Operator',       path: '/mainmasters/bus-operator' },
      { label: 'Line Code',          path: '/mainmasters/line-code' },
      { label: 'Route ID',           path: '/mainmasters/route-id' },
    ],
  },
]

// ── Sub-group (3rd level) — always visible, label is a decorative divider ─────
function NavSubSection({
  group,
  onClose,
}: {
  group: NavSubGroup
  onClose: () => void
}) {
  const location = useLocation()
  const isAnyActive = flattenLeafs(group.children).some(c => location.pathname.startsWith(c.path))

  return (
    <div className="mt-1">
      {/* Section label — not clickable, just a visible category header */}
      <p className={cn(
        'px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-widest',
        isAnyActive ? 'text-teal-400/80' : 'text-slate-600',
      )}>
        {group.label}
      </p>
      <div className="space-y-0.5">
        {group.children.map((child, i) =>
          isSubGroup(child) ? (
            <div key={i} className="pl-2 border-l border-slate-700/40">
              <NavSubSection group={child} onClose={onClose} />
            </div>
          ) : (
            <NavLink
              key={child.path}
              to={child.path}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'block px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  isActive
                    ? 'text-[#14B8A6] bg-white/5'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40',
                )
              }
            >
              {child.label}
            </NavLink>
          ),
        )}
      </div>
    </div>
  )
}

// ── Top-level group (2nd level) ───────────────────────────────────────────────
function NavGroup({ item, onClose }: { item: NavItem; onClose: () => void }) {
  const location = useLocation()

  const allLeafs = flattenLeafs(item.children ?? [])
  const isChildActive = allLeafs.some(c => location.pathname.startsWith(c.path))
  const [open, setOpen] = useState(isChildActive)

  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all text-sm font-bold group relative overflow-hidden',
          isChildActive
            ? 'text-white bg-white/10 border border-white/5'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50',
        )}
      >
        {isChildActive && (
          <motion.div
            layoutId="activeNav"
            className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#2563EB] to-[#7C3AED] rounded-r-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"
          />
        )}
        <item.icon
          className={cn(
            'w-5 h-5 transition-colors flex-shrink-0',
            isChildActive ? 'text-[#14B8A6]' : 'text-slate-500 group-hover:text-slate-300',
          )}
        />
        <span className="flex-1 text-left">{item.label}</span>
        {open
          ? <ChevronDown className="w-4 h-4 text-slate-500" />
          : <ChevronRight className="w-4 h-4 text-slate-500" />}
      </button>

      {open && (
        <div className="ml-9 mt-1 space-y-0.5 border-l border-slate-700/50 pl-3">
          {(item.children ?? []).map((child, i) =>
            isSubGroup(child) ? (
              <NavSubSection key={i} group={child} onClose={onClose} />
            ) : (
              <NavLink
                key={child.path}
                to={child.path}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'block px-3 py-2 rounded-xl text-xs font-semibold transition-all',
                    isActive
                      ? 'text-[#14B8A6] bg-white/5'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800/40',
                  )
                }
              >
                {child.label}
              </NavLink>
            ),
          )}
        </div>
      )}
    </div>
  )
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    onClose()
  }, [location.pathname])

  return (
    <aside
      className={cn(
        'w-[220px] bg-[#0F172A] text-white flex flex-col shadow-2xl flex-shrink-0',
        'fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
        'lg:relative lg:translate-x-0 lg:h-auto',
      )}
    >
      {/* Logo */}
      <div className="h-24 flex items-center px-5 gap-3 border-b border-slate-800/80">
        <div className="w-12 h-12 bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-2xl flex items-center justify-center shadow-lg border border-white/10 flex-shrink-0">
          <span className="font-black text-2xl text-white">S</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
            Samanvi
          </h2>
          <p className="text-[11px] text-blue-400 font-bold uppercase tracking-[0.2em] mt-0.5">
            Enterprise ERP
          </p>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700/50 transition-colors flex-shrink-0"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          if (item.children) return <NavGroup key={item.id} item={item} onClose={onClose} />
          return (
            <NavLink
              key={item.id}
              to={item.path!}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl transition-all text-sm font-bold group relative overflow-hidden',
                  isActive
                    ? 'text-white bg-white/10 border border-white/5'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="activeNav"
                      className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#2563EB] to-[#7C3AED] rounded-r-full"
                    />
                  )}
                  <item.icon
                    className={cn(
                      'w-5 h-5 transition-colors flex-shrink-0',
                      isActive ? 'text-[#14B8A6]' : 'text-slate-500 group-hover:text-slate-300',
                    )}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          )
        })}
      </div>

      {/* User footer */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800/60 transition-colors">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center font-bold text-sm text-white flex-shrink-0">
            {user?.name?.charAt(0) ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate text-white">{user?.name ?? 'Admin'}</p>
            <p className="text-xs text-slate-400 truncate font-medium">{user?.department_name ?? 'Head Office'}</p>
          </div>
          <button
            onClick={logout}
            className="text-slate-500 hover:text-red-400 transition-colors p-1"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
