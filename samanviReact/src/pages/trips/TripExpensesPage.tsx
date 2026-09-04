import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Receipt, Save, Search, X, PlusCircle, MinusCircle, FileText, FolderPlus, History, Clock } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, SearchableSelect, Select } from '@/components/shared'
import ChangeNote from '@/components/shared/ChangeNote'
import type { Column } from '@/components/shared'
import { tripsService } from '@/services/trips.service'
import { accountingService } from '@/services/accounting.service'
import { mastersService } from '@/services/masters.service'

// ── Types ────────────────────────────────────────────────────────────────────
type LedgerObj = {
  ledger_id: string | number
  temple_name: string
  child?: any; district_id?: any; mandal_id?: any; subchildtwo?: any; village_id?: any
  staticname?: any; mandal_name?: any; subchildtwo_id?: any
  parent_subgroup_id?: any; parent_subchild_id?: any; parent_grp_level?: any
}
type PersonKey = 'driver1' | 'driver2' | 'helper' | 'conductor' | 'optDriver1' | 'optDriver2' | 'optHelper'
// Debit-side categories — the pre-existing EXPENSES ledgers the Angular app has
// always posted trip costs to, not new ones. Same ledgers, same split, same
// hardcoded ids as expenses.component.ts's addAutoDebitSalaryAndBeta(): Salaries
// (61) takes total_salary and Betas (62) takes total_beta, conductor included.
// Parking is the one addition — that screen has no parking field at all, but the
// ledger has always existed, so the amount posts there instead of being folded
// into Betas where it would be indistinguishable from crew pay.
type ExpenseKey = 'beta' | 'salary' | 'parking'
type RowTag = PersonKey | ExpenseKey | 'paidTo'
type LedgerRow = { ledger: LedgerObj | null; amount: string; personKey?: RowTag }

type ExpenseForm = {
  id: string; trip_creation_id: string
  trip_date: string; trip_for: string; trip_for_id: string
  bus_no: string; service_no: string; service_no_id: string
  driver1_name: string; driver1_id: string
  driver2_name: string; driver2_id: string
  helper_name: string; helper_id: string
  conductor_name: string; conductor_id: string
  opt_driver1_name: string; opt_driver1_id: string
  opt_driver2_name: string; opt_driver2_id: string
  opt_helper_name: string; opt_helper_id: string
  paid_to_name: string; paid_to_id: string; paid_to_type: string
  driveronebeta: string; driveronesalary: string; driveronesudsalary: string
  drivertwobeta: string; drivertwosalary: string; drivertwosudsalary: string
  helperbeta: string; helpersalary: string; helpersudsalary: string
  conductorsalary: string
  parking_amt: string
  remarks: string
}

type OrigMeta = { c_number: string; c_id: string; date: string; user_id: string; usr_nm: string }

const today = new Date().toISOString().split('T')[0]
const firstOfMonth = today.slice(0, 8) + '01'

const num = (v: any) => Number(v) || 0
const PERSON_KEYS: PersonKey[] = ['driver1', 'driver2', 'helper', 'conductor', 'optDriver1', 'optDriver2', 'optHelper']
const EXPENSE_KEYS: ExpenseKey[] = ['beta', 'salary', 'parking']
// Resolved by NAME, not id: these ledgers are seeded per database (see the trip
// expense ledger seed server-side), so their ids differ between deployments — the
// Angular app's hardcoded 61/62 only hold in its own older database. Names are
// normalised before comparing so "Beta's" and "Betas", "Salary's" and "Salaries"
// all resolve; the legacy id stays as a last-resort fallback.
const normLedgerName = (v: any) => String(v ?? '').toLowerCase().replace(/[^a-z]/g, '')
const isExpensesGroup = (l: any) => String(l?.district_id ?? '') === '4' || String(l?.staticname ?? '') === 'EXPENSES'
const EXPENSE_LEDGERS: Record<ExpenseKey, { id: number; name: string; aliases: string[] }> = {
  beta: { id: 62, name: 'Betas', aliases: ['betas', 'beta'] },
  salary: { id: 61, name: 'Salaries', aliases: ['salaries', 'salarys', 'salary'] },
  parking: { id: 84, name: 'Parking', aliases: ['parking'] },
}
const nowStr = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

const emptyForm = (): ExpenseForm => ({
  id: '', trip_creation_id: '',
  trip_date: '', trip_for: '', trip_for_id: '',
  bus_no: '', service_no: '', service_no_id: '',
  driver1_name: '', driver1_id: '',
  driver2_name: '', driver2_id: '',
  helper_name: '', helper_id: '',
  conductor_name: '', conductor_id: '',
  opt_driver1_name: '', opt_driver1_id: '',
  opt_driver2_name: '', opt_driver2_id: '',
  opt_helper_name: '', opt_helper_id: '',
  paid_to_name: '', paid_to_id: '', paid_to_type: '',
  driveronebeta: '', driveronesalary: '', driveronesudsalary: '',
  drivertwobeta: '', drivertwosalary: '', drivertwosudsalary: '',
  helperbeta: '', helpersalary: '', helpersudsalary: '',
  conductorsalary: '',
  parking_amt: '',
  remarks: '',
})

const emptyLedgerRow = (): LedgerRow => ({ ledger: null, amount: '' })

const canActOnExpense = (row: any) => row.status === 1 && row.admin_status !== 1 && row.admin_status !== 2

const toLedgerObj = (item: any): LedgerObj => ({
  ledger_id: item.ledger_id, temple_name: item.expensives ?? item.temple_name,
  child: item.child, district_id: item.district_id, mandal_id: item.mandal_id, subchildtwo: item.subchildtwo,
  village_id: item.village_id, staticname: item.staticname, mandal_name: item.mandal_name, subchildtwo_id: item.subchildtwo_id,
  parent_subgroup_id: item.parent_subgroup_id, parent_subchild_id: item.parent_subchild_id, parent_grp_level: item.parent_grp_level,
})

export default function TripExpensesPage() {
  const qc = useQueryClient()

  // Date-range filter (blank = show all pending/on-review trips)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [applied, setApplied] = useState<{ from: string; to: string } | null>(null)

  // Add/Edit modal
  const [modal, setModal] = useState<{ mode: 'add' | 'edit' | null; row: any }>({ mode: null, row: null })
  const [form, setForm] = useState<ExpenseForm>(emptyForm())
  const [debitRows, setDebitRows] = useState<LedgerRow[]>([emptyLedgerRow()])
  const [creditRows, setCreditRows] = useState<LedgerRow[]>([emptyLedgerRow()])
  const [origMeta, setOrigMeta] = useState<OrigMeta>({ c_number: '', c_id: '', date: '', user_id: '', usr_nm: '' })
  // Ledger ids resolved straight from the reopened expense's own saved row
  // (via getmodaldataMdl's driverX_ledger_id columns, LEFT JOINed with no
  // d_in filter) instead of cross-referencing the live drivers/helpers/staff
  // lists. Those lists only contain ACTIVE people (WHERE d_in='0'), so if a
  // driver/helper/conductor was terminated after the trip was filed, they'd
  // silently drop out of the cross-reference and their "Pay" checkbox would
  // show unchecked on reopen even though their ledger row is still right
  // there in Credit Accounts. Empty in Add mode (nobody's ledger needs
  // resolving from a terminated-safe source yet — the assignee is always
  // active on a brand-new trip), so personLedgerId falls back to the live
  // lists there.
  const [resolvedLedgerIds, setResolvedLedgerIds] = useState<Partial<Record<PersonKey, string>>>({})
  const [loadingModal, setLoadingModal] = useState(false)
  // Set when the user unticks Paid To — they want to place the leftover on some
  // other ledger by hand, so the auto-derived Paid To row stops coming back.
  const [paidToOptedOut, setPaidToOptedOut] = useState(false)

  // View modal
  const [viewModal, setViewModal] = useState<{ open: boolean; row: any; debit: any[]; credit: any[]; loading: boolean; ledgerIds: Partial<Record<PersonKey, string>> }>(
    { open: false, row: null, debit: [], credit: [], loading: false, ledgerIds: {} }
  )

  // Bus/driver/helper/conductor edit-history — logged server-side whenever
  // updateTrip() actually changes one of those fields (see buildUpdateTripPayload).
  const [historyModal, setHistoryModal] = useState<{ open: boolean; tripId: string; c_number: string }>({ open: false, tripId: '', c_number: '' })
  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['trip-history', historyModal.tripId],
    queryFn: () => tripsService.getTripHistory({ trip_id: historyModal.tripId }),
    enabled: historyModal.open && !!historyModal.tripId,
  })
  const historyList: any[] = historyData?.data ?? []

  // Quick "+ New Ledger" popover — opened from a specific debit/credit row so
  // the freshly created ledger can be auto-selected right back into that row.
  const [newLedgerFor, setNewLedgerFor] = useState<{ side: 'debit' | 'credit'; index: number } | null>(null)
  const [newLedgerName, setNewLedgerName] = useState('')
  const [newLedgerParentId, setNewLedgerParentId] = useState('')

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: listData, isLoading, refetch } = useQuery({
    queryKey: ['trip-expenses', applied],
    queryFn: () => applied ? tripsService.getExpensesFilter({ fromdate: applied.from, todate: applied.to }) : tripsService.getExpenses({}),
  })
  const { data: ledgerData, refetch: reloadLedgers, isFetching: loadingLedgers } = useQuery({
    queryKey: ['expense-trip-ledgers'],
    queryFn: () => accountingService.getExpenseTripLedger(),
  })
  // Drivers/Helpers/Staff — only needed to resolve each trip person's own
  // ledger_id (auto-created at registration, see ensurePersonLedger) so the
  // "pay this person" checkboxes below can drop their personal ledger straight
  // into the debit table instead of making the user search for it by name.
  const { data: driverData } = useQuery({ queryKey: ['drivers'], queryFn: () => mastersService.getDrivers() })
  const { data: helperData } = useQuery({ queryKey: ['helpers'], queryFn: () => mastersService.getHelper({ staffreports: 'Helper' }) })
  const { data: activeStaffData } = useQuery({ queryKey: ['active-staff'], queryFn: () => mastersService.getActiveStaff() })
  const { data: busData } = useQuery({ queryKey: ['buses'], queryFn: () => mastersService.getBuses() })
  // Drivers + helpers + staff in one list, each tagged with its paid_to_type —
  // the same source the Trip Creation grid's Paid To picker draws from (shared
  // query key, so it comes off that cache), letting Paid To be corrected here
  // rather than only back on the trip.
  const { data: paidToData } = useQuery({ queryKey: ['staff-all'], queryFn: () => mastersService.getStaff({}) })
  // Leaf containers a new ledger can be filed under (mainmasterssubchild,
  // level_depth 4 — "Drivers", "Payables", "Direct Expenses" etc.). Each row
  // already carries its own full ancestor chain (district_id/mandal_id/
  // mandal_name/child/village_id/staticentry), so no separate group/subgroup
  // fetch is needed to build the addLedgerData payload — same shape GroupPage
  // uses for its "add ledger under this node" action.
  const { data: subchildData } = useQuery({ queryKey: ['ledger-subchild-containers'], queryFn: () => accountingService.getMainMastersSubchild() })

  const trips: any[] = listData?.data ?? []
  const ledgerList: any[] = ledgerData?.data ?? []
  // openAdd/openEdit await getBeta before resolving ledgers, and a callback holds
  // the ledgerList from the render it was created in — so if the ledger query was
  // still in flight when the row was clicked, the whole handler ran against an
  // empty list and reported "Ledger not found" for Betas/Salaries/Parking even
  // though they exist. The ref always points at the newest list; ensureLedgers()
  // covers the case where the query genuinely hasn't returned yet.
  const ledgerRef = useRef<any[]>([])
  ledgerRef.current = ledgerList
  const ensureLedgers = async () => {
    if (ledgerRef.current.length) return
    const r = await reloadLedgers()
    ledgerRef.current = r.data?.data ?? []
  }
  const ledgerOptions = ledgerList.map((l: any) => ({ value: String(l.ledger_id), label: l.temple_name }))
  const findLedger = (id: string) => ledgerRef.current.find((l: any) => String(l.ledger_id) === id)

  const drivers: any[] = driverData?.data ?? []
  const helpers: any[] = helperData?.data ?? []
  const activeStaff: any[] = activeStaffData?.data ?? []
  // Every active staff member, not just those whose designation happens to read
  // "CONDUCTOR" — same reasoning as the Trip Creation grid, which dropped this
  // filter for exactly this bug. Designation is free text from a master picker,
  // so on a database where nobody carries that literal word the list came back
  // empty, the conductor dropdown had nothing in it, and resolving the trip's
  // conductor to their own ledger failed with "No ledger found for <name>" even
  // though the ledger existed and was correctly linked.
  const conductors: any[] = activeStaff
  const buses: any[] = busData?.data ?? []
  const paidToList: any[] = paidToData?.data ?? []
  const paidToOptions = paidToList.map((p: any) => ({
    value: p.paid_to_id + '_' + p.paid_to_type, label: p.paid_to_name + ' (' + p.paid_to_type + ')',
  }))

  const ledgerParents: any[] = (subchildData?.data ?? []).filter((c: any) => Number(c.level_depth) === 4 && Number(c.d_in) === 0)
  const ledgerParentOptions = ledgerParents.map((c: any) => ({
    value: String(c.id), label: `${c.staticentry} → ${c.mandal_name} → ${c.child} → ${c.temple_name}`,
  }))

  const personId = (key: PersonKey) => ({
    driver1: form.driver1_id, driver2: form.driver2_id, helper: form.helper_id, conductor: form.conductor_id,
    optDriver1: form.opt_driver1_id, optDriver2: form.opt_driver2_id, optHelper: form.opt_helper_id,
  }[key])
  const personName = (key: PersonKey) => ({
    driver1: form.driver1_name, driver2: form.driver2_name, helper: form.helper_name, conductor: form.conductor_name,
    optDriver1: form.opt_driver1_name, optDriver2: form.opt_driver2_name, optHelper: form.opt_helper_name,
  }[key])
  // A role only counts as "opting" when its own slot is NOT held by a real
  // person — an opting hand covers a vacant seat, they don't ride alongside the
  // assigned driver. Trips written before the Opting picker existed carry an
  // opt_* person next to a real driver; those aren't opting arrangements, so
  // they must neither show an Opting block nor bill an opting salary.
  const optingActive = (slotId: any, optId: any) => !!String(optId ?? '') && !String(slotId ?? '')
  const isOptingRole = (key: 'driver1' | 'driver2' | 'helper'): boolean => (
    key === 'driver1' ? optingActive(form.driver1_id, form.opt_driver1_id)
      : key === 'driver2' ? optingActive(form.driver2_id, form.opt_driver2_id)
        : optingActive(form.helper_id, form.opt_helper_id)
  )
  // Driver1/2, Helper, Conductor are their own per-trip beta only — the
  // "opting" salary top-up used to be added onto their own amount, but now
  // belongs to a *separate* opting person (own ledger), so it only counts
  // here when that role is genuinely being covered by an opting hand.
  const personAmount = (key: PersonKey): number => {
    if (key === 'driver1') return num(form.driveronesalary)
    if (key === 'driver2') return num(form.drivertwosalary)
    if (key === 'helper') return num(form.helpersalary)
    if (key === 'conductor') return num(form.conductorsalary)
    if (key === 'optDriver1') return isOptingRole('driver1') ? num(form.driveronesudsalary) : 0
    if (key === 'optDriver2') return isOptingRole('driver2') ? num(form.drivertwosudsalary) : 0
    return isOptingRole('helper') ? num(form.helpersudsalary) : 0 // optHelper
  }
  // Generic so the read-only View modal can resolve a person's ledger from
  // its own row data (driverX_id etc.) without going through `form` at all.
  const ledgerIdForPerson = (key: PersonKey, id: string): string => {
    if (!id) return ''
    const list = key === 'driver1' || key === 'driver2' || key === 'optDriver1' || key === 'optDriver2' ? drivers
      : key === 'helper' || key === 'optHelper' ? helpers : conductors
    const rec = list.find((r: any) => String(r.id) === String(id))
    return rec?.ledger_id ? String(rec.ledger_id) : ''
  }
  const personLedgerId = (key: PersonKey): string => resolvedLedgerIds[key] || ledgerIdForPerson(key, personId(key))
  // Person ledgers live on the CREDIT side: booking a trip's beta credits what
  // the company owes each crew member (their Payables ledger) against whichever
  // expense ledger is picked on the Debit side. The ledger-id fallback (not just
  // the personKey tag) is kept so a row loaded from an already-filed expense
  // still shows as checked. It deliberately excludes 'paidTo' rows: when this
  // person IS also Paid To, their own ledger and the overflow ledger are the
  // same account, so matching on 'paidTo' would make their checkbox look
  // permanently checked and impossible to toggle off (every uncheck just re-adds
  // the identical ledger back as the remainder).
  const isPersonChecked = (key: PersonKey) => {
    const ledgerId = personLedgerId(key)
    return creditRows.some((r) => r.personKey === key || (r.personKey !== 'paidTo' && ledgerId && r.ledger && String(r.ledger.ledger_id) === ledgerId))
  }

  const findExpenseLedger = (key: ExpenseKey) => {
    const { id, aliases } = EXPENSE_LEDGERS[key]
    return ledgerRef.current.find((l: any) => isExpensesGroup(l) && aliases.includes(normLedgerName(l.temple_name)))
      ?? ledgerRef.current.find((l: any) => Number(l.ledger_id) === id)
  }

  // Mirrors calculateTotalBeta()/calculateTotalSalary() in the Angular screen:
  // beta is the per-trip beta of all four roles, salary is the opting top-ups.
  const expenseAmount = (key: ExpenseKey): number => {
    if (key === 'beta') return personAmount('driver1') + personAmount('driver2') + personAmount('helper') + personAmount('conductor')
    if (key === 'salary') return personAmount('optDriver1') + personAmount('optDriver2') + personAmount('optHelper')
    return num(form.parking_amt) // parking
  }

  // Legacy parity with onDebitLedgerChange/onCreditLedgerChange + addroe/addroe1:
  // a ledger may not sit on both sides, nor twice on one side, and the auto-added
  // expense ledgers are rejected outright on the Credit side. The Angular screen
  // blocks all three at selection time rather than only at submit, so the same
  // checks run here on pick — validate() still repeats them as a backstop.
  // Picking by hand also drops the row's tag: an overridden row is the user's,
  // so the amount re-price below leaves it alone from then on.
  const pickLedger = (side: 'debit' | 'credit', index: number, ledgerId: string) => {
    const setRows = side === 'debit' ? setDebitRows : setCreditRows
    const chosen = findLedger(ledgerId)
    if (!chosen) { setRows((rs) => rs.map((r, i) => (i === index ? { ...r, ledger: null } : r))); return }
    const name = String(chosen.temple_name ?? '')
    const otherSide = side === 'debit' ? creditRows : debitRows
    const thisSide = side === 'debit' ? debitRows : creditRows
    if (otherSide.some((r) => r.ledger && String(r.ledger.ledger_id) === ledgerId)) {
      toast.error(`"${name}" is already used in ${side === 'debit' ? 'Credit' : 'Debit'} Accounts — the same ledger can't be on both sides`)
      return
    }
    if (thisSide.some((r, i) => i !== index && r.ledger && String(r.ledger.ledger_id) === ledgerId)) {
      toast.error(`"${name}" is already added in ${side === 'debit' ? 'Debit' : 'Credit'} Accounts`)
      return
    }
    if (side === 'credit' && EXPENSE_KEYS.some((k) => { const el = findExpenseLedger(k); return !!el && String(el.ledger_id) === ledgerId })) {
      toast.error(`"${name}" is a trip expense ledger — it belongs on the Debit side`)
      return
    }
    setRows((rs) => rs.map((r, i) => (i === index
      ? (side === 'debit' ? { ledger: toLedgerObj(chosen), amount: r.amount } : { ...r, ledger: toLedgerObj(chosen) })
      : r)))
  }

  // The Debit side is derived, not picked: one row per category that has an
  // amount, always adding up to the same total the Credit side does — so a
  // filed trip balances on its own. Rows the user added by hand (no tag) are
  // kept as typed and appended after the derived ones.
  const buildExpenseRows = (rows: LedgerRow[], opts: { amounts?: Record<ExpenseKey, number>; silent?: boolean } = {}): LedgerRow[] => {
    const manual = rows.filter((r) => !r.personKey && (r.ledger || r.amount))
    const derived: LedgerRow[] = []
    const missing: string[] = []
    EXPENSE_KEYS.forEach((key) => {
      const amount = opts.amounts ? opts.amounts[key] : expenseAmount(key)
      if (amount <= 0) return
      const ledger = findExpenseLedger(key)
      if (!ledger) { missing.push(EXPENSE_LEDGERS[key].name); return }
      derived.push({ ledger: toLedgerObj(ledger), amount: String(amount), personKey: key })
    })
    if (missing.length && !opts.silent) {
      toast.error(`Ledger not found: ${missing.join(', ')} — pick a debit ledger by hand for that amount`)
    }
    const next = [...derived, ...manual]
    return next.length ? next : [emptyLedgerRow()]
  }

  // Paid To's own ledger — resolved by type since they can be a driver,
  // helper, or staff member (conductor is just a staff designation).
  const paidToLedgerId = (): string => {
    if (!form.paid_to_id) return ''
    const list = form.paid_to_type === 'driver' ? drivers : form.paid_to_type === 'helper' ? helpers : activeStaff
    const rec = list.find((r: any) => String(r.id) === String(form.paid_to_id))
    return rec?.ledger_id ? String(rec.ledger_id) : ''
  }

  // Same ledger can legitimately end up wanting two rows (a checked person
  // who is ALSO the Paid To recipient — their own share plus the leftover
  // remainder both resolve to their ledger). Submit validation rejects the
  // same ledger appearing twice on one side, so merge those into one row —
  // keeping whichever tag is a specific person over the generic 'paidTo',
  // so isPersonChecked keeps recognizing it as that person's own line.
  const mergeSameLedgerRows = (rows: LedgerRow[]): LedgerRow[] => {
    const merged: LedgerRow[] = []
    for (const r of rows) {
      const existing = r.ledger ? merged.find((m) => m.ledger && String(m.ledger.ledger_id) === String(r.ledger!.ledger_id)) : undefined
      if (existing) {
        existing.amount = String(num(existing.amount) + num(r.amount))
        if (existing.personKey === 'paidTo' && r.personKey && r.personKey !== 'paidTo') existing.personKey = r.personKey
      } else {
        merged.push({ ...r })
      }
    }
    return merged
  }

  // Whoever isn't individually checked has their share fall through to Paid
  // To instead — every rupee always lands somewhere. Recomputed after every
  // checkbox toggle from live `form` amounts, then that row is independently
  // editable like any other row until the next toggle touches it again.
  // `optedOut` is passed explicitly rather than read from state because the
  // toggle below flips it and recomputes in the same tick, when the closure
  // would still be holding the previous value.
  const recomputePaidToRow = (rows: LedgerRow[], silent = false, optedOut = paidToOptedOut): LedgerRow[] => {
    const checkedKeys = PERSON_KEYS.filter((k) => rows.some((r) => r.personKey === k))
    // Parking has no person/checkbox of its own — it always rides along with
    // whatever remainder falls to Paid To.
    const remainder = PERSON_KEYS.filter((k) => !checkedKeys.includes(k)).reduce((sum, k) => sum + personAmount(k), 0) + num(form.parking_amt)
    const withoutPaidTo = rows.filter((r) => r.personKey !== 'paidTo')
    // Opted out: the remainder is the user's to place by hand, so don't keep
    // re-adding the Paid To row underneath them. Submit validation still blocks
    // an unbalanced entry, so nothing can slip through half-assigned.
    if (optedOut) return withoutPaidTo.length ? withoutPaidTo : [emptyLedgerRow()]
    if (remainder <= 0) return withoutPaidTo.length ? withoutPaidTo : [emptyLedgerRow()]
    const ledgerId = paidToLedgerId()
    const ledger = ledgerId ? findLedger(ledgerId) : null
    if (!ledger) {
      // `silent` for the keystroke-driven re-sync below — only a deliberate
      // checkbox toggle should be able to raise this toast.
      if (!silent) toast.error(`No ledger found for ${form.paid_to_name || 'Paid To'} — the unchecked amount (₹${remainder}) wasn't added automatically`)
      return withoutPaidTo.length ? withoutPaidTo : [emptyLedgerRow()]
    }
    // Drop the blank placeholder left behind while Paid To was off, so re-ticking
    // doesn't leave an empty "Select Ledger" row sitting beside the restored one.
    const kept = withoutPaidTo.filter((r) => r.ledger || r.amount)
    return mergeSameLedgerRows([...kept, { ledger: toLedgerObj(ledger), amount: String(remainder), personKey: 'paidTo' }])
  }

  const togglePerson = (key: PersonKey) => {
    const ledgerId = personLedgerId(key)
    if (isPersonChecked(key)) {
      setCreditRows((rows) => {
        const filtered = rows.filter((r) => !(r.personKey === key || (r.personKey !== 'paidTo' && ledgerId && r.ledger && String(r.ledger.ledger_id) === ledgerId)))
        return recomputePaidToRow(filtered.length ? filtered : [])
      })
      return
    }
    if (!ledgerId) { toast.error(`No ledger found for ${personName(key)} — they may not have an auto-created ledger yet`); return }
    const ledger = findLedger(ledgerId)
    if (!ledger) { toast.error(`No ledger found for ${personName(key)} — they may not have an auto-created ledger yet`); return }
    setCreditRows((rows) => {
      const cleaned = rows.filter((r) => (r.ledger || r.amount) && r.personKey !== 'paidTo')
      return recomputePaidToRow([...cleaned, { ledger: toLedgerObj(ledger), amount: String(personAmount(key)), personKey: key }])
    })
  }

  // Editing a Beta/Salary/Parking box re-prices every ledger row that belongs to
  // a person, then re-derives the Paid To remainder from the new numbers — so the
  // ledgers always agree with the amounts shown above them. Rows the user typed
  // themselves (no personKey tag) are left exactly as entered.
  //
  // `lastAmountSig` makes this fire on real edits only: the first pass after a
  // modal finishes loading just records the amounts it opened with. Without that,
  // reopening a filed expense would immediately overwrite a hand-adjusted ledger
  // amount with the per-person rate before the user touched anything.
  const amountSig = [
    form.driveronesalary, form.drivertwosalary, form.helpersalary, form.conductorsalary,
    form.driveronesudsalary, form.drivertwosudsalary, form.helpersudsalary, form.parking_amt,
  ].join('|')
  const lastAmountSig = useRef<string | null>(null)
  useEffect(() => {
    if (!modal.mode || loadingModal) { lastAmountSig.current = null; return }
    if (lastAmountSig.current === null || lastAmountSig.current === amountSig) { lastAmountSig.current = amountSig; return }
    lastAmountSig.current = amountSig
    setCreditRows((rows) => {
      if (!rows.some((r) => r.personKey)) return rows
      const priced = rows.map((r) => (r.personKey && r.personKey !== 'paidTo' ? { ...r, amount: String(personAmount(r.personKey as PersonKey)) } : r))
      return recomputePaidToRow(priced, true)
    })
    setDebitRows((rows) => (rows.some((r) => r.personKey) ? buildExpenseRows(rows, { silent: true }) : rows))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amountSig, modal.mode, loadingModal])

  // Repoint the derived Paid To row when the Paid To person is changed here.
  // Same first-pass guard as above: the value the modal opens with is recorded,
  // not acted on, so loading an already-filed expense doesn't rewrite its rows.
  const paidToSig = form.paid_to_id + '_' + form.paid_to_type
  const lastPaidToSig = useRef<string | null>(null)
  useEffect(() => {
    if (!modal.mode || loadingModal) { lastPaidToSig.current = null; return }
    if (lastPaidToSig.current === null || lastPaidToSig.current === paidToSig) { lastPaidToSig.current = paidToSig; return }
    lastPaidToSig.current = paidToSig
    setCreditRows((rows) => recomputePaidToRow(rows, true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paidToSig, modal.mode, loadingModal])
  // Read-only View modal: was this person's own ledger among the saved rows?
  // (expensive_details.ledger_id, selected straight through by `SELECT *`.)
  // Credit is where person rows land now; debit is still searched as a fallback
  // so expenses filed before that switch keep showing their ticks correctly.
  const viewPersonRow = (key: PersonKey, id: string): any | undefined => {
    const ledgerId = viewModal.ledgerIds[key] || ledgerIdForPerson(key, id)
    if (!ledgerId) return undefined
    return viewModal.credit.find((r: any) => String(r.ledger_id ?? '') === ledgerId)
      ?? viewModal.debit.find((r: any) => String(r.ledger_id ?? '') === ledgerId)
  }
  const viewPersonPaid = (key: PersonKey, id: string): boolean => !!viewPersonRow(key, id)
  const viewPersonAmount = (key: PersonKey, id: string): number => num(viewPersonRow(key, id)?.amount)

  // ── Modal open/close ─────────────────────────────────────────────────────
  const closeModal = () => { setModal({ mode: null, row: null }); setForm(emptyForm()); setDebitRows([emptyLedgerRow()]); setCreditRows([emptyLedgerRow()]); setResolvedLedgerIds({}); setPaidToOptedOut(false) }

  const openAdd = async (row: any) => {
    setModal({ mode: 'add', row })
    setLoadingModal(true)
    await ensureLedgers()
    setDebitRows([emptyLedgerRow()])
    setCreditRows([emptyLedgerRow()])
    setResolvedLedgerIds({})
    setPaidToOptedOut(false)
    setForm({
      ...emptyForm(),
      id: String(row.id ?? ''), trip_creation_id: String(row.trip_creation_id ?? row.id ?? ''),
      trip_date: String(row.trip_date ?? '').split('T')[0], trip_for: row.trip_for ?? '', trip_for_id: String(row.trip_for_id ?? ''),
      bus_no: row.bus_no ?? '', service_no: row.service_no ?? '', service_no_id: String(row.service_no_id ?? ''),
      driver1_name: row.driver1_name ?? '', driver1_id: String(row.driver1_id ?? ''),
      driver2_name: row.driver2_name ?? '', driver2_id: String(row.driver2_id ?? ''),
      helper_name: row.helper_name ?? '', helper_id: String(row.helper_id ?? ''),
      conductor_name: row.conductor_name ?? '', conductor_id: String(row.conductor_id ?? ''),
      opt_driver1_name: row.opt_driver1_name ?? '', opt_driver1_id: String(row.opt_driver1_id ?? ''),
      opt_driver2_name: row.opt_driver2_name ?? '', opt_driver2_id: String(row.opt_driver2_id ?? ''),
      opt_helper_name: row.opt_helper_name ?? '', opt_helper_id: String(row.opt_helper_id ?? ''),
      paid_to_name: row.paid_to_name ?? '', paid_to_id: String(row.paid_to_id ?? ''), paid_to_type: row.paid_to_type ?? '',
      driveronebeta: row.optreg ?? '', drivertwobeta: row.optreg1 ?? '', helperbeta: row.optreg2 ?? '',
      remarks: row.remarks ?? '',
    })
    setOrigMeta({ c_number: row.c_number ?? '', c_id: String(row.c_id ?? ''), date: nowStr(), user_id: localStorage.getItem('user_id') ?? '', usr_nm: localStorage.getItem('usr_nm') ?? '' })

    const res = await tripsService.getBeta({ serviceNo: row.service_no })
    const rate = res?.data?.[0]
    if (rate) {
      setForm((f) => ({
        ...f,
        driveronesalary: String(rate.driverOneBeta ?? ''),
        drivertwosalary: String(rate.driverTwoBeta ?? ''),
        helpersalary: String(rate.helperBeta ?? ''),
        conductorsalary: String(rate.conductorBeta ?? ''),
        // Opting-rate amounts always come along from the route now — whether
        // they actually count toward a total is gated on an opt person being
        // assigned (see personAmount), not on this being fetched.
        driveronesudsalary: String(rate.optDriver ?? ''),
        drivertwosudsalary: String(rate.optDriver ?? ''),
        helpersudsalary: String(rate.optHelper ?? ''),
        parking_amt: String(rate.parkingAmount ?? ''),
      }))

      const driver1Amt = num(rate.driverOneBeta)
      const driver2Amt = num(rate.driverTwoBeta)
      const helperAmt = num(rate.helperBeta)
      const conductorAmt = num(rate.conductorBeta)
      // Same "vacant seat" rule as isOptingRole — an opting hand only bills when
      // the role's own slot is empty, so a legacy row carrying an opt_* person
      // beside a real driver doesn't seed a phantom opting salary.
      const optDriver1Amt = optingActive(row.driver1_id, row.opt_driver1_id) ? num(rate.optDriver) : 0
      const optDriver2Amt = optingActive(row.driver2_id, row.opt_driver2_id) ? num(rate.optDriver) : 0
      const optHelperAmt = optingActive(row.helper_id, row.opt_helper_id) ? num(rate.optHelper) : 0
      const parkingAmt = num(rate.parkingAmount)
      const total = driver1Amt + driver2Amt + helperAmt + conductorAmt + optDriver1Amt + optDriver2Amt + optHelperAmt + parkingAmt
      const amountFor: Record<PersonKey, number> = {
        driver1: driver1Amt, driver2: driver2Amt, helper: helperAmt, conductor: conductorAmt,
        optDriver1: optDriver1Amt, optDriver2: optDriver2Amt, optHelper: optHelperAmt,
      }

      // "Pay directly" ticks carried over from the Trip Creation grid
      // (trip_created.driverX_paid_direct): those people's share starts out on
      // their own ledger — so their checkbox opens already ticked — instead of
      // falling through to Paid To. Everything not ticked (the opting people and
      // parking always included, since the creation grid has no toggle for them)
      // makes up the Paid To remainder, exactly as recomputePaidToRow would.
      // All of it lands on the Credit side — the Debit side is the expense
      // ledger, which the user picks.
      const PRE_TICKED: [PersonKey, string, string, string][] = [
        ['driver1', 'driver1_paid_direct', 'driver1_id', 'driver1_name'],
        ['driver2', 'driver2_paid_direct', 'driver2_id', 'driver2_name'],
        ['helper', 'helper_paid_direct', 'helper_id', 'helper_name'],
        ['conductor', 'conductor_paid_direct', 'conductor_id', 'conductor_name'],
      ]
      const personRows: LedgerRow[] = []
      const unresolved: string[] = []
      let claimed = 0
      PRE_TICKED.forEach(([key, flagCol, idCol, nameCol]) => {
        if (Number(row[flagCol] ?? 0) !== 1) return
        const personIdValue = String(row[idCol] ?? '')
        const amount = amountFor[key]
        if (!personIdValue || amount <= 0) return
        const ledgerId = ledgerIdForPerson(key, personIdValue)
        const ledger = ledgerId ? findLedger(ledgerId) : null
        if (!ledger) { unresolved.push(String(row[nameCol] ?? key)); return }
        personRows.push({ ledger: toLedgerObj(ledger), amount: String(amount), personKey: key })
        claimed += amount
      })

      const remainder = total - claimed
      const paidToList = row.paid_to_type === 'driver' ? drivers : row.paid_to_type === 'helper' ? helpers : activeStaff
      const paidToRec = paidToList.find((r: any) => String(r.id) === String(row.paid_to_id))
      const paidToLedger = paidToRec?.ledger_id ? findLedger(String(paidToRec.ledger_id)) : null
      const seeded: LedgerRow[] = [...personRows]
      if (remainder > 0 && paidToLedger) {
        seeded.push({ ledger: toLedgerObj(paidToLedger), amount: String(remainder), personKey: 'paidTo' })
      }
      if (seeded.length) setCreditRows(mergeSameLedgerRows(seeded))
      setDebitRows(buildExpenseRows([], {
        amounts: {
          beta: driver1Amt + driver2Amt + helperAmt + conductorAmt,
          salary: optDriver1Amt + optDriver2Amt + optHelperAmt,
          parking: parkingAmt,
        },
      }))
      if (unresolved.length) {
        toast.error(`No ledger found for ${unresolved.join(', ')} — their share stayed with Paid To`)
      }
    }
    setLoadingModal(false)
  }

  const openEdit = async (row: any) => {
    await ensureLedgers()
    setModal({ mode: 'edit', row })
    setLoadingModal(true)
    setForm({ ...emptyForm(), id: String(row.id ?? '') })
    setDebitRows([emptyLedgerRow()])
    setCreditRows([emptyLedgerRow()])
    setResolvedLedgerIds({})
    setPaidToOptedOut(false)

    const res = await tripsService.getTripModalData({ serviceNo: row.c_number, sudId: 3 })
    const ledgerRows: any[] = res?.data?.[0] ?? []
    const tripRows: any[] = res?.data?.[1] ?? []
    const t = tripRows[0]

    if (t) {
      setForm((f) => ({
        ...f,
        trip_creation_id: String(t.trip_creation_id ?? row.trip_creation_id ?? ''),
        trip_date: String(t.trip_date ?? '').split('T')[0], trip_for: t.trip_for ?? '',
        trip_for_id: String(t.trip_for_id ?? ''), service_no_id: String(t.service_no_id ?? ''),
        bus_no: t.bus_no ?? '', service_no: t.service_no ?? '',
        driver1_name: t.driver1_name ?? '', driver1_id: String(t.driver1_id ?? ''),
        driver2_name: t.driver2_name ?? '', driver2_id: String(t.driver2_id ?? ''),
        helper_name: t.helper_name ?? '', helper_id: String(t.helper_id ?? ''),
        conductor_name: t.conductor_name ?? '', conductor_id: String(t.conductor_id ?? ''),
        opt_driver1_name: t.opt_driver1_name ?? '', opt_driver1_id: String(t.opt_driver1_id ?? ''),
        opt_driver2_name: t.opt_driver2_name ?? '', opt_driver2_id: String(t.opt_driver2_id ?? ''),
        opt_helper_name: t.opt_helper_name ?? '', opt_helper_id: String(t.opt_helper_id ?? ''),
        paid_to_name: t.paid_to_name ?? '', paid_to_id: String(t.paid_to_id ?? ''), paid_to_type: t.paid_to_type ?? '',
        driveronebeta: t.driveronebeta ?? '', driveronesudsalary: t.driveronesalary ?? '', driveronesalary: String(t.driver1Beta ?? ''),
        drivertwobeta: t.drivertwobeta ?? '', drivertwosudsalary: t.drivertwosalary ?? '', drivertwosalary: String(t.driver2Beta ?? ''),
        helperbeta: t.helperbeta ?? '', helpersudsalary: t.helpersalary ?? '', helpersalary: String(t.helpersudBeta ?? ''),
        conductorsalary: String(t.ConductorsudBeta ?? ''),
        parking_amt: String(t.parking_amt ?? ''),
        remarks: t.remarks ?? '',
      }))
      setOrigMeta({
        c_number: t.c_number ?? row.c_number ?? '', c_id: String(t.c_id ?? row.c_id ?? ''),
        date: t.date ?? nowStr(), user_id: String(t.user_id ?? ''), usr_nm: t.usr_nm ?? '',
      })
      // Resolved straight off this expense's own row (LEFT JOINed with no
      // d_in filter server-side), so a since-terminated driver/helper/
      // conductor's checkbox still matches their saved ledger row correctly.
      setResolvedLedgerIds({
        driver1: t.driver1_ledger_id ? String(t.driver1_ledger_id) : undefined,
        driver2: t.driver2_ledger_id ? String(t.driver2_ledger_id) : undefined,
        helper: t.helper_ledger_id ? String(t.helper_ledger_id) : undefined,
        conductor: t.conductor_ledger_id ? String(t.conductor_ledger_id) : undefined,
      })
    }

    // Saved rows carry no personKey, so re-derive each one by matching its
    // ledger back to this trip's people. Without the tags recomputePaidToRow
    // would treat every crew member as unpaid and pile their whole share onto
    // Paid To again on the next toggle, and the live re-price above would have
    // nothing to update.
    const savedLedgerIds: Partial<Record<PersonKey, string>> = t ? {
      driver1: t.driver1_ledger_id ? String(t.driver1_ledger_id) : ledgerIdForPerson('driver1', String(t.driver1_id ?? '')),
      driver2: t.driver2_ledger_id ? String(t.driver2_ledger_id) : ledgerIdForPerson('driver2', String(t.driver2_id ?? '')),
      helper: t.helper_ledger_id ? String(t.helper_ledger_id) : ledgerIdForPerson('helper', String(t.helper_id ?? '')),
      conductor: t.conductor_ledger_id ? String(t.conductor_ledger_id) : ledgerIdForPerson('conductor', String(t.conductor_id ?? '')),
      optDriver1: ledgerIdForPerson('optDriver1', String(t.opt_driver1_id ?? '')),
      optDriver2: ledgerIdForPerson('optDriver2', String(t.opt_driver2_id ?? '')),
      optHelper: ledgerIdForPerson('optHelper', String(t.opt_helper_id ?? '')),
    } : {}
    const savedPaidToLedgerId = (() => {
      if (!t?.paid_to_id) return ''
      const list = t.paid_to_type === 'driver' ? drivers : t.paid_to_type === 'helper' ? helpers : activeStaff
      const rec = list.find((r: any) => String(r.id) === String(t.paid_to_id))
      return rec?.ledger_id ? String(rec.ledger_id) : ''
    })()
    // A person who is also the Paid To shares one ledger — tag it as the person
    // (same preference mergeSameLedgerRows applies) so their checkbox still works.
    const tagFor = (ledgerId: string): RowTag | undefined =>
      PERSON_KEYS.find((k) => savedLedgerIds[k] && savedLedgerIds[k] === ledgerId)
      ?? (savedPaidToLedgerId && savedPaidToLedgerId === ledgerId ? 'paidTo' : undefined)

    // Same reason the credit rows get tagged: without a tag a saved expense row
    // is indistinguishable from one the user typed, so editing an amount later
    // would leave it stale.
    const expenseTagFor = (ledgerId: string): ExpenseKey | undefined =>
      EXPENSE_KEYS.find((k) => { const l = findExpenseLedger(k); return !!l && String(l.ledger_id) === ledgerId })

    const debit = ledgerRows.filter((r) => r.amount_type === 'Debit Account').map((r) => ({
      ledger: toLedgerObj(r), amount: String(r.amount ?? ''), personKey: expenseTagFor(String(r.ledger_id ?? '')),
    }))
    const credit = ledgerRows.filter((r) => r.amount_type === 'Credit Account').map((r) => ({
      ledger: toLedgerObj(r), amount: String(r.amount ?? ''), personKey: tagFor(String(r.ledger_id ?? '')),
    }))
    setDebitRows(debit.length ? debit : [emptyLedgerRow()])
    setCreditRows(credit.length ? credit : [emptyLedgerRow()])
    setLoadingModal(false)
  }

  const openView = async (row: any) => {
    setViewModal({ open: true, row, debit: [], credit: [], loading: true, ledgerIds: {} })
    const res = await tripsService.getTripModalData({ serviceNo: row.c_number, sudId: 3 })
    const rows: any[] = res?.data?.[0] ?? []
    const t = res?.data?.[1]?.[0]
    setViewModal({
      open: true, row,
      debit: rows.filter((r) => r.amount_type === 'Debit Account'),
      credit: rows.filter((r) => r.amount_type === 'Credit Account'),
      loading: false,
      // Same terminated-safe resolution as openEdit — driverX_ledger_id comes
      // straight off this expense's own row (LEFT JOINed with no d_in filter),
      // so a since-terminated person's "Paid" tick still matches correctly.
      ledgerIds: t ? {
        driver1: t.driver1_ledger_id ? String(t.driver1_ledger_id) : undefined,
        driver2: t.driver2_ledger_id ? String(t.driver2_ledger_id) : undefined,
        helper: t.helper_ledger_id ? String(t.helper_ledger_id) : undefined,
        conductor: t.conductor_ledger_id ? String(t.conductor_ledger_id) : undefined,
      } : {},
    })
  }

  // The Paid To line is derived, not chosen: whatever crew isn't individually
  // ticked — plus parking, which has no payee of its own — lands on the Paid To
  // person's ledger. So its checkbox mirrors that state instead of toggling it.
  // Tick every crew member and there is no remainder left, so it goes disabled,
  // exactly the way the Paid To picker does on the Trip Creation grid.
  const paidToRowAmount = num(creditRows.find((r) => r.personKey === 'paidTo')?.amount)
  const paidToActive = paidToRowAmount > 0
  // Unticking hands the leftover back to the user to place manually; reticking
  // re-derives it. Mirrors how each crew checkbox adds/removes its own row.
  const togglePaidTo = () => {
    const nextOptedOut = !paidToOptedOut
    setPaidToOptedOut(nextOptedOut)
    setCreditRows((rows) => recomputePaidToRow(rows, true, nextOptedOut))
  }

  // ── Totals ───────────────────────────────────────────────────────────────
  // Salary = opting top-ups (only counted when that role's opt slot actually
  // has someone assigned). Beta = the 4 regular per-trip amounts + parking.
  const totalSalary = personAmount('optDriver1') + personAmount('optDriver2') + personAmount('optHelper')
  const totalBeta = personAmount('driver1') + personAmount('driver2') + personAmount('helper') + personAmount('conductor') + num(form.parking_amt)
  const validDebit = debitRows.filter((r) => r.ledger && num(r.amount) > 0)
  const validCredit = creditRows.filter((r) => r.ledger && num(r.amount) > 0)
  const debitTotal = validDebit.reduce((s, r) => s + num(r.amount), 0)
  const creditTotal = validCredit.reduce((s, r) => s + num(r.amount), 0)
  const balanced = debitTotal > 0 && Math.round(debitTotal * 100) === Math.round(creditTotal * 100)

  const buildExpenseDetails = () => ({
    driveronebeta: form.driveronebeta, driveronesalary: form.driveronesalary, driveronesudsalary: form.driveronesudsalary, driverone_payment: '',
    drivertwobeta: form.drivertwobeta, drivertwosalary: form.drivertwosalary, drivertwosudsalary: form.drivertwosudsalary, drivertwo_payment: '',
    helperbeta: form.helperbeta, helpersalary: form.helpersalary, helpersudsalary: form.helpersudsalary, helper_payment: '',
    conductorsalary: form.conductorsalary,
    grandtotal: debitTotal, bus_no: form.bus_no, service_no: form.service_no,
    driver1_name: form.driver1_name, driver2_name: form.driver2_name, helper_name: form.helper_name,
    user_id: localStorage.getItem('user_id'), named: localStorage.getItem('usr_nm'),
    id: form.id,
    driveronebeta_payment: '', drivertwobeta_payment: '', helperbeta_payment: '',
    trip_date: form.trip_date, trip_for: form.trip_for,
    paid_to_name: form.paid_to_name, paid_to_id: form.paid_to_id, paid_to_type: form.paid_to_type,
    trip_creation_id: form.trip_creation_id,
    driver1_id: form.driver1_id, driver2_id: form.driver2_id, conductor_id: form.conductor_id, helper_id: form.helper_id,
    conductor_name: form.conductor_name,
    opt_driver1_id: form.opt_driver1_id, opt_driver1_name: form.opt_driver1_name,
    opt_driver2_id: form.opt_driver2_id, opt_driver2_name: form.opt_driver2_name,
    opt_helper_id: form.opt_helper_id, opt_helper_name: form.opt_helper_name,
    parking_amt: form.parking_amt,
    remarks: form.remarks,
  })

  const buildAddPayload = () => ({
    c_number: origMeta.c_number, c_id: origMeta.c_id,
    expensedetails: buildExpenseDetails(),
    patientsTstdts: validDebit.map((r) => ({ d_test_name: r.ledger, d_test_amount: num(r.amount), account_name: 'Debit Account' })),
    credit: validCredit.map((r) => ({ credit_name: r.ledger, credit_amount: num(r.amount), account_name: 'Credit Account' })),
    total_salary: totalSalary, total_beta: totalBeta, total_salary_beta: totalSalary + totalBeta, total_amount: totalSalary + totalBeta + debitTotal,
    trip_for_id: form.trip_for_id, service_no_id: form.service_no_id, remarks: form.remarks,
  })

  const buildEditPayload = () => ({
    expensedetails: buildExpenseDetails(),
    patientsTstdts: validDebit.map((r) => ({ d_test_name: r.ledger, d_test_amount: num(r.amount), account_name: 'Debit Account' })),
    credit: validCredit.map((r) => ({ credit_name: r.ledger, credit_amount: num(r.amount), account_name: 'Credit Account' })),
    total_salary: totalSalary, total_beta: totalBeta, total_salary_beta: totalSalary + totalBeta, total_amount: totalSalary + totalBeta + debitTotal,
    service_no_id: form.service_no_id, trip_for_id: form.trip_for_id, remarks: form.remarks,
    paid_to_id: form.paid_to_id, paid_to_name: form.paid_to_name, paid_to_type: form.paid_to_type,
    trip_creation_id: form.trip_creation_id,
    driver1_id: form.driver1_id, driver2_id: form.driver2_id, helper_id: form.helper_id, conductor_id: form.conductor_id,
    c_number: origMeta.c_number, date: origMeta.date, user_id: origMeta.user_id, usr_nm: origMeta.usr_nm, c_id: origMeta.c_id,
    updatedby_id: localStorage.getItem('user_id'), updatedby_nm: localStorage.getItem('usr_nm'), updatedby_date: nowStr(),
  })

  // Cascades bus/driver/helper/conductor edits back to the actual trip_created
  // row (and, server-side, into tripexpenses_data + expensive_details if an
  // expense was already filed) — same /tripcreated endpoint Trip Creation
  // would use, just with type: 'edit' instead of 'add'.
  const buildUpdateTripPayload = () => ({
    id: form.trip_creation_id, c_number: origMeta.c_number,
    bus_no: form.bus_no, service_no: form.service_no, service_no_id: form.service_no_id,
    optreg: form.driveronebeta, driver1_name: form.driver1_name, driver1_id: form.driver1_id,
    optreg1: form.drivertwobeta, driver2_name: form.driver2_name, driver2_id: form.driver2_id,
    optreg2: form.helperbeta, helper_name: form.helper_name, helper_id: form.helper_id,
    conductor_name: form.conductor_name, conductor_id: form.conductor_id,
    trip_date: form.trip_date, trip_for: form.trip_for, trip_for_id: form.trip_for_id,
    paid_to_type: form.paid_to_type, paid_to_name: form.paid_to_name, paid_to_id: form.paid_to_id,
    remarks: form.remarks,
    updatedby_id: localStorage.getItem('user_id'), updatedby_name: localStorage.getItem('usr_nm'), updated_date: nowStr(),
  })

  const validate = () => {
    if (!form.bus_no) { toast.error('Bus Number is required'); return false }
    if (!form.driveronesalary || !form.drivertwosalary || !form.helpersalary || !form.conductorsalary) {
      toast.error('Please fill all beta amount fields'); return false
    }
    if (validDebit.length === 0) { toast.error('Add at least one debit ledger entry'); return false }
    if (validCredit.length === 0) { toast.error('Add at least one credit ledger entry'); return false }
    const debitIds = validDebit.map((r) => String(r.ledger!.ledger_id))
    const creditIds = validCredit.map((r) => String(r.ledger!.ledger_id))
    if (new Set(debitIds).size !== debitIds.length) { toast.error('Duplicate ledger in Debit entries'); return false }
    if (new Set(creditIds).size !== creditIds.length) { toast.error('Duplicate ledger in Credit entries'); return false }
    if (debitIds.some((id) => creditIds.includes(id))) { toast.error('Same ledger cannot be used in both Debit and Credit'); return false }
    if (!balanced) { toast.error(`Debit (₹${debitTotal}) and Credit (₹${creditTotal}) totals must match`); return false }
    return true
  }

  const { mutate: submitAdd, isPending: submittingAdd } = useMutation({
    mutationFn: () => tripsService.addExpenses(buildAddPayload()),
    onSuccess: (res) => { if (res?.status === 200) { toast.success('Expense filed successfully'); closeModal(); refetch() } else toast.error('Failed to save expense') },
    onError: () => toast.error('Server error'),
  })
  const { mutate: submitEdit, isPending: submittingEdit } = useMutation({
    mutationFn: () => tripsService.updateExpenses(buildEditPayload()),
    onSuccess: (res) => { if (res?.status === 200) { toast.success('Expense updated'); closeModal(); refetch() } else toast.error('Failed to update expense') },
    onError: () => toast.error('Server error'),
  })
  const { mutate: updateTripMutate, isPending: updatingTrip } = useMutation({
    mutationFn: () => tripsService.updateTrip(buildUpdateTripPayload()),
    onSuccess: (res) => {
      if (res?.status !== 200) { toast.error('Failed to update trip details'); return }
      modal.mode === 'add' ? submitAdd() : submitEdit()
    },
    onError: () => toast.error('Server error updating trip'),
  })
  const submitting = submittingAdd || submittingEdit || updatingTrip
  const handleSubmit = () => { if (!validate()) return; updateTripMutate() }

  const { mutate: removeExpense } = useMutation({
    mutationFn: (row: any) => tripsService.deleteExpense({
      c_number: row.c_number,
      delete_by_id: localStorage.getItem('user_id'),
      delete_by_name: localStorage.getItem('usr_nm'),
      delete_by_date: nowStr(),
    }),
    onSuccess: (res) => { if (res?.status === 200) { toast.success('Expense deleted'); refetch() } else toast.error('Failed to delete') },
    onError: () => toast.error('Server error'),
  })

  const { mutate: createLedger, isPending: creatingLedger } = useMutation({
    mutationFn: () => {
      const parent = ledgerParents.find((c: any) => String(c.id) === newLedgerParentId)
      if (!parent) throw new Error('Pick a parent group first')
      return accountingService.addLedgerData({
        temple_name: newLedgerName.trim(), amount: 0, parent_level: 4,
        parent_subgroup_id: parent.village_id, parent_subchild_id: parent.id,
        district_id: parent.district_id, staticname: parent.staticentry,
        mandal_id: parent.mandal_id, mandal_name: parent.mandal_name,
        village_id: parent.village_id, child: parent.child,
        subchildtwo: parent.temple_name,
        user_id: localStorage.getItem('user_id'), entry_by: localStorage.getItem('usr_nm'),
      })
    },
    onSuccess: async (res: any) => {
      if (res?.status !== 200) { toast.error(res?.message ?? 'Failed to create ledger'); return }
      toast.success('Ledger created')
      const target = newLedgerFor
      const createdName = newLedgerName.trim()
      const reloaded = await reloadLedgers()
      const created = (reloaded.data?.data ?? []).find((l: any) => l.temple_name === createdName)
      if (target && created) {
        const setter = target.side === 'debit' ? setDebitRows : setCreditRows
        setter((rows) => rows.map((r, idx) => idx === target.index ? { ...r, ledger: toLedgerObj(created) } : r))
      }
      setNewLedgerFor(null); setNewLedgerName(''); setNewLedgerParentId('')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: setAdminStatus, isPending: settingStatus } = useMutation({
    mutationFn: (vars: { row: any; value: string }) => tripsService.updateTripAdminStatus({
      vouchervalue: vars.value,
      voucherdata: { c_number: vars.row.c_number, id: vars.row.id },
      user_id: localStorage.getItem('user_id'),
      user_nm: localStorage.getItem('usr_nm'),
      updated_date: nowStr(),
    }),
    onSuccess: (res) => { if (res?.status === 200) { toast.success('Approval status updated'); refetch() } else toast.error('Failed to update status') },
    onError: () => toast.error('Server error'),
  })

  // Reference No click: always opens *a* modal — View if an expense was
  // already filed, otherwise the same File-Expense modal the edit icon opens
  // for an unfiled trip. Unlike the eye-icon "view" action (which is meant
  // to error on an unfiled trip), this is the row's primary click target and
  // shouldn't dead-end with a toast.
  const handleReferenceClick = (row: any) => {
    if (row.status === 1) { openView(row); return }
    openAdd(row)
  }

  const handleAction = (action: string, row: any) => {
    if (action === 'edit') {
      if (row.status === 0) { openAdd(row); return }
      if (canActOnExpense(row)) { openEdit(row); return }
      toast.error('This expense is already approved/rejected and can no longer be edited')
      return
    }
    if (action === 'view') {
      if (row.status !== 1) { toast.error('No expense has been filed for this trip yet'); return }
      openView(row)
      return
    }
    if (action === 'delete') {
      if (!canActOnExpense(row)) { toast.error('Cannot delete — not filed yet, or already approved/rejected'); return }
      removeExpense(row)
    }
  }

  // ── Table columns ────────────────────────────────────────────────────────
  const columns: Column[] = [
    { label: 'Sl No', key: '_sl', align: 'center', render: (_v, _r, i) => i + 1 },
    { label: 'Trip Date', key: 'trip_date', render: (v) => String(v ?? '').split('T')[0] },
    {
      label: 'Reference No', key: 'c_number',
      render: (v, row: any) => (
        <button
          type="button"
          onClick={() => handleReferenceClick(row)}
          className="font-bold text-blue-600 hover:text-blue-800 hover:underline transition-colors"
        >
          {String(v ?? '—')}
        </button>
      ),
    },
    { label: 'Trip For', key: 'trip_for' },
    { label: 'Bus No', key: 'bus_no' },
    { label: 'Service No', key: 'service_no' },
    { label: 'Driver 1', key: 'driver1_name' },
    { label: 'Driver 2', key: 'driver2_name', render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
    { label: 'Helper', key: 'helper_name', render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
    {
      label: 'Amount', key: 'grantotal', align: 'right',
      render: (v) => v ? <span className="font-bold text-slate-900">₹{Number(v).toLocaleString('en-IN')}</span> : <span className="text-slate-300">—</span>,
    },
    {
      label: 'Approval', key: 'admin_status',
      render: (_v, row: any) => row.status === 1 ? (
        <select
          value={String(row.admin_status ?? 0)}
          disabled={settingStatus}
          onChange={(e) => setAdminStatus({ row, value: e.target.value })}
          className="text-xs font-bold rounded-lg border px-2 py-1.5 bg-white"
        >
          <option value="0">On Review</option>
          <option value="1">Approve</option>
          <option value="2">Reject</option>
        </select>
      ) : <Badge variant="slate">Not Filed</Badge>,
    },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Trip Expenses" subtitle="File and review per-trip driver/helper/conductor expenses" />

      {/* ── Date filter ── */}
      <GlassCard className="p-4" colorBar="bg-gradient-to-r from-red-400 to-rose-500">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label>From Date</Label>
            <Input type="date" max={today} value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36" />
          </div>
          <div>
            <Label>To Date</Label>
            <Input type="date" max={today} value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-36" />
          </div>
          <Button variant="primary" onClick={() => setApplied({ from: fromDate, to: toDate })} disabled={!fromDate || !toDate}>
            <Search className="w-4 h-4" /> Apply Filter
          </Button>
          {applied && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); setApplied(null) }}
              className="text-xs text-slate-500 hover:text-red-500 font-medium underline"
            >
              Clear
            </button>
          )}
        </div>
      </GlassCard>

      <DataTable
        title={`Trip Expenses (${trips.length})`}
        columns={columns}
        data={trips}
        loading={isLoading}
        onAction={handleAction}
        actions={['edit', 'view', 'delete']}
        icon={<Receipt className="w-5 h-5 text-red-500" />}
      />

      {/* ── Add / Edit modal ── */}
      <AnimatePresence>
        {modal.mode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-red-500" /> {modal.mode === 'add' ? 'File Trip Expense' : 'Edit Trip Expense'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{modal.row?.c_number}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setHistoryModal({ open: true, tripId: form.trip_creation_id, c_number: modal.row?.c_number ?? '' })}
                    className="text-slate-400 hover:text-amber-600 p-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                    title="Edit History"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
                </div>
              </div>

              {loadingModal ? (
                <div className="p-10 text-center text-sm text-slate-400">Loading trip data…</div>
              ) : (
                <div className="p-6 space-y-6">
                  {/* Readonly trip info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <div><Label>Trip Date</Label><Input value={form.trip_date} readOnly disabled /></div>
                    <div><Label>Trip For</Label><Input value={form.trip_for} readOnly disabled /></div>
                    <div><Label>Service Number</Label><Input value={form.service_no} readOnly disabled /></div>
                    <div>
                      <Label>Bus Number</Label>
                      <Select value={form.bus_no} onChange={(e) => setForm((f) => ({ ...f, bus_no: e.target.value }))}>
                        <option value="">— Select —</option>
                        {buses.map((b: any) => <option key={b.id} value={b.bus_no}>{b.bus_no}</option>)}
                      </Select>
                    </div>
                    <div>
                      <Label>Driver1 Name</Label>
                      <Select value={form.driver1_id} onChange={(e) => {
                        const d = drivers.find((dr: any) => String(dr.id) === e.target.value)
                        setForm((f) => ({ ...f, driver1_id: e.target.value, driver1_name: d?.nickname ?? d?.driver_name ?? '' }))
                      }}>
                        <option value="">— Select —</option>
                        {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.nickname ?? d.driver_name}</option>)}
                      </Select>
                    </div>
                    <div>
                      <Label>Driver2 Name</Label>
                      <Select value={form.driver2_id} onChange={(e) => {
                        const d = drivers.find((dr: any) => String(dr.id) === e.target.value)
                        setForm((f) => ({ ...f, driver2_id: e.target.value, driver2_name: d?.nickname ?? d?.driver_name ?? '' }))
                      }}>
                        <option value="">— Select —</option>
                        {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.nickname ?? d.driver_name}</option>)}
                      </Select>
                    </div>
                    <div>
                      <Label>Helper Name</Label>
                      <Select value={form.helper_id} onChange={(e) => {
                        const h = helpers.find((x: any) => String(x.id) === e.target.value)
                        setForm((f) => ({ ...f, helper_id: e.target.value, helper_name: h?.helper_name ?? h?.nickname ?? '' }))
                      }}>
                        <option value="">— Select —</option>
                        {helpers.map((h: any) => <option key={h.id} value={h.id}>{h.helper_name ?? h.nickname}</option>)}
                      </Select>
                    </div>
                    <div>
                      <Label>Conductor Name</Label>
                      <Select value={form.conductor_id} onChange={(e) => {
                        const c = conductors.find((x: any) => String(x.id) === e.target.value)
                        setForm((f) => ({ ...f, conductor_id: e.target.value, conductor_name: c?.nickName ?? c?.fullName ?? '' }))
                      }}>
                        <option value="">— Select —</option>
                        {conductors.map((c: any) => <option key={c.id} value={c.id}>{c.nickName ?? c.fullName}</option>)}
                      </Select>
                    </div>
                    <div>
                      <Label>Paid To</Label>
                      <SearchableSelect
                        placeholder="Select" options={paidToOptions}
                        value={form.paid_to_id ? form.paid_to_id + '_' + form.paid_to_type : ''}
                        onChange={(v) => {
                          const p = paidToList.find((x: any) => x.paid_to_id + '_' + x.paid_to_type === v)
                          setForm((f) => ({
                            ...f,
                            paid_to_id: p ? String(p.paid_to_id) : '',
                            paid_to_name: p?.paid_to_name ?? '',
                            paid_to_type: p?.paid_to_type ?? '',
                          }))
                        }}
                        onClear={() => setForm((f) => ({ ...f, paid_to_id: '', paid_to_name: '', paid_to_type: '' }))} />
                      {form.paid_to_name && (
                        <div className="mt-2">
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                            <input
                              type="checkbox" checked={paidToActive} onChange={togglePaidTo}
                              title="Receives every share left unticked below — untick to place that leftover on another ledger yourself"
                              className="w-4 h-4 rounded accent-blue-600"
                            />
                            Pay {form.paid_to_name}
                          </label>
                          <p className="text-[11px] font-bold text-slate-400 pl-6">
                            {paidToActive
                              ? `₹${paidToRowAmount.toLocaleString('en-IN')}`
                              : paidToOptedOut
                                ? 'Off — assign the leftover yourself in Credit Accounts'
                                : 'Everyone ticked — nothing left over'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Salary / Beta breakdown — checking a person drops their own
                      ledger + auto-filled amount straight into Credit Accounts below. */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-100">
                    <div className="space-y-2">
                      {form.driver1_name && (
                        <div>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                            <input type="checkbox" checked={isPersonChecked('driver1')} onChange={() => togglePerson('driver1')} className="w-4 h-4 rounded accent-blue-600" />
                            Pay {form.driver1_name}
                          </label>
                          <p className="text-[11px] font-bold text-slate-400 pl-6">₹{personAmount('driver1').toLocaleString('en-IN')}</p>
                        </div>
                      )}
                      <Label>Driver1 Beta (₹) <span className="text-red-500">*</span></Label>
                      <Input type="number" value={form.driveronesalary} onChange={(e) => setForm((f) => ({ ...f, driveronesalary: e.target.value }))} />
                      {isOptingRole('driver1') && (
                        <>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none pt-1">
                            <input type="checkbox" checked={isPersonChecked('optDriver1')} onChange={() => togglePerson('optDriver1')} className="w-4 h-4 rounded accent-blue-600" />
                            Pay {form.opt_driver1_name} (Opting)
                          </label>
                          <p className="text-[11px] font-bold text-slate-400 pl-6 -mt-1">₹{personAmount('optDriver1').toLocaleString('en-IN')}</p>
                          <Label>Opting Driver1 Salary (₹)</Label>
                          <Input type="number" value={form.driveronesudsalary} onChange={(e) => setForm((f) => ({ ...f, driveronesudsalary: e.target.value }))} />
                        </>
                      )}
                    </div>
                    <div className="space-y-2">
                      {form.driver2_name && (
                        <div>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                            <input type="checkbox" checked={isPersonChecked('driver2')} onChange={() => togglePerson('driver2')} className="w-4 h-4 rounded accent-blue-600" />
                            Pay {form.driver2_name}
                          </label>
                          <p className="text-[11px] font-bold text-slate-400 pl-6">₹{personAmount('driver2').toLocaleString('en-IN')}</p>
                        </div>
                      )}
                      <Label>Driver2 Beta (₹) <span className="text-red-500">*</span></Label>
                      <Input type="number" value={form.drivertwosalary} onChange={(e) => setForm((f) => ({ ...f, drivertwosalary: e.target.value }))} />
                      {isOptingRole('driver2') && (
                        <>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none pt-1">
                            <input type="checkbox" checked={isPersonChecked('optDriver2')} onChange={() => togglePerson('optDriver2')} className="w-4 h-4 rounded accent-blue-600" />
                            Pay {form.opt_driver2_name} (Opting)
                          </label>
                          <p className="text-[11px] font-bold text-slate-400 pl-6 -mt-1">₹{personAmount('optDriver2').toLocaleString('en-IN')}</p>
                          <Label>Opting Driver2 Salary (₹)</Label>
                          <Input type="number" value={form.drivertwosudsalary} onChange={(e) => setForm((f) => ({ ...f, drivertwosudsalary: e.target.value }))} />
                        </>
                      )}
                    </div>
                    <div className="space-y-2">
                      {form.helper_name && (
                        <div>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                            <input type="checkbox" checked={isPersonChecked('helper')} onChange={() => togglePerson('helper')} className="w-4 h-4 rounded accent-blue-600" />
                            Pay {form.helper_name}
                          </label>
                          <p className="text-[11px] font-bold text-slate-400 pl-6">₹{personAmount('helper').toLocaleString('en-IN')}</p>
                        </div>
                      )}
                      <Label>Helper Beta (₹) <span className="text-red-500">*</span></Label>
                      <Input type="number" value={form.helpersalary} onChange={(e) => setForm((f) => ({ ...f, helpersalary: e.target.value }))} />
                      {isOptingRole('helper') && (
                        <>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none pt-1">
                            <input type="checkbox" checked={isPersonChecked('optHelper')} onChange={() => togglePerson('optHelper')} className="w-4 h-4 rounded accent-blue-600" />
                            Pay {form.opt_helper_name} (Opting)
                          </label>
                          <p className="text-[11px] font-bold text-slate-400 pl-6 -mt-1">₹{personAmount('optHelper').toLocaleString('en-IN')}</p>
                          <Label>Opting Helper Salary (₹)</Label>
                          <Input type="number" value={form.helpersudsalary} onChange={(e) => setForm((f) => ({ ...f, helpersudsalary: e.target.value }))} />
                        </>
                      )}
                    </div>
                    <div className="space-y-2">
                      {form.conductor_name && (
                        <div>
                          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
                            <input type="checkbox" checked={isPersonChecked('conductor')} onChange={() => togglePerson('conductor')} className="w-4 h-4 rounded accent-blue-600" />
                            Pay {form.conductor_name}
                          </label>
                          <p className="text-[11px] font-bold text-slate-400 pl-6">₹{personAmount('conductor').toLocaleString('en-IN')}</p>
                        </div>
                      )}
                      <Label>Conductor Beta (₹) <span className="text-red-500">*</span></Label>
                      <Input type="number" value={form.conductorsalary} onChange={(e) => setForm((f) => ({ ...f, conductorsalary: e.target.value }))} />
                    </div>
                    {Number(form.parking_amt) > 0 && (
                      <div className="space-y-2">
                        <Label>Parking (₹)</Label>
                        <Input type="number" value={form.parking_amt} onChange={(e) => setForm((f) => ({ ...f, parking_amt: e.target.value }))} />
                        <p className="text-[11px] text-slate-400">No individual payee — always folds into Paid To.</p>
                      </div>
                    )}
                  </div>

                  {/* Remarks */}
                  <div>
                    <Label>Remarks</Label>
                    <textarea rows={2} placeholder="Enter remarks" value={form.remarks}
                      onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
                  </div>

                  {/* Totals */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 p-3 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase">Total Salary</p>
                      <p className="text-lg font-extrabold text-slate-800">₹{totalSalary.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase">Total Beta</p>
                      <p className="text-lg font-extrabold text-slate-800">₹{totalBeta.toLocaleString('en-IN')}</p>
                    </div>
                  </div>

                  {/* Debit / Credit ledgers. Debit is shown first; the crew's own
                      ledgers auto-fill on the Credit side (see isPersonChecked). */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-blue-600">
                        <span className="text-xs font-bold text-white">Debit Accounts</span>
                        <button onClick={() => setDebitRows((r) => [...r, emptyLedgerRow()])} className="inline-flex items-center gap-1 text-xs font-bold text-blue-100 hover:text-white transition-colors">
                          <PlusCircle className="w-3.5 h-3.5" /> Add Row
                        </button>
                      </div>
                      <div className="p-3 space-y-2">
                        {debitRows.map((row, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <div className="flex-[3] min-w-0">
                              <SearchableSelect
                                value={row.ledger ? String(row.ledger.ledger_id) : ''}
                                onChange={(v) => pickLedger('debit', i, v)}
                                options={ledgerOptions} placeholder="Select Ledger" onReload={() => reloadLedgers()} reloading={loadingLedgers}
                              />
                            </div>
                            <div className="flex-[2] min-w-0">
                              <Input type="number" placeholder="Amount" value={row.amount} onChange={(e) => setDebitRows((rs) => rs.map((r, idx) => idx === i ? { ...r, amount: e.target.value } : r))} />
                            </div>
                            <button
                              onClick={() => { setNewLedgerFor({ side: 'debit', index: i }); setNewLedgerName(''); setNewLedgerParentId('') }}
                              title="Create a new ledger" className="text-slate-400 hover:text-blue-600 p-1 transition-colors"
                            >
                              <FolderPlus className="w-4 h-4" />
                            </button>
                            {debitRows.length > 1 && (
                              <button onClick={() => setDebitRows((rs) => rs.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                                <MinusCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {debitTotal > 0 && <div className="text-right text-xs font-extrabold text-blue-700 pt-1">Total: ₹{debitTotal.toLocaleString('en-IN')}</div>}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-emerald-600">
                        <span className="text-xs font-bold text-white">Credit Accounts</span>
                        <button onClick={() => setCreditRows((r) => [...r, emptyLedgerRow()])} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-100 hover:text-white transition-colors">
                          <PlusCircle className="w-3.5 h-3.5" /> Add Row
                        </button>
                      </div>
                      <div className="p-3 space-y-2">
                        {creditRows.map((row, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <div className="flex-[3] min-w-0">
                              <SearchableSelect
                                value={row.ledger ? String(row.ledger.ledger_id) : ''}
                                onChange={(v) => pickLedger('credit', i, v)}
                                options={ledgerOptions} placeholder="Select Ledger" onReload={() => reloadLedgers()} reloading={loadingLedgers}
                              />
                            </div>
                            <div className="flex-[2] min-w-0">
                              <Input type="number" placeholder="Amount" value={row.amount} onChange={(e) => setCreditRows((rs) => rs.map((r, idx) => idx === i ? { ...r, amount: e.target.value } : r))} />
                            </div>
                            <button
                              onClick={() => { setNewLedgerFor({ side: 'credit', index: i }); setNewLedgerName(''); setNewLedgerParentId('') }}
                              title="Create a new ledger" className="text-slate-400 hover:text-emerald-600 p-1 transition-colors"
                            >
                              <FolderPlus className="w-4 h-4" />
                            </button>
                            {creditRows.length > 1 && (
                              <button onClick={() => setCreditRows((rs) => rs.filter((_, idx) => idx !== i))} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                                <MinusCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                        {creditTotal > 0 && <div className="text-right text-xs font-extrabold text-emerald-700 pt-1">Total: ₹{creditTotal.toLocaleString('en-IN')}</div>}
                      </div>
                    </div>
                  </div>

                  {!balanced && (debitTotal > 0 || creditTotal > 0) && (
                    <p className="text-xs font-semibold text-amber-600 text-center">
                      Debit (₹{debitTotal.toLocaleString('en-IN')}) and Credit (₹{creditTotal.toLocaleString('en-IN')}) totals must match before submitting.
                    </p>
                  )}

                  <div className="flex justify-center gap-3 pt-2">
                    <Button variant="ghost" onClick={closeModal}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={submitting} className="px-10">
                      <Save className="w-4 h-4" /> {submitting ? 'Submitting…' : 'Submit'}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Quick "+ New Ledger" popover ── */}
      <AnimatePresence>
        {newLedgerFor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FolderPlus className="w-4 h-4 text-blue-500" /> New Ledger
                </h3>
                <button onClick={() => setNewLedgerFor(null)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <Label>Ledger Name <span className="text-red-500">*</span></Label>
                  <Input value={newLedgerName} onChange={(e) => setNewLedgerName(e.target.value)} placeholder="e.g. Toll Charges" />
                </div>
                <div>
                  <Label>Parent Group <span className="text-red-500">*</span></Label>
                  <SearchableSelect value={newLedgerParentId} onChange={setNewLedgerParentId} options={ledgerParentOptions} placeholder="Search groups…" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="ghost" onClick={() => setNewLedgerFor(null)}>Cancel</Button>
                  <Button
                    onClick={() => createLedger()}
                    disabled={creatingLedger || !newLedgerName.trim() || !newLedgerParentId}
                  >
                    <Save className="w-4 h-4" /> {creatingLedger ? 'Creating…' : 'Create & Select'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Edit History modal ── */}
      <AnimatePresence>
        {historyModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setHistoryModal((h) => ({ ...h, open: false }))}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-500" /> Edit History
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{historyModal.c_number}</p>
                </div>
                <button onClick={() => setHistoryModal((h) => ({ ...h, open: false }))} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                {loadingHistory ? (
                  <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
                ) : historyList.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No edits have been made to this trip yet.</p>
                ) : (
                  <ol className="relative border-l-2 border-slate-100 ml-2 space-y-6">
                    {historyList.map((h: any) => (
                      <li key={h.id} className="ml-4">
                        <span className="absolute -left-[7px] w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(h.changed_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} · {h.changed_by_name || 'Unknown'}
                        </div>
                        <ChangeNote note={h.changes_note ?? ''} />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── View modal ── */}
      <AnimatePresence>
        {viewModal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setViewModal((v) => ({ ...v, open: false }))}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" /> {viewModal.row?.c_number}
                </h3>
                <button onClick={() => setViewModal((v) => ({ ...v, open: false }))} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl">
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Trip Date</p><p className="text-sm font-medium">{String(viewModal.row?.trip_date ?? '').split('T')[0]}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Bus No</p><p className="text-sm font-medium">{viewModal.row?.bus_no}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Service No</p><p className="text-sm font-medium">{viewModal.row?.service_no}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Driver 1</p><p className="text-sm font-medium flex items-center gap-1.5">
                    <input type="checkbox" readOnly checked={viewPersonPaid('driver1', String(viewModal.row?.driver1_id ?? ''))} className="w-3.5 h-3.5 rounded accent-blue-600 pointer-events-none" />
                    {viewModal.row?.driver1_name || '—'}</p>
                    {viewPersonPaid('driver1', String(viewModal.row?.driver1_id ?? '')) && <p className="text-[11px] font-bold text-slate-400 pl-5">₹{viewPersonAmount('driver1', String(viewModal.row?.driver1_id ?? '')).toLocaleString('en-IN')}</p>}
                  </div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Driver 2</p><p className="text-sm font-medium flex items-center gap-1.5">
                    <input type="checkbox" readOnly checked={viewPersonPaid('driver2', String(viewModal.row?.driver2_id ?? ''))} className="w-3.5 h-3.5 rounded accent-blue-600 pointer-events-none" />
                    {viewModal.row?.driver2_name || '—'}</p>
                    {viewPersonPaid('driver2', String(viewModal.row?.driver2_id ?? '')) && <p className="text-[11px] font-bold text-slate-400 pl-5">₹{viewPersonAmount('driver2', String(viewModal.row?.driver2_id ?? '')).toLocaleString('en-IN')}</p>}
                  </div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Helper</p><p className="text-sm font-medium flex items-center gap-1.5">
                    <input type="checkbox" readOnly checked={viewPersonPaid('helper', String(viewModal.row?.helper_id ?? ''))} className="w-3.5 h-3.5 rounded accent-blue-600 pointer-events-none" />
                    {viewModal.row?.helper_name || '—'}</p>
                    {viewPersonPaid('helper', String(viewModal.row?.helper_id ?? '')) && <p className="text-[11px] font-bold text-slate-400 pl-5">₹{viewPersonAmount('helper', String(viewModal.row?.helper_id ?? '')).toLocaleString('en-IN')}</p>}
                  </div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Conductor</p><p className="text-sm font-medium flex items-center gap-1.5">
                    <input type="checkbox" readOnly checked={viewPersonPaid('conductor', String(viewModal.row?.conductor_id ?? ''))} className="w-3.5 h-3.5 rounded accent-blue-600 pointer-events-none" />
                    {viewModal.row?.conductor_name || '—'}</p>
                    {viewPersonPaid('conductor', String(viewModal.row?.conductor_id ?? '')) && <p className="text-[11px] font-bold text-slate-400 pl-5">₹{viewPersonAmount('conductor', String(viewModal.row?.conductor_id ?? '')).toLocaleString('en-IN')}</p>}
                  </div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Paid To</p><p className="text-sm font-medium">{viewModal.row?.paid_to_name || '—'}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Amount</p><p className="text-sm font-bold text-slate-900">₹{Number(viewModal.row?.grantotal ?? 0).toLocaleString('en-IN')}</p></div>
                </div>
                {viewModal.row?.remarks && (
                  <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                    <p className="text-xs font-bold uppercase text-slate-500 mb-1">Remarks</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewModal.row.remarks}</p>
                  </div>
                )}
                {viewModal.loading ? (
                  <p className="text-center text-sm text-slate-400 py-4">Loading ledger entries…</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2 bg-blue-600 text-xs font-bold text-white">Debit Account</div>
                      <div className="divide-y divide-slate-100">
                        {viewModal.debit.length === 0 && <div className="p-3 text-sm text-slate-400">No entries</div>}
                        {viewModal.debit.map((item, i) => (
                          <div key={i} className="flex justify-between px-4 py-2 text-sm">
                            <span>{item.expensives}</span><span className="font-semibold">₹{item.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="px-4 py-2 bg-emerald-600 text-xs font-bold text-white">Credit Account</div>
                      <div className="divide-y divide-slate-100">
                        {viewModal.credit.length === 0 && <div className="p-3 text-sm text-slate-400">No entries</div>}
                        {viewModal.credit.map((item, i) => (
                          <div key={i} className="flex justify-between px-4 py-2 text-sm">
                            <span>{item.expensives}</span><span className="font-semibold">₹{item.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
