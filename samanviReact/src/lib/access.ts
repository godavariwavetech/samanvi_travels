import type { MenuItem } from '@/store/auth.store'

// Which permission opens which screen.
//
// Permissions are stored per sub-module (sub_modules / permissions tables, set
// on User Management). Those rows date from the old Angular app, so their own
// `path` column does not match the React routes - the ids are mapped here.
//
// A screen lists the sub-module ids that open it (any one is enough). Screens
// added in the React app have no sub-module row of their own; they name the
// main module instead and open for anyone holding any permission in it.
// A route not listed here is open to every signed-in user.
export interface AccessRule {
  subs?: number[]
  module?: number
}

// main_modules ids
const M = {
  dashboard: 1, users: 2, helpdesk: 3, masters: 12, accounts: 14,
  mainMasters: 15, laundry: 16, fuel: 17, trips: 18, garage: 19, payroll: 20,
} as const

const GROUPS = { subs: [23, 24, 25, 27] }

export const PATH_ACCESS: Record<string, AccessRule> = {
  '/dashboard/analysis': { subs: [1] },
  '/dashboard': { module: M.dashboard },

  '/users': { subs: [2] },
  '/roles': { subs: [2] },

  '/masters/bus-no': { subs: [55] },
  '/masters/service-no': { subs: [56] },
  '/masters/staff': { subs: [57] },
  '/masters/service-out': { subs: [55] },
  '/masters/spare-tank': { module: M.masters },
  '/masters/service-for': { subs: [8] },

  // Driver documents live on the staff register, vehicle papers on the bus master.
  '/validations/drivers': { subs: [57] },
  '/validations/vehicles': { subs: [55] },

  '/trips/creation': { subs: [34] },
  '/trips/expenses': { subs: [35] },
  '/trips/approvals': { module: M.trips },
  '/trips/reports': { subs: [41] },
  '/trips/deleted': { subs: [59] },
  '/trips/logs': { subs: [58] },

  '/fuel/entry': { subs: [31] },
  '/fuel/reports': { subs: [60] },
  '/fuel/target': { subs: [33] },
  '/fuel/day-wise': { subs: [45] },
  '/fuel/station-wise': { subs: [46] },
  '/fuel/bus-wise': { subs: [47] },
  '/fuel/target-report': { subs: [48] },
  '/fuel/driver-wise': { subs: [49] },
  '/fuel/top-performers': { subs: [50] },

  '/laundry/vendor': { subs: [30] },
  '/laundry/bill': { subs: [43] },
  // Its sub-module row is switched off (d_in = 1), so nobody could be granted it.
  '/laundry/statement': { module: M.laundry },
  '/laundry/approved': { subs: [66] },

  '/garage/repair-entry': { subs: [62] },
  // Job Approval (200) and Job Completion (201) are steps on the tracking screen.
  '/garage/tracking': { subs: [63, 200, 201] },
  '/garage/repeat-jobs': { subs: [62, 63] },
  '/garage/scheduled-jobs': { subs: [62, 63] },
  '/garage/reports': { subs: [64] },
  '/garage/service-reminders': { module: M.garage },
  '/garage/battery-management': { module: M.garage },
  '/garage/tyre-': { module: M.garage },

  '/payroll/generation': { subs: [52] },
  '/payroll/payment': { subs: [42] },
  '/payroll/statement': { module: M.payroll },

  '/accounting/voucher-approvals': { subs: [61] },
  '/accounting/approved': { subs: [61] },
  '/accounting/voucher': { subs: [36] },
  '/accounting/daybook': { subs: [38] },
  '/accounting/trial-balance': { subs: [39] },
  '/accounting/balance-sheet': { subs: [40] },
  '/accounting/profit-loss': { subs: [37] },
  '/accounting/ledger-wise': { subs: [53] },
  '/accounting/group-wise': { subs: [54] },
  '/accounting/payables-view': { module: M.accounts },
  '/booking': { module: M.accounts },

  '/mainmasters/static-entry': { subs: [22] },
  '/mainmasters/voucher-type': { subs: [29] },
  '/mainmasters/groups': GROUPS,
  '/mainmasters/main-group': GROUPS,
  '/mainmasters/sub-group': GROUPS,
  '/mainmasters/laundry-products': { subs: [32] },
  '/mainmasters/garage-masters': { subs: [65] },
  '/mainmasters': { module: M.mainMasters },
}

export interface Access {
  subs: Set<number>
  modules: Set<number>
}

export function buildAccess(menu: MenuItem[] | undefined): Access {
  const subs = new Set<number>()
  const modules = new Set<number>()
  for (const m of menu ?? []) {
    modules.add(Number(m.id))
    for (const s of m.submenu ?? []) {
      subs.add(Number(s.id))
      modules.add(Number(s.module_id))
    }
  }
  return { subs, modules }
}

// The most specific rule for a path: an exact entry, else the longest entry the
// path starts with ('/garage/tyre-' covers every tyre screen, '/mainmasters'
// every master list without an entry of its own).
function ruleFor(pathname: string): AccessRule | undefined {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (PATH_ACCESS[path]) return PATH_ACCESS[path]
  let best: string | undefined
  for (const key of Object.keys(PATH_ACCESS)) {
    const prefixMatch = key.endsWith('-') ? path.startsWith(key) : path.startsWith(key + '/')
    if (prefixMatch && (!best || key.length > best.length)) best = key
  }
  return best ? PATH_ACCESS[best] : undefined
}

export function canAccess(pathname: string, access: Access): boolean {
  const rule = ruleFor(pathname)
  if (!rule) return true
  if (rule.subs) return rule.subs.some((id) => access.subs.has(id))
  if (rule.module != null) return access.modules.has(rule.module)
  return true
}
