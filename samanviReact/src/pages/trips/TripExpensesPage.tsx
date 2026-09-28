import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Receipt, Save, Search, X, PlusCircle, MinusCircle, FileText, FolderPlus, History, Clock } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, SearchableSelect, Select, TopNavTabs, LedgerGroupTag, useLedgerGroupOf } from '@/components/shared'
import ChangeNote from '@/components/shared/ChangeNote'
import type { Column } from '@/components/shared'
import { tripsService } from '@/services/trips.service'
import { isVanVehicleType, formatDate, ledgerOption, todayISO } from '@/lib/utils'
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
// An opting hand is someone who isn't on the driver / helper / staff register
// (their name goes in Remarks), so there is no personal ledger to credit. Every
// opting seat is paid through a shared Payables ledger for its ROLE instead —
// "Opting Driver" (driver 1 and driver 2 both), "Opting Helper", "Opting
// Conductor" — so driver and helper opting spend stay separately visible.
// Seat-level amounts stay in the form (driveronesudsalary etc.); these keys just
// sum the seats opting for that role.
type OptingKey = 'optingDriver' | 'optingHelper' | 'optingConductor'
type PersonKey = 'driver1' | 'driver2' | 'helper' | 'conductor' | OptingKey
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

const today = todayISO()
const firstOfMonth = today.slice(0, 8) + '01'

const num = (v: any) => Number(v) || 0
// Per-trip opting rate off the Service No master. The amount is edited there as
// optDriverSalary / optHelperSalary; the older optDriver / optHelper columns
// carry the same figure only on rows the legacy Angular master wrote (it had no
// separate *Salary field) and come back '' or '0' on everything the React
// master has saved since. Reading only the legacy pair made Total Salary — and
// with it the auto-added "Salaries" debit row — always ₹0. Current column
// first, legacy as the fallback.
const optRate = (rate: any, role: 'Driver' | 'Helper'): number =>
  num(rate?.['opt' + role + 'Salary']) || num(rate?.['opt' + role])
const OPTING_KEYS: OptingKey[] = ['optingDriver', 'optingHelper', 'optingConductor']
const PERSON_KEYS: PersonKey[] = ['driver1', 'driver2', 'helper', 'conductor', ...OPTING_KEYS]
type OptingSeat = 'driver1' | 'driver2' | 'helper' | 'conductor'
const OPTING_SEATS: OptingSeat[] = ['driver1', 'driver2', 'helper', 'conductor']
// Which shared ledger a seat's opting share is paid through. Both driver seats
// share one, so a trip with two opting drivers still posts a single Opting
// Driver row rather than two rows against the same ledger.
const OPTING_KEY_FOR_SEAT: Record<OptingSeat, OptingKey> = {
  driver1: 'optingDriver', driver2: 'optingDriver', helper: 'optingHelper', conductor: 'optingConductor',
}
// One name per role, used for the ledger, the <option>, the checkbox and the name
// stored on the trip row — they must agree, because a seat is recognised as
// opting by its stored name and its ledger is resolved by that same name.
const OPTING_LABEL: Record<OptingKey, string> = {
  optingDriver: 'Opting Driver', optingHelper: 'Opting Helper', optingConductor: 'Opting Conductor',
}
const optingNameForSeat = (seat: OptingSeat) => OPTING_LABEL[OPTING_KEY_FOR_SEAT[seat]]
// <option> value standing in for an opting seat in the modal's crew selects — a
// registered person's id is always numeric, so this can never collide.
const OPTING_VALUE = '__opting__'
// A seat is opting when it has no registered person behind it and was set to an
// Opting entry on Trip Creation (stored as the role's name with an empty id).
// Matched on the "opting" prefix so both the role-specific names and the plain
// "Opting" older rows carry read as opting. The legacy opt_*_id columns are
// honoured too, so a trip written while the old substitute picker existed still
// reads as opting rather than as an empty seat.
const seatIsOpting = (slotId: any, slotName: any, optId: any): boolean =>
  !String(slotId ?? '') && (/^opting/.test(normLedgerName(slotName)) || !!String(optId ?? ''))
// The credit-side ledgers opting seats pay through. Seeded server-side at boot
// under the Payables container of the register each role draws from - Drivers >
// "Opting Driver", Helpers > "Opting Helper", Staff > "Opting Conductor" (see the
// container guard in mainModel.js) - and resolved by name so ids can differ per
// database.
const OPTING_CONTAINER: Record<OptingKey, string> = {
  optingDriver: 'drivers', optingHelper: 'helpers', optingConductor: 'staff',
}
const isPayablesLedger = (l: any) => String(l?.child ?? '') === 'Payables' || String(l?.staticname ?? '') === 'EQUITIES AND LIABILITIES'
const EXPENSE_KEYS: ExpenseKey[] = ['beta', 'salary', 'parking']
// Resolved by NAME, not id: these ledgers are seeded per database (see the trip
// expense ledger seed server-side), so their ids differ between deployments — the
// Angular app's hardcoded 61/62 only hold in its own older database. Names are
// normalised before comparing so "Beta's" and "Betas", "Salary's" and "Salaries"
// all resolve; the legacy id stays as a last-resort fallback.
const normLedgerName = (v: any) => String(v ?? '').toLowerCase().replace(/[^a-z]/g, '')
const isExpensesGroup = (l: any) => String(l?.district_id ?? '') === '4' || String(l?.staticname ?? '') === 'EXPENSES'
// `stem` is the last resort: an expense ledger whose name merely starts with
// it ("Beta Expenses", "Parking Charges") still resolves rather than leaving
// the debit side empty.
const EXPENSE_LEDGERS: Record<ExpenseKey, { id: number; name: string; aliases: string[]; stem: string }> = {
  beta: { id: 62, name: 'Betas', aliases: ['betas', 'beta'], stem: 'beta' },
  salary: { id: 61, name: 'Salaries', aliases: ['salaries', 'salarys', 'salary'], stem: 'salar' },
  parking: { id: 84, name: 'Parking', aliases: ['parking'], stem: 'parking' },
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

// An expense is open to edit or delete while it is filed and neither the trip
// nor its voucher (Voucher Approvals) has been approved; a rejected trip goes
// back On Review first.
const canActOnExpense = (row: any) => row.status === 1 && row.admin_status !== 1 && row.admin_status !== 2 && Number(row.voucher_status) !== 1

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
  // Bus or Van only - the two carry different columns, so there is no mixed list.
  const [vehicleTab, setVehicleTab] = useState('Bus')
  // Whether the trip's expense has been filed yet (trip_created.status: 0 not
  // filed, 1 filed). The page is both the filing queue and the record of what
  // was filed, so the two are worth switching between rather than reading one
  // long mixed list.
  const [filedTab, setFiledTab] = useState('All')

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
  // Name of the owner ledger the Credit side was filled with for a hired van
  // (see openAdd), so the hire notice can say what was done for the user.
  const [hireCreditSeeded, setHireCreditSeeded] = useState('')
  // Likewise the Opting Driver ledger credited for an opting driver's pay on a van.
  const [vanOptingSeeded, setVanOptingSeeded] = useState('')

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
    // Always refetched on arrival: a trip's status (Halt, say) and crew are set
    // on Trip Creation, and this page opening a trip on a copy cached minutes
    // ago would price it as it was, not as it is.
    staleTime: 0,
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
  const isVan = (t: any) => String(t.vehicle_type ?? '').toLowerCase() === 'van'
  const isFiled = (t: any) => Number(t.status) === 1
  const vehicleTrips = vehicleTab === 'Van' ? trips.filter(isVan) : trips.filter((t) => !isVan(t))
  const filteredTrips = filedTab === 'All' ? vehicleTrips
    : filedTab === 'Filed' ? vehicleTrips.filter(isFiled)
      : vehicleTrips.filter((t) => !isFiled(t))
  // Each tab's own count: the vehicle counts are of every trip in the date
  // range, the filed counts are within the vehicle tab that is open.
  const vehicleCounts = {
    Bus: trips.filter((t) => !isVan(t)).length,
    Van: trips.filter(isVan).length,
  }
  const filedCounts = {
    All: vehicleTrips.length,
    'Not Filed': vehicleTrips.filter((t) => !isFiled(t)).length,
    Filed: vehicleTrips.filter(isFiled).length,
  }
  const ledgerList: any[] = ledgerData?.data ?? []
  // openAdd/openEdit await getBeta before resolving ledgers, and a callback holds
  // the ledgerList from the render it was created in — so if the ledger query was
  // still in flight when the row was clicked, the whole handler ran against an
  // empty list and reported "Ledger not found" for Betas/Salaries/Parking even
  // though they exist. The ref always points at the newest list; ensureLedgers()
  // covers the case where the query genuinely hasn't returned yet.
  const ledgerRef = useRef<any[]>([])
  // The rate the modal opened with - the service number's per-seat betas, or the
  // one Halt Beta on a halted trip - kept so a seat filled after opening can be
  // priced the same way the seats filled at opening were.
  const rateRef = useRef<{ halted: boolean; haltRate: number; rate: any } | null>(null)
  ledgerRef.current = ledgerList
  const ensureLedgers = async () => {
    if (ledgerRef.current.length) return
    const r = await reloadLedgers()
    ledgerRef.current = r.data?.data ?? []
  }
  const ledgerOptions = ledgerList.map((l: any) => ledgerOption(l, 'ledger_id'))
  const ledgerGroupOf = useLedgerGroupOf()
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
    optingDriver: '', optingHelper: '', optingConductor: '',
  }[key])
  const personName = (key: PersonKey) => ({
    driver1: form.driver1_name, driver2: form.driver2_name, helper: form.helper_name, conductor: form.conductor_name,
    ...OPTING_LABEL,
  }[key])
  const isOptingRole = (key: OptingSeat): boolean => (
    key === 'driver1' ? seatIsOpting(form.driver1_id, form.driver1_name, form.opt_driver1_id)
      : key === 'driver2' ? seatIsOpting(form.driver2_id, form.driver2_name, form.opt_driver2_id)
        : key === 'helper' ? seatIsOpting(form.helper_id, form.helper_name, form.opt_helper_id)
          : seatIsOpting(form.conductor_id, form.conductor_name, '')
  )
  const anyoneOpting = OPTING_SEATS.some(isOptingRole)
  // Both driver seats pay through one Opting Driver ledger, so its tick belongs
  // to the first opting driver seat only — rendering it under both would show two
  // checkboxes for a single payee that toggle each other.
  const optingTickSeat = (key: OptingKey) =>
    OPTING_SEATS.find((seat) => OPTING_KEY_FOR_SEAT[seat] === key && isOptingRole(seat))
  // A halted service still has its crew assigned, but they are paid the one
  // company-wide Halt Beta instead of their running betas. The seat beta fields are
  // seeded with that amount when the modal opens (see openAdd), so every total,
  // credit row and ledger split below works unchanged — this flag only drives
  // what the screen calls the amounts, and relaxes the "every beta is required"
  // rule for a seat nobody was assigned to.
  const isHalt = String(modal.row?.trip_run_status ?? '') === 'Halt'
  // A van trip is a charter with one driver at most and no per-seat betas or
  // opting salaries (a van service number carries no rates), so the crew grid
  // shrinks to Driver1 and the beta boxes come away. A hired van has no driver
  // of ours at all: what it costs is the hire charge, posted Hire vehicle
  // charges -> the van owner's ledger (Bus Masters > Hire form), so both sides
  // are filled in rather than picked by hand. Same hire rule as Trip Creation.
  const isVanTrip = String(modal.row?.vehicle_type ?? '').toLowerCase() === 'van'
  const vehicleOf = (busNo: string) => buses.find((b: any) => String(b.bus_no) === String(busNo))
  const isHireVehicle = (busNo: string) => String(vehicleOf(busNo)?.bus_category ?? '') === 'hire'
  const vanHired = isVanTrip && isHireVehicle(form.bus_no || String(modal.row?.bus_no ?? ''))
  // A van trip picks from vans and a bus trip from buses - a service number is
  // one or the other, so the other kind is never a valid choice here. The
  // vehicle already on the trip stays listed whatever it is.
  const vehicleOptions = buses.filter((b: any) => isVanVehicleType(b.vehicle_type) === isVanTrip || String(b.bus_no) === form.bus_no)
  // What the van's booking amount is, for the read-only fields and the list.
  const vanAmountLabel = (r: any) => (
    isHireVehicle(String(r?.bus_no ?? '')) ? 'Hire Charge'
      : seatIsOpting(r?.driver1_id, r?.driver1_name, r?.opt_driver1_id) ? 'Opting Driver Pay' : 'Amount')
  const seatHasPerson = (seat: OptingSeat | 'conductor'): boolean => !!String(
    seat === 'driver1' ? form.driver1_id : seat === 'driver2' ? form.driver2_id
      : seat === 'helper' ? form.helper_id : form.conductor_id)
  // A seat is charged only when someone holds it - a registered person or an
  // opting cover. A trip with no conductor aboard carries no Conductor Beta.
  const seatFilled = (seat: OptingSeat): boolean => seatHasPerson(seat) || isOptingRole(seat)
  // Legacy parity (expenses.component.ts:313-339 in D:\samanvi). Every seat earns
  // its per-trip BETA — calculateTotalBeta() sums all four unconditionally, so an
  // opting seat is charged its beta too. SALARY is the opting premium only: the
  // service number's OPT-Driver / OPT-Helper Salary, added just for a seat marked
  // Opting, exactly as calculateTotalSalary() gates on the OPT/REG flag. A fully
  // regular crew therefore has no salary at all.
  //
  // Opting differs from legacy in one respect only, by design: legacy marks a
  // NAMED driver as opting, whereas here an opting seat is an unlisted person
  // (their name goes in Remarks), so their beta + salary is credited to the
  // shared Opting ledger rather than to a personal one.
  const seatBeta = (seat: OptingSeat | 'conductor'): number => num(
    seat === 'driver1' ? form.driveronesalary : seat === 'driver2' ? form.drivertwosalary
      : seat === 'helper' ? form.helpersalary : form.conductorsalary)
  // The service number carries an OPT-Driver and an OPT-Helper salary only, so an
  // opting conductor is paid its beta and nothing on top.
  const seatSalary = (seat: OptingSeat): number => (isOptingRole(seat) ? num(
    seat === 'driver1' ? form.driveronesudsalary : seat === 'driver2' ? form.drivertwosudsalary
      : seat === 'helper' ? form.helpersudsalary : 0) : 0)
  const isOptingKey = (key: PersonKey): key is OptingKey => (OPTING_KEYS as string[]).includes(key)
  const personAmount = (key: PersonKey): number => {
    if (isOptingKey(key)) {
      return OPTING_SEATS
        .filter((seat) => OPTING_KEY_FOR_SEAT[seat] === key && isOptingRole(seat))
        .reduce((sum, seat) => sum + seatBeta(seat) + seatSalary(seat), 0)
    }
    // A named seat is paid on its own ledger; an opting one through its role's.
    return isOptingRole(key) ? 0 : seatBeta(key)
  }
  const findOptingLedger = (key: OptingKey) => {
    const target = normLedgerName(OPTING_LABEL[key])
    return ledgerRef.current.find((l: any) => isPayablesLedger(l) && normLedgerName(l.temple_name) === target)
      ?? ledgerRef.current.find((l: any) => normLedgerName(l.temple_name) === target)
  }
  // The server seeds the Opting ledger at boot, but the modal doesn't depend on
  // that having happened: the first time it is needed and missing, it is
  // created here through the same addLedgerData call the "+ New Ledger" popover
  // uses — under the Payables container for that role, the same one the seed
  // targets — and the ledger list is reloaded so the new row resolves
  // immediately. Returns the ledger, or null if it couldn't be made.
  const ensureOptingLedger = async (key: OptingKey): Promise<any | null> => {
    await ensureLedgers()
    const existing = findOptingLedger(key)
    if (existing) return existing
    let containers: any[] = ledgerParents
    if (!containers.length) {
      const r = await accountingService.getMainMastersSubchild()
      containers = (r?.data ?? []).filter((c: any) => Number(c.level_depth) === 4 && Number(c.d_in) === 0)
    }
    const underPayables = containers.filter((c: any) => String(c.child ?? '') === 'Payables')
    const parent = underPayables.find((c: any) => normLedgerName(c.temple_name) === OPTING_CONTAINER[key])
    if (!parent) return null
    const res: any = await accountingService.addLedgerData({
      temple_name: OPTING_LABEL[key], amount: 0, parent_level: 4,
      parent_subgroup_id: parent.village_id, parent_subchild_id: parent.id,
      district_id: parent.district_id, staticname: parent.staticentry,
      mandal_id: parent.mandal_id, mandal_name: parent.mandal_name,
      village_id: parent.village_id, child: parent.child,
      subchildtwo: parent.temple_name,
      user_id: localStorage.getItem('user_id'), entry_by: localStorage.getItem('usr_nm'),
    })
    if (res?.status !== 200) return null
    const reloaded = await reloadLedgers()
    ledgerRef.current = reloaded.data?.data ?? []
    return findOptingLedger(key) ?? null
  }
  // Generic so the read-only View modal can resolve a person's ledger from
  // its own row data (driverX_id etc.) without going through `form` at all.
  const ledgerIdForPerson = (key: PersonKey, id: string): string => {
    if (isOptingKey(key)) { const l = findOptingLedger(key); return l ? String(l.ledger_id) : '' }
    if (!id) return ''
    const list = key === 'driver1' || key === 'driver2' ? drivers : key === 'helper' ? helpers : conductors
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

  // The expense ledger a bought-in vehicle's charge is debited to, resolved by
  // name first so a database that seeded it under another id still finds it —
  // the same rule the Trip Creation grid uses for the hire it posts.
  const HIRE_LEDGER_ID = 388
  const findHireLedger = () =>
    ledgerRef.current.find((l: any) => normLedgerName(l.temple_name) === 'hirevehiclecharges')
      ?? ledgerRef.current.find((l: any) => Number(l.ledger_id) === HIRE_LEDGER_ID)
      ?? ledgerRef.current.find((l: any) => normLedgerName(l.temple_name).startsWith('hirevehicle'))

  const findExpenseLedger = (key: ExpenseKey) => {
    const { id, aliases, stem } = EXPENSE_LEDGERS[key]
    return ledgerRef.current.find((l: any) => isExpensesGroup(l) && aliases.includes(normLedgerName(l.temple_name)))
      ?? ledgerRef.current.find((l: any) => Number(l.ledger_id) === id)
      ?? ledgerRef.current.find((l: any) => isExpensesGroup(l) && normLedgerName(l.temple_name).startsWith(stem))
  }

  // The Debit-side split, which must stay disjoint so the debit total matches the
  // credit total — the same one legacy's addAutoDebitSalaryAndBeta() posts: all
  // four betas to Betas, the opting premium to Salaries, and Parking on its own
  // line (the one addition; legacy has no parking field). Betas + Salaries is
  // exactly the sum of PERSON_KEYS' amounts, which is also what
  // recomputePaidToRow sums for the credit remainder — that is what keeps the
  // two sides balanced by construction.
  const expenseAmount = (key: ExpenseKey): number => {
    if (key === 'beta') return seatBeta('driver1') + seatBeta('driver2') + seatBeta('helper') + seatBeta('conductor')
    if (key === 'salary') return seatSalary('driver1') + seatSalary('driver2') + seatSalary('helper')
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
  // Folds rows on the same ledger into one - used when the voucher is posted,
  // not while the modal is open. A crew member who is also the Paid To has two
  // rows here (their own share, and the leftover), and both have to stay
  // separate for the two ticks to read right: folding them as they were made
  // left one row tagged as the person, so the Paid To tick never showed and a
  // later tick rebuilt the leftover on top of the folded amount.
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
    // The Paid To row stays its own row even when it lands on a ticked person's
    // ledger; the two are folded together only when posted (see creditForPost).
    const kept = withoutPaidTo.filter((r) => r.ledger || r.amount)
    return [...kept, { ledger: toLedgerObj(ledger), amount: String(remainder), personKey: 'paidTo' }]
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
    const addRow = (ledger: any) => setCreditRows((rows) => {
      const cleaned = rows.filter((r) => (r.ledger || r.amount) && r.personKey !== 'paidTo')
      return recomputePaidToRow([...cleaned, { ledger: toLedgerObj(ledger), amount: String(personAmount(key)), personKey: key }])
    })
    const ledger = ledgerId ? findLedger(ledgerId) : null
    if (ledger) { addRow(ledger); return }
    if (!isOptingKey(key)) {
      toast.error(`No ledger found for ${personName(key)} — they may not have an auto-created ledger yet`)
      return
    }
    const label = OPTING_LABEL[key]
    ensureOptingLedger(key).then((made) => {
      if (!made) { toast.error(`Could not find or create the "${label}" ledger under Payables — add a ledger named ${label} there by hand`); return }
      toast.success(`Created the "${label}" ledger under Payables`)
      addRow(made)
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
    // Rebuilt when the rows are the derived ones, or when there is nothing
    // there but the blank placeholder - a modal that opened with no rates has
    // no derived rows yet, and the first beta typed must still produce them.
    // Rows the user picked by hand are left alone.
    setDebitRows((rows) => (rows.some((r) => r.personKey) || rows.every((r) => !r.ledger && !r.amount)
      ? buildExpenseRows(rows, { silent: true }) : rows))
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
  // Changing who holds a seat repoints that seat's ledger row: the "Pay X" tick
  // was made for the person picked at the time, so when Driver1 goes from A to
  // B the row credits B's ledger, priced for B, rather than still crediting A
  // under B's name. A seat emptied, or switched to opting, drops its person row;
  // a shared opting row is re-priced from whichever seats still pay through it,
  // and dropped when none do. A ledger id resolved off the saved expense is
  // forgotten for a seat that changed - it belonged to the previous person.
  // Same first-pass guard as above.
  const crewSig = [
    form.driver1_id, form.driver1_name, form.driver2_id, form.driver2_name,
    form.helper_id, form.helper_name, form.conductor_id, form.conductor_name,
  ].join('|')
  const lastCrewSig = useRef<string | null>(null)
  useEffect(() => {
    if (!modal.mode || loadingModal) { lastCrewSig.current = null; return }
    if (lastCrewSig.current === null || lastCrewSig.current === crewSig) { lastCrewSig.current = crewSig; return }
    const prevParts = lastCrewSig.current.split('|')
    const parts = crewSig.split('|')
    lastCrewSig.current = crewSig
    const changed = OPTING_SEATS.filter((_, i) => parts[2 * i] !== prevParts[2 * i] || parts[2 * i + 1] !== prevParts[2 * i + 1])
    if (!changed.length) return
    setResolvedLedgerIds((prev) => {
      const next = { ...prev }
      changed.forEach((seat) => { next[seat] = undefined })
      return next
    })
    setCreditRows((rows) => {
      if (!rows.some((r) => r.personKey && r.personKey !== 'paidTo')) return rows
      const next: LedgerRow[] = []
      for (const r of rows) {
        if (!r.personKey || r.personKey === 'paidTo') { next.push(r); continue }
        const key = r.personKey as PersonKey
        const amount = personAmount(key)
        if (amount <= 0) continue
        if (isOptingKey(key)) { next.push({ ...r, amount: String(amount) }); continue }
        if (isOptingRole(key)) continue
        const ledgerId = changed.includes(key) ? ledgerIdForPerson(key, personId(key)) : personLedgerId(key)
        const ledger = ledgerId ? findLedger(ledgerId) : null
        if (!ledger) continue
        next.push({ ...r, ledger: toLedgerObj(ledger), amount: String(amount) })
      }
      return recomputePaidToRow(next, true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewSig, modal.mode, loadingModal])
  // Read-only View modal: was this person's own ledger among the saved rows?
  // (expensive_details.ledger_id, selected straight through by `SELECT *`.)
  // Credit is where person rows land now; debit is still searched as a fallback
  // so expenses filed before that switch keep showing their ticks correctly.
  // Everything about one crew seat lives under the dropdown that picked them:
  // their beta, the opting salary when that seat is opting, and the tick that
  // sends their share to their own ledger. Field keys per seat rather than four
  // near-identical blocks of markup.
  const SEAT_FIELDS: Record<OptingSeat, { label: string; beta: keyof typeof form; salary?: keyof typeof form }> = {
    driver1: { label: 'Driver1', beta: 'driveronesalary', salary: 'driveronesudsalary' },
    driver2: { label: 'Driver2', beta: 'drivertwosalary', salary: 'drivertwosudsalary' },
    helper: { label: 'Helper', beta: 'helpersalary', salary: 'helpersudsalary' },
    conductor: { label: 'Conductor', beta: 'conductorsalary' },
  }
  // Picking someone for a seat that had nobody seeds its beta off the rate the
  // modal opened with, and emptying a seat clears it, so the beta follows the
  // name rather than lingering from whoever held the seat before. A beta already
  // typed for a held seat is left alone.
  const seatBetaPatch = (seat: OptingSeat, filled: boolean): Record<string, string> => {
    const key = SEAT_FIELDS[seat].beta
    if (!filled || isVanTrip) return { [key]: '' }
    if (String(form[key] ?? '')) return {}
    const r = rateRef.current
    if (!r) return {}
    const running = seat === 'driver1' ? r.rate?.driverOneBeta : seat === 'driver2' ? r.rate?.driverTwoBeta
      : seat === 'helper' ? r.rate?.helperBeta : r.rate?.conductorBeta
    return { [key]: r.halted ? String(r.haltRate || '') : String(running ?? '') }
  }
  const seatFields = (seat: OptingSeat) => {
    if (isVanTrip) return null
    const f = SEAT_FIELDS[seat]
    const filled = seatFilled(seat)
    return (
      <>
        <div className="mt-2">
          <Label>{isHalt ? 'Halt ' : ''}Beta (₹) {filled && <span className="text-red-500">*</span>}</Label>
          {/* No name, no beta: the box is shut until someone is picked for the seat. */}
          <Input type="number" value={filled ? String(form[f.beta] ?? '') : ''} disabled={!filled}
            placeholder={filled ? '' : '—'}
            onChange={(e) => setForm((prev) => ({ ...prev, [f.beta]: e.target.value }))} />
        </div>
        {/* Legacy shows the Salary box only for an opting seat
            (expenses.component.html *ngIf="...=== 'opting'"). The conductor has
            no OPT rate on the service number, so it has no box at all. */}
        {f.salary && isOptingRole(seat) && (
          <div className="mt-2">
            <Label>Opting Salary (₹) <span className="text-red-500">*</span></Label>
            <Input type="number" value={String(form[f.salary] ?? '')}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.salary as string]: e.target.value }))} />
          </div>
        )}
        {payTick(seat)}
      </>
    )
  }
  const payTick = (seat: OptingSeat) => {
    if (isOptingRole(seat)) {
      const key = OPTING_KEY_FOR_SEAT[seat]
      if (optingTickSeat(key) !== seat) return null
      return (
        <div className="mt-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input type="checkbox" checked={isPersonChecked(key)} onChange={() => togglePerson(key)} className="w-4 h-4 rounded accent-amber-600" />
            Pay {OPTING_LABEL[key]}
          </label>
          <p className="text-[11px] font-bold text-amber-700/80 pl-6">₹{personAmount(key).toLocaleString('en-IN')}</p>
        </div>
      )
    }
    const name = personName(seat)
    if (!name) return null
    return (
      <div className="mt-2">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={isPersonChecked(seat)} onChange={() => togglePerson(seat)} className="w-4 h-4 rounded accent-blue-600" />
          Pay {name}
        </label>
        <p className="text-[11px] font-bold text-slate-400 pl-6">₹{personAmount(seat).toLocaleString('en-IN')}</p>
      </div>
    )
  }

  const viewPersonRow = (key: PersonKey, id: string): any | undefined => {
    const ledgerId = viewModal.ledgerIds[key] || ledgerIdForPerson(key, id)
    if (!ledgerId) return undefined
    return viewModal.credit.find((r: any) => String(r.ledger_id ?? '') === ledgerId)
      ?? viewModal.debit.find((r: any) => String(r.ledger_id ?? '') === ledgerId)
  }
  const viewPersonPaid = (key: PersonKey, id: string): boolean => !!viewPersonRow(key, id)
  const viewPersonAmount = (key: PersonKey, id: string): number => num(viewPersonRow(key, id)?.amount)
  // Which opting payees a filed trip had, read straight off the saved row so the
  // read-only view needs no `form`.
  const viewOptingKeys = (row: any): OptingKey[] => {
    if (!row) return []
    const seatOpting: Record<OptingSeat, boolean> = {
      driver1: seatIsOpting(row.driver1_id, row.driver1_name, row.opt_driver1_id),
      driver2: seatIsOpting(row.driver2_id, row.driver2_name, row.opt_driver2_id),
      helper: seatIsOpting(row.helper_id, row.helper_name, row.opt_helper_id),
      conductor: seatIsOpting(row.conductor_id, row.conductor_name, ''),
    }
    return OPTING_KEYS.filter((k) => OPTING_SEATS.some((seat) => OPTING_KEY_FOR_SEAT[seat] === k && seatOpting[seat]))
  }

  // ── Modal open/close ─────────────────────────────────────────────────────
  const closeModal = () => { rateRef.current = null; setModal({ mode: null, row: null }); setForm(emptyForm()); setDebitRows([emptyLedgerRow()]); setCreditRows([emptyLedgerRow()]); setResolvedLedgerIds({}); setPaidToOptedOut(false); setHireCreditSeeded(''); setVanOptingSeeded('') }

  const openAdd = async (row: any) => {
    setModal({ mode: 'add', row })
    setLoadingModal(true)
    await ensureLedgers()
    setDebitRows([emptyLedgerRow()])
    setCreditRows([emptyLedgerRow()])
    setResolvedLedgerIds({})
    setPaidToOptedOut(false)
    setHireCreditSeeded('')
    setVanOptingSeeded('')
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

    // Halt Beta is one company-wide amount (Service Routes > Halt tab), so it is
    // read from settings rather than off the service number's rate row.
    const [res, haltRes] = await Promise.all([
      tripsService.getBeta({ serviceNo: row.service_no }),
      mastersService.getHaltBeta(),
    ])
    // No rate row (the service number was renamed or removed after the trip
    // was made) used to skip this whole block, so the modal opened bare: no
    // betas on either side, no halt beta, no paid-direct ticks, no ledger rows,
    // and nothing typed afterwards built a debit row either. The seats now
    // seed with nothing, the user is told to type the betas, and everything
    // else sets up as usual.
    const rateRow = res?.data?.[0]
    // A van trip pays no per-seat beta and no opting salary (see isVanTrip), so
    // every seat seeds empty and only parking and the hire charge remain - and
    // a van service number having no rate row is nothing to warn about.
    const van = String(row.vehicle_type ?? '').toLowerCase() === 'van'
    if (!rateRow && !van && String(row.trip_run_status ?? '') !== 'Halt') {
      toast.warning(`No rates found for service ${row.service_no ?? ''} — enter the betas by hand`)
    }
    const rate = rateRow ?? {}
    {
      const optDriverRate = van ? 0 : optRate(rate, 'Driver')
      const optHelperRate = van ? 0 : optRate(rate, 'Helper')
      const d1Opting = seatIsOpting(row.driver1_id, row.driver1_name, row.opt_driver1_id)
      const d2Opting = seatIsOpting(row.driver2_id, row.driver2_name, row.opt_driver2_id)
      const hOpting = seatIsOpting(row.helper_id, row.helper_name, row.opt_helper_id)
      const cOpting = seatIsOpting(row.conductor_id, row.conductor_name, '')
      // A seat is charged its beta only when someone holds it - a registered
      // person or an opting cover. A seat nobody was assigned to (a trip with no
      // conductor, say) is charged nothing, rather than the rate off the service
      // number landing on every trip whether or not anyone sat there.
      // Halted service: every held seat is paid the one Halt Beta rather than
      // its own running beta. Opting salary does not apply — the service did not
      // run, so there was no seat for anyone to cover.
      const halted = String(row.trip_run_status ?? '') === 'Halt'
      const haltRate = num(haltRes?.data?.halt_beta)
      rateRef.current = { halted, haltRate, rate }
      const seatRate = (assignedId: any, opting: boolean, running: any) => {
        if (van) return ''
        if (!String(assignedId ?? '') && !opting) return ''
        return halted ? String(haltRate || '') : String(running ?? '')
      }
      setForm((f) => ({
        ...f,
        driveronesalary: seatRate(row.driver1_id, d1Opting, rate.driverOneBeta),
        drivertwosalary: seatRate(row.driver2_id, d2Opting, rate.driverTwoBeta),
        helpersalary: seatRate(row.helper_id, hOpting, rate.helperBeta),
        conductorsalary: seatRate(row.conductor_id, cOpting, rate.conductorBeta),
        // Per-seat salary — the service number's OPT-Driver / OPT-Helper Salary,
        // earned on every trip by whoever holds the seat (see personAmount).
        driveronesudsalary: halted ? '' : String(optDriverRate || ''),
        drivertwosudsalary: halted ? '' : String(optDriverRate || ''),
        helpersudsalary: halted ? '' : String(optHelperRate || ''),
        parking_amt: String(rate.parkingAmount ?? ''),
      }))

      // Same arithmetic as personAmount, off the freshly fetched rate: a regular
      // seat is paid its beta, an opting seat its beta plus the opting premium.
      const d1Beta = num(seatRate(row.driver1_id, d1Opting, rate.driverOneBeta))
      const d2Beta = num(seatRate(row.driver2_id, d2Opting, rate.driverTwoBeta))
      const hBeta = num(seatRate(row.helper_id, hOpting, rate.helperBeta))
      const driver1Amt = d1Opting ? 0 : d1Beta
      const driver2Amt = d2Opting ? 0 : d2Beta
      const helperAmt = hOpting ? 0 : hBeta
      const cBeta = num(seatRate(row.conductor_id, cOpting, rate.conductorBeta))
      const conductorAmt = cOpting ? 0 : cBeta
      const optDrv = halted ? 0 : optDriverRate
      const optHlp = halted ? 0 : optHelperRate
      // One amount per opting ledger, not one per seat — two opting drivers share
      // the Opting Driver row. The conductor has no OPT rate on the service
      // number, so an opting conductor carries its beta only.
      const optingAmounts: Record<OptingKey, number> = {
        optingDriver: (d1Opting ? d1Beta + optDrv : 0) + (d2Opting ? d2Beta + optDrv : 0),
        optingHelper: hOpting ? hBeta + optHlp : 0,
        optingConductor: cOpting ? cBeta : 0,
      }
      const optingTotal = OPTING_KEYS.reduce((sum, k) => sum + optingAmounts[k], 0)
      const parkingAmt = num(rate.parkingAmount)
      const total = driver1Amt + driver2Amt + helperAmt + conductorAmt + optingTotal + parkingAmt
      const amountFor: Record<PersonKey, number> = {
        driver1: driver1Amt, driver2: driver2Amt, helper: helperAmt, conductor: conductorAmt, ...optingAmounts,
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
      // The Trip Creation "pay directly" tick on an opting seat pre-ticks that
      // seat's shared Opting payee, the same way it does a named person. A role's
      // ledger is pre-ticked if any seat paying through it was ticked.
      const seatPreTicked: Record<OptingSeat, boolean> = {
        driver1: d1Opting && Number(row.driver1_paid_direct ?? 0) === 1,
        driver2: d2Opting && Number(row.driver2_paid_direct ?? 0) === 1,
        helper: hOpting && Number(row.helper_paid_direct ?? 0) === 1,
        conductor: cOpting && Number(row.conductor_paid_direct ?? 0) === 1,
      }
      for (const key of OPTING_KEYS) {
        const preTicked = OPTING_SEATS.some((seat) => OPTING_KEY_FOR_SEAT[seat] === key && seatPreTicked[seat])
        const amount = optingAmounts[key]
        if (!preTicked || amount <= 0) continue
        const ledger = findOptingLedger(key) ?? await ensureOptingLedger(key)
        if (!ledger) { unresolved.push(OPTING_LABEL[key]); continue }
        personRows.push({ ledger: toLedgerObj(ledger), amount: String(amount), personKey: key })
        claimed += amount
      }

      const remainder = total - claimed
      const paidToList = row.paid_to_type === 'driver' ? drivers : row.paid_to_type === 'helper' ? helpers : activeStaff
      const paidToRec = paidToList.find((r: any) => String(r.id) === String(row.paid_to_id))
      const paidToLedger = paidToRec?.ledger_id ? findLedger(String(paidToRec.ledger_id)) : null
      const seeded: LedgerRow[] = [...personRows]
      if (remainder > 0 && paidToLedger) {
        seeded.push({ ledger: toLedgerObj(paidToLedger), amount: String(remainder), personKey: 'paidTo' })
      }
      // A hired van's charge is owed to the van's owner - the ledger named on
      // its Hire form in Bus Masters, or failing that the one the trip was
      // posted with - so the Credit side is filled in to match the Hire vehicle
      // charges debit seeded below, instead of being picked by hand every time.
      // The booking amount on a van trip is one of two things (see VanRow in
      // Trip Creation): the hire charge on a hired van, or the pay of an opting
      // driver covering our own van. They post differently, so the vehicle
      // decides which - a hired van has no driver of ours, so its amount is
      // never an opting pay, and an own van's amount is never a hire.
      const bookAmt = num(row.booking_amount)
      const vanHiredVeh = van && isHireVehicle(row.bus_no)
      const vanOptingDrv = van && !vanHiredVeh && d1Opting
      const hireAmt = van && !vanHiredVeh ? 0 : bookAmt
      const hirePosted = !!row.voucher_number
      let hireCreditName = ''
      if (vanHiredVeh && hireAmt > 0 && !hirePosted) {
        const vehicle = buses.find((b: any) => String(b.bus_no) === String(row.bus_no))
        const ownerId = String(vehicle?.owner_ledger_id || row.hire_credit_ledger_id || '')
        const owner = ownerId ? findLedger(ownerId) : null
        if (owner) {
          seeded.push({ ledger: toLedgerObj(owner), amount: String(hireAmt) })
          hireCreditName = String(owner.temple_name ?? '')
        }
      }
      setHireCreditSeeded(hireCreditName)
      // An opting driver's pay on our own van is salary: Salaries debited and
      // the shared Opting Driver ledger credited, both for the booking amount.
      // Untagged like the hire rows, so the beta re-price never touches them.
      let optingCreditName = ''
      let optingSalaryRow: LedgerRow | null = null
      if (vanOptingDrv && bookAmt > 0) {
        const optingLedger = findOptingLedger('optingDriver') ?? await ensureOptingLedger('optingDriver')
        const salaryLedger = findExpenseLedger('salary')
        if (optingLedger && salaryLedger) {
          seeded.push({ ledger: toLedgerObj(optingLedger), amount: String(bookAmt) })
          optingSalaryRow = { ledger: toLedgerObj(salaryLedger), amount: String(bookAmt) }
          optingCreditName = String(optingLedger.temple_name ?? '')
        } else {
          toast.error(`Ledger not found: ${!salaryLedger ? EXPENSE_LEDGERS.salary.name : OPTING_LABEL.optingDriver} — pick the ledgers for the opting driver's pay by hand`)
        }
      }
      setVanOptingSeeded(optingCreditName)
      if (seeded.length) setCreditRows(seeded)
      const derivedDebit = buildExpenseRows([], {
        amounts: {
          beta: d1Beta + d2Beta + hBeta + cBeta,
          salary: (d1Opting ? optDrv : 0) + (d2Opting ? optDrv : 0) + (hOpting ? optHlp : 0),
          parking: parkingAmt,
        },
      })
      // A van's hire charge is an expense of this trip like any beta, so it is
      // seeded on the Debit side. This is the only place the hire is posted -
      // Trip Creation just records the amount - so the guard only matters for
      // a trip that already has a voucher, where seeding it again would book
      // the same money twice.
      if (hireAmt > 0 && !hirePosted) {
        const hireLedger = findHireLedger()
        if (hireLedger) {
          const kept = derivedDebit.filter((r) => r.ledger || r.amount)
          setDebitRows([...kept, { ledger: toLedgerObj(hireLedger), amount: String(hireAmt) }])
        } else {
          setDebitRows(derivedDebit)
          toast.error('Ledger not found: Hire vehicle charges — pick the debit ledger for the hire by hand')
        }
      } else if (optingSalaryRow) {
        const kept = derivedDebit.filter((r) => r.ledger || r.amount)
        setDebitRows([...kept, optingSalaryRow])
      } else {
        setDebitRows(derivedDebit)
      }
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
    setHireCreditSeeded('')
    setVanOptingSeeded('')

    const res = await tripsService.getTripModalData({ serviceNo: row.c_number, sudId: 3 })
    const ledgerRows: any[] = res?.data?.[0] ?? []
    const tripRows: any[] = res?.data?.[1] ?? []
    const t = tripRows[0]
    // The saved betas are loaded as they were filed; the rate is fetched only so
    // a seat filled during this edit can be seeded (see seatBetaPatch).
    rateRef.current = null
    Promise.all([
      tripsService.getBeta({ serviceNo: t?.service_no ?? row.service_no }),
      mastersService.getHaltBeta(),
    ]).then(([rateRes, haltRes]) => {
      rateRef.current = {
        halted: String(row.trip_run_status ?? '') === 'Halt',
        haltRate: num(haltRes?.data?.halt_beta),
        rate: rateRes?.data?.[0] ?? null,
      }
    }).catch(() => { rateRef.current = null })

    if (t) {
      // The trip's own row wins over a saved value that is missing or the text
      // 'undefined' (left on older expenses by a Trip Creation edit) - saving
      // such a value back used to wipe the trip's date and service.
      const saved = (v: any, fallback: any) => {
        const x = String(v ?? '').trim()
        return x && x !== 'undefined' ? x : String(fallback ?? '')
      }
      // Only the corrupted text falls back; a value saved blank stays blank.
      const kept = (v: any, fallback: any) => (String(v ?? '') === 'undefined' ? String(fallback ?? '') : (v ?? ''))
      setForm((f) => ({
        ...f,
        trip_creation_id: String(t.trip_creation_id ?? row.trip_creation_id ?? ''),
        trip_date: saved(t.trip_date, row.trip_date).split('T')[0], trip_for: saved(t.trip_for, row.trip_for),
        trip_for_id: saved(t.trip_for_id, row.trip_for_id), service_no_id: saved(t.service_no_id, row.service_no_id),
        bus_no: saved(t.bus_no, row.bus_no), service_no: saved(t.service_no, row.service_no),
        driver1_name: t.driver1_name ?? '', driver1_id: String(t.driver1_id ?? ''),
        driver2_name: kept(t.driver2_name, row.driver2_name), driver2_id: String(t.driver2_id ?? ''),
        helper_name: kept(t.helper_name, row.helper_name), helper_id: String(t.helper_id ?? ''),
        conductor_name: kept(t.conductor_name, row.conductor_name), conductor_id: String(t.conductor_id ?? ''),
        opt_driver1_name: t.opt_driver1_name ?? '', opt_driver1_id: String(t.opt_driver1_id ?? ''),
        opt_driver2_name: t.opt_driver2_name ?? '', opt_driver2_id: String(t.opt_driver2_id ?? ''),
        opt_helper_name: t.opt_helper_name ?? '', opt_helper_id: String(t.opt_helper_id ?? ''),
        paid_to_name: kept(t.paid_to_name, row.paid_to_name), paid_to_id: String(t.paid_to_id ?? ''), paid_to_type: kept(t.paid_to_type, row.paid_to_type),
        driveronebeta: kept(t.driveronebeta, row.optreg), driveronesudsalary: t.driveronesalary ?? '', driveronesalary: String(t.driver1Beta ?? ''),
        drivertwobeta: kept(t.drivertwobeta, row.optreg1), drivertwosudsalary: t.drivertwosalary ?? '', drivertwosalary: String(t.driver2Beta ?? ''),
        helperbeta: kept(t.helperbeta, row.optreg2), helpersudsalary: t.helpersalary ?? '', helpersalary: String(t.helpersudBeta ?? ''),
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
    const optingSeatsOnTrip: Record<OptingSeat, boolean> = {
      driver1: !!t && seatIsOpting(t.driver1_id, t.driver1_name, t.opt_driver1_id),
      driver2: !!t && seatIsOpting(t.driver2_id, t.driver2_name, t.opt_driver2_id),
      helper: !!t && seatIsOpting(t.helper_id, t.helper_name, t.opt_helper_id),
      conductor: !!t && seatIsOpting(t.conductor_id, t.conductor_name, ''),
    }
    for (const key of OPTING_KEYS) {
      if (OPTING_SEATS.some((seat) => OPTING_KEY_FOR_SEAT[seat] === key && optingSeatsOnTrip[seat])) {
        await ensureOptingLedger(key)
      }
    }
    const savedLedgerIds: Partial<Record<PersonKey, string>> = t ? {
      driver1: t.driver1_ledger_id ? String(t.driver1_ledger_id) : ledgerIdForPerson('driver1', String(t.driver1_id ?? '')),
      driver2: t.driver2_ledger_id ? String(t.driver2_ledger_id) : ledgerIdForPerson('driver2', String(t.driver2_id ?? '')),
      helper: t.helper_ledger_id ? String(t.helper_ledger_id) : ledgerIdForPerson('helper', String(t.helper_id ?? '')),
      conductor: t.conductor_ledger_id ? String(t.conductor_ledger_id) : ledgerIdForPerson('conductor', String(t.conductor_id ?? '')),
      ...Object.fromEntries(OPTING_KEYS.map((k) => [k, ledgerIdForPerson(k, '')])),
    } : {}
    const savedPaidToLedgerId = (() => {
      if (!t?.paid_to_id) return ''
      const list = t.paid_to_type === 'driver' ? drivers : t.paid_to_type === 'helper' ? helpers : activeStaff
      const rec = list.find((r: any) => String(r.id) === String(t.paid_to_id))
      return rec?.ledger_id ? String(rec.ledger_id) : ''
    })()
    // A ledger matching a crew member is tagged as that person; the Paid To
    // ledger, when it is nobody on the crew, as Paid To.
    const tagFor = (ledgerId: string): RowTag | undefined =>
      PERSON_KEYS.find((k) => savedLedgerIds[k] && savedLedgerIds[k] === ledgerId)
      ?? (savedPaidToLedgerId && savedPaidToLedgerId === ledgerId ? 'paidTo' : undefined)
    // A crew member who was also the Paid To was posted as one row on their
    // ledger: their own share plus the leftover. It is split back into the two
    // rows the modal works with - the person's share, and the rest as Paid To -
    // so both ticks read as they were saved. The share is the beta saved for
    // that seat; a row no bigger than the share is the person's alone.
    const savedShare: Partial<Record<PersonKey, number>> = t ? {
      driver1: num(t.driver1Beta), driver2: num(t.driver2Beta), helper: num(t.helpersudBeta), conductor: num(t.ConductorsudBeta),
    } : {}
    const splitPersonAndPaidTo = (row: LedgerRow, ledgerId: string): LedgerRow[] => {
      const tag = row.personKey
      if (!tag || tag === 'paidTo' || !(PERSON_KEYS as string[]).includes(tag)) return [row]
      if (!savedPaidToLedgerId || savedPaidToLedgerId !== ledgerId) return [row]
      const share = savedShare[tag as PersonKey] ?? 0
      if (share <= 0 || num(row.amount) <= share) return [row]
      return [
        { ...row, amount: String(share) },
        { ...row, amount: String(num(row.amount) - share), personKey: 'paidTo' },
      ]
    }

    // Same reason the credit rows get tagged: without a tag a saved expense row
    // is indistinguishable from one the user typed, so editing an amount later
    // would leave it stale.
    const expenseTagFor = (ledgerId: string): ExpenseKey | undefined =>
      EXPENSE_KEYS.find((k) => { const l = findExpenseLedger(k); return !!l && String(l.ledger_id) === ledgerId })

    const debit = ledgerRows.filter((r) => r.amount_type === 'Debit Account').map((r) => ({
      ledger: toLedgerObj(r), amount: String(r.amount ?? ''), personKey: expenseTagFor(String(r.ledger_id ?? '')),
    }))
    const credit = ledgerRows.filter((r) => r.amount_type === 'Credit Account').flatMap((r) => {
      const ledgerId = String(r.ledger_id ?? '')
      return splitPersonAndPaidTo({ ledger: toLedgerObj(r), amount: String(r.amount ?? ''), personKey: tagFor(ledgerId) }, ledgerId)
    })
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
  // What ticking the box WOULD hand over, computed exactly as recomputePaidToRow
  // does. Ticking when this is 0 - a trip whose service number carries no betas
  // and no parking, which is every Van service today - added no row and left the
  // box unticked with no explanation, so the two reasons a tick can't take are
  // now stated on the line instead of failing silently.
  const paidToRemainder = PERSON_KEYS
    .filter((k) => !creditRows.some((r) => r.personKey === k))
    .reduce((sum, k) => sum + personAmount(k), 0) + num(form.parking_amt)
  const paidToLedgerMissing = !!form.paid_to_id && !paidToLedgerId()
  // Nothing derived to hand over — a Van service, or a trip whose betas are all
  // zero. The tick has nothing to add in that state, so the line offers to put
  // the payee on the Credit side instead and let the amount be typed: a trip
  // that carries no beta is still a trip somebody gets paid for.
  const paidToNothingDerived = !paidToActive && paidToRemainder <= 0 && !paidToLedgerMissing
  const paidToOnCredit = creditRows.some((r) => r.ledger && paidToLedgerId() && String(r.ledger.ledger_id) === paidToLedgerId())
  const addPaidToCreditRow = () => {
    const ledgerId = paidToLedgerId()
    const ledger = ledgerId ? findLedger(ledgerId) : null
    if (!ledger) { toast.error(`No ledger found for ${form.paid_to_name || 'Paid To'}`); return }
    if (debitRows.some((r) => r.ledger && String(r.ledger.ledger_id) === ledgerId)) {
      toast.error(`"${form.paid_to_name}" is already used in Debit Accounts — the same ledger can't be on both sides`)
      return
    }
    // Untagged on purpose: a tagged 'paidTo' row is derived and the next
    // recompute would drop it again, since the remainder is zero. Untagged it
    // is the user's own row, kept and priced exactly as one added by hand.
    setCreditRows((rows) => {
      const kept = rows.filter((r) => r.ledger || r.amount)
      return [...kept, { ledger: toLedgerObj(ledger), amount: '' }]
    })
    toast.success(`${form.paid_to_name} added to Credit Accounts — enter the amount`)
  }
  // Nobody paid through the books - no crew tick and Paid To off - means there
  // is nothing to post: Submit saves the expense (betas, remarks, status) on its
  // own and no voucher is created, the way a garage job can be quick-completed
  // without one. A credit row the user typed by hand still counts as posting.
  // The trip's own hire charge, read straight off the row the modal opened on.
  // On a van trip the booking amount is the opting driver's pay when the van is
  // ours and its driver is opting (see openAdd); only a hired van's is a hire.
  const vanOptingPay = isVanTrip && !vanHired && isOptingRole('driver1') ? num(modal.row?.booking_amount) : 0
  const hireAmount = isVanTrip && !vanHired ? 0 : num(modal.row?.booking_amount)
  const hirePosted = !!modal.row?.voucher_number
  const anyoneTicked = PERSON_KEYS.some((k) => isPersonChecked(k))
  const noVoucher = !anyoneTicked && !paidToActive && !creditRows.some((r) => r.ledger && num(r.amount) > 0)
  // Unticking hands the leftover back to the user to place manually; reticking
  // re-derives it. Mirrors how each crew checkbox adds/removes its own row.
  const togglePaidTo = () => {
    const nextOptedOut = !paidToOptedOut
    setPaidToOptedOut(nextOptedOut)
    // Not silent when ticking ON: if the Paid To person has no ledger, that is
    // the whole reason the tick doesn't take and the user needs to hear it.
    setCreditRows((rows) => recomputePaidToRow(rows, nextOptedOut, nextOptedOut))
  }

  // ── Totals ───────────────────────────────────────────────────────────────
  // Same split as the Debit side: Beta is the four per-role betas (plus parking,
  // which has no payee of its own); Salary is the opting premium, so a trip with
  // no opting seat correctly reads ₹0 — the caption under the box says so.
  const totalSalary = expenseAmount('salary')
  const totalBeta = expenseAmount('beta') + num(form.parking_amt)
  const validDebit = debitRows.filter((r) => r.ledger && num(r.amount) > 0)
  const validCredit = creditRows.filter((r) => r.ledger && num(r.amount) > 0)
  // What is actually posted: a crew member who is also the Paid To has two rows
  // in the modal but one credit on the voucher, so their rows are folded here.
  // The same fold is what the duplicate check looks at, so the pair does not
  // read as a duplicate while two rows the user typed on one ledger still do.
  const creditForPost = mergeSameLedgerRows(validCredit)
  const debitTotal = validDebit.reduce((s, r) => s + num(r.amount), 0)
  const creditTotal = creditForPost.reduce((s, r) => s + num(r.amount), 0)
  const balanced = debitTotal > 0 && Math.round(debitTotal * 100) === Math.round(creditTotal * 100)
  // What the trip cost: the balanced debit total when a voucher is posted, and
  // the crew pay plus parking when nothing is posted, so Trip Reports still
  // shows the expense either way.
  const expenseTotal = noVoucher ? totalSalary + totalBeta : debitTotal

  const buildExpenseDetails = () => ({
    driveronebeta: form.driveronebeta, driveronesalary: form.driveronesalary, driveronesudsalary: form.driveronesudsalary, driverone_payment: '',
    drivertwobeta: form.drivertwobeta, drivertwosalary: form.drivertwosalary, drivertwosudsalary: form.drivertwosudsalary, drivertwo_payment: '',
    helperbeta: form.helperbeta, helpersalary: form.helpersalary, helpersudsalary: form.helpersudsalary, helper_payment: '',
    conductorsalary: form.conductorsalary,
    grandtotal: expenseTotal, bus_no: form.bus_no, service_no: form.service_no,
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
    // No ledger rows when nothing is posted (see noVoucher): the server then
    // files the expense and skips the voucher.
    patientsTstdts: noVoucher ? [] : validDebit.map((r) => ({ d_test_name: r.ledger, d_test_amount: num(r.amount), account_name: 'Debit Account' })),
    credit: noVoucher ? [] : creditForPost.map((r) => ({ credit_name: r.ledger, credit_amount: num(r.amount), account_name: 'Credit Account' })),
    // total_amount is what Trip Reports shows as "Total Exp" and Admin
    // Approvals as "Total Amount", so it is the actual balanced debit total —
    // not the legacy salary + beta + debit sum, which counted the crew pay twice.
    total_salary: totalSalary, total_beta: totalBeta,
    total_salary_beta: totalSalary + totalBeta, total_amount: expenseTotal,
    trip_for_id: form.trip_for_id, service_no_id: form.service_no_id, remarks: form.remarks,
  })

  const buildEditPayload = () => ({
    expensedetails: buildExpenseDetails(),
    patientsTstdts: noVoucher ? [] : validDebit.map((r) => ({ d_test_name: r.ledger, d_test_amount: num(r.amount), account_name: 'Debit Account' })),
    credit: noVoucher ? [] : creditForPost.map((r) => ({ credit_name: r.ledger, credit_amount: num(r.amount), account_name: 'Credit Account' })),
    total_salary: totalSalary, total_beta: totalBeta,
    total_salary_beta: totalSalary + totalBeta, total_amount: expenseTotal,
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
    // A van trip's Amount is the hire charge or the opting driver's pay, which
    // is exactly what this voucher posts, so the trip follows the posted total -
    // otherwise records kept showing 1200 for a hire re-filed at 1500.
    ...(isVanTrip && !noVoucher ? { booking_amount: String(debitTotal) } : {}),
    // Tells the server this save comes with its own voucher, so the Trip
    // Creation lock on a filed van trip (van, driver, amount) does not apply.
    source: 'expense',
    updatedby_id: localStorage.getItem('user_id'), updatedby_name: localStorage.getItem('usr_nm'), updated_date: nowStr(),
  })

  const validate = () => {
    if (!form.bus_no) { toast.error('Bus Number is required'); return false }
    // Only a held seat is charged, so only a held seat needs its beta - on a
    // running trip and a halted one alike. An empty seat is not an error.
    // A van trip carries no beta or opting salary, so neither check applies.
    if (!isVanTrip && OPTING_SEATS.some((seat) => seatFilled(seat) && seatBeta(seat) <= 0)) {
      toast.error(isHalt ? 'Enter the halt beta for each assigned crew member' : 'Enter the beta for each crew member on the trip')
      return false
    }
    // The conductor is left out: no OPT-Conductor Salary exists to enter.
    if (!isVanTrip && OPTING_SEATS.some((seat) => seat !== 'conductor' && isOptingRole(seat) && seatSalary(seat) <= 0)) {
      toast.error('Enter the opting salary for each seat marked Opting'); return false
    }
    // Nothing is posted when nobody is paid through the books, so the ledger
    // checks do not apply - there are no rows to balance.
    if (noVoucher) return true
    if (validDebit.length === 0) { toast.error('Add at least one debit ledger entry'); return false }
    if (validCredit.length === 0) { toast.error('Add at least one credit ledger entry'); return false }
    const debitIds = validDebit.map((r) => String(r.ledger!.ledger_id))
    const creditIds = creditForPost.map((r) => String(r.ledger!.ledger_id))
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
    onSuccess: (res) => { if (res?.status === 200) { toast.success('Expense updated'); closeModal(); refetch() } else toast.error(res?.message || 'Failed to update expense') },
    onError: () => toast.error('Server error'),
  })
  const { mutate: updateTripMutate, isPending: updatingTrip } = useMutation({
    mutationFn: () => tripsService.updateTrip(buildUpdateTripPayload()),
    onSuccess: (res) => {
      if (res?.status !== 200) { toast.error(res?.msg || 'Failed to update trip details'); return }
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
    onSuccess: (res) => { if (res?.status === 200) { toast.success('Expense deleted'); refetch() } else toast.error(res?.message || 'Failed to delete') },
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
      toast.error(Number(row.voucher_status) === 1 && row.admin_status !== 1 && row.admin_status !== 2
        ? `Voucher ${row.voucher_number ?? ''} is already approved — reopen it in Voucher Approvals before editing this expense`
        : 'This expense is already approved/rejected and can no longer be edited')
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
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  // A crew member's name with, once the expense is filed, what it pays them:
  // beta, and the opting salary on top for an opting seat.
  const personCell = (name: any, beta: any, opt: any, opting: boolean, filed: boolean, muted = false) => {
    const label = String(name ?? '').trim()
    if (!label) return <span className="text-slate-300">—</span>
    const b = num(beta), o = opting ? num(opt) : 0
    return (
      <div>
        <div className={muted ? 'text-slate-500 text-sm' : 'font-medium'}>{label}</div>
        {filed && (b > 0 || o > 0) && (
          <div className="text-xs font-semibold text-slate-600">
            ₹{(b + o).toLocaleString('en-IN')}
            {o > 0 && <span className="text-slate-400 font-normal"> ({b.toLocaleString('en-IN')} + {o.toLocaleString('en-IN')} opting)</span>}
          </div>
        )}
      </div>
    )
  }
  const columns: Column[] = [
    { label: 'Sl No', key: '_sl', align: 'center', render: (_v, _r, i) => i + 1 },
    {
      label: 'Ref No', key: 'c_number',
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
    { label: 'Date', key: 'trip_date', render: (v) => formatDate(v) },
    {
      // The run status set on Trip Creation. A halted trip is priced on the
      // Halt Beta rather than the running betas, so it is worth seeing before
      // the expense is opened. Rows from before the column existed ran.
      label: 'Status', key: 'trip_run_status', filterable: true,
      filterOptions: [{ label: 'Running', value: 'Running' }, { label: 'Full Trip', value: 'Full Trip' }, { label: 'Halt', value: 'Halt' }],
      render: (v) => <Badge variant={v === 'Halt' ? 'danger' : v === 'Full Trip' ? 'info' : 'success'}>{String(v || 'Running')}</Badge>,
    },
    { label: 'Bus No', key: 'bus_no', filterable: true },
    { label: 'Service No', key: 'service_no', filterable: true },
    // Up/Down is set on the service route (Masters > Service Routes).
    { label: 'Up/Down', key: 'up_down', filterable: true, render: (v) => v ? String(v) : <span className="text-slate-300">—</span> },
    // Each person with what the filed expense pays them beneath the name: the
    // beta, plus the opting salary for an opting seat. Nothing beneath until an
    // expense is filed.
    { label: 'Driver 1', key: 'driver1_name', render: (v, r: any) => personCell(v, r.exp_driver1_beta, r.exp_driver1_opt, seatIsOpting(r.driver1_id, r.driver1_name, r.opt_driver1_id), !!r.exp_row_id) },
    { label: 'Driver 2', key: 'driver2_name', render: (v, r: any) => personCell(v, r.exp_driver2_beta, r.exp_driver2_opt, seatIsOpting(r.driver2_id, r.driver2_name, r.opt_driver2_id), !!r.exp_row_id, true) },
    { label: 'Helper', key: 'helper_name', render: (v, r: any) => personCell(v, r.exp_helper_beta, r.exp_helper_opt, seatIsOpting(r.helper_id, r.helper_name, r.opt_helper_id), !!r.exp_row_id, true) },
    { label: 'Conductor', key: 'conductor_name', filterable: true, render: (v, r: any) => personCell(v, r.exp_conductor_beta, 0, false, !!r.exp_row_id, true) },
    // Others is the person the trip is paid to (Trip Creation's Paid To).
    { label: 'Others', key: 'paid_to_name', filterable: true, render: (v) => String(v ?? '').trim() ? <span className="text-sm">{String(v)}</span> : <span className="text-slate-300">—</span> },
    {
      // trip_created.grantotal is a text column and comes back as the STRING
      // "0" on every trip that has no expense filed yet — truthy, so a plain
      // `v ?` guard rendered ₹0 on all of them instead of a dash. Compare the
      // number.
      label: 'Amount', key: 'grantotal', align: 'right',
      render: (v) => num(v) > 0
        ? <span className="font-bold text-slate-900">₹{num(v).toLocaleString('en-IN')}</span>
        : <span className="text-slate-300">—</span>,
    },
    {
      label: 'Approvals', key: 'admin_status',
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

  // The Van tab shows what a van trip was created with - line code, pick/drop,
  // the one driver and whom it is paid to - in place of the bus crew columns.
  // The shared columns are reused.
  const col = (key: string): Column => columns.find((c) => c.key === key)!
  const vanColumns: Column[] = [
    col('_sl'), col('c_number'), col('trip_date'), col('trip_run_status'),
    {
      label: 'Van No', key: 'bus_no', filterable: true,
      render: (v) => <span className={`font-semibold ${isHireVehicle(String(v ?? '')) ? 'text-amber-700' : ''}`}>{String(v ?? '—')}</span>,
    },
    { label: 'Line Code', key: 'line_code', filterable: true, render: (v) => v ? String(v) : <span className="text-slate-300">—</span> },
    // Pick/Drop is set on the van's service route (Masters > Service Routes).
    { label: 'Pick/Drop', key: 'pick_drop', filterable: true, render: (v) => v ? <span className="capitalize">{String(v)}</span> : <span className="text-slate-300">—</span> },
    {
      label: 'Driver', key: 'driver1_name', filterable: true,
      render: (v, r: any) => (
        <div>
          <span className="font-medium">{String(v || (isHireVehicle(String(r.bus_no ?? '')) ? 'Hired' : '—'))}</span>
          {r.opt_driver1_name && <div className="text-xs text-slate-500">{r.opt_driver1_name}{r.opt_driver1_mobile ? ` · ${r.opt_driver1_mobile}` : ''}</div>}
        </div>
      ),
    },
    {
      // Others is whom a van trip is paid to - the hirer entered on Trip
      // Creation, which is the debit side of its voucher.
      label: 'Others', key: 'hirer_name', filterable: true,
      render: (v, r: any) => {
        const name = String(v ?? '').trim() || String(r.paid_to_name ?? '').trim()
        if (!name) return <span className="text-slate-300">—</span>
        return (
          <div>
            <div className="text-sm">{name}</div>
            {r.phone_number && <div className="text-xs text-slate-400">{r.phone_number}</div>}
          </div>
        )
      },
    },
    {
      // The van's booking amount (hire charge / opting driver pay), with the
      // filed expense beneath once there is one.
      label: 'Amount', key: 'booking_amount', align: 'right',
      render: (v, r: any) => {
        const booked = num(v), filed = num(r.grantotal)
        if (!booked && !filed) return <span className="text-slate-300">—</span>
        return (
          <div>
            {booked > 0 && <div><span className="text-sm font-bold text-slate-900">₹{booked.toLocaleString('en-IN')}</span><div className="text-[10px] text-slate-400">{vanAmountLabel(r)}</div></div>}
            {filed > 0 && <div className="text-xs text-slate-600 mt-0.5">Expense ₹{filed.toLocaleString('en-IN')}</div>}
          </div>
        )
      },
    },
    col('admin_status'),
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

      <div className="flex items-center gap-3 flex-wrap">
        <TopNavTabs tabs={['Bus', 'Van']} activeTab={vehicleTab} onChange={(t) => { setVehicleTab(t); setColumnFilters({}) }} counts={vehicleCounts} className="mb-0" />
        <TopNavTabs tabs={['All', 'Not Filed', 'Filed']} activeTab={filedTab} onChange={setFiledTab} counts={filedCounts} className="mb-0" />
      </div>

      <DataTable
        title={`${filedTab === 'All' ? 'Trip Expenses' : filedTab === 'Filed' ? 'Expenses Filed' : 'Awaiting an Expense'} (${filteredTrips.length})`}
        columns={vehicleTab === 'Van' ? vanColumns : columns}
        data={filteredTrips}
        loading={isLoading}
        onAction={handleAction}
        actions={['edit', 'view', 'delete']}
        icon={<Receipt className="w-5 h-5 text-red-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
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
                  {/* The "Pay X" tick sits under the dropdown that picked X, so
                      the payee, the amount and the tick read as one control. */}
                  {/* Readonly trip info */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <div><Label>Trip Date</Label><Input value={formatDate(form.trip_date)} readOnly disabled /></div>
                    <div><Label>Trip For</Label><Input value={form.trip_for} readOnly disabled /></div>
                    <div><Label>Service Number</Label><Input value={form.service_no} readOnly disabled /></div>
                    <div>
                      <Label>{isVanTrip ? 'Van Number' : 'Bus Number'}</Label>
                      <Select value={form.bus_no} onChange={(e) => {
                        const v = e.target.value
                        // Moving a van trip onto a hired van drops our driver: no
                        // driver of ours is on it (same rule as the Trip Creation grid).
                        const dropDriver = isVanTrip && isHireVehicle(v)
                        setForm((f) => ({
                          ...f, bus_no: v,
                          ...(dropDriver ? { driver1_id: '', driver1_name: '', opt_driver1_id: '', opt_driver1_name: '', ...seatBetaPatch('driver1', false) } : {}),
                        }))
                      }}>
                        <option value="">— Select —</option>
                        {vehicleOptions.map((b: any) => <option key={b.id} value={b.bus_no}>{b.bus_no}{isVanTrip && isHireVehicle(b.bus_no) ? ' · Hired' : ''}</option>)}
                      </Select>
                      {vanHired && <p className="text-[11px] font-bold text-amber-700 mt-1">Hired van — no driver of ours; the hire charge is what this trip costs</p>}
                    </div>
                    {/* A hired van has no driver of ours; a van trip has one
                        driver and no helper or conductor seat at all. */}
                    {!vanHired && (
                    <div>
                      <Label>Driver1 Name</Label>
                      <Select value={isOptingRole('driver1') ? OPTING_VALUE : form.driver1_id} onChange={(e) => {
                        if (e.target.value === OPTING_VALUE) { setForm((f) => ({ ...f, driver1_id: '', driver1_name: optingNameForSeat('driver1'), opt_driver1_id: '', opt_driver1_name: '', ...seatBetaPatch('driver1', true) })); return }
                        const d = drivers.find((dr: any) => String(dr.id) === e.target.value)
                        setForm((f) => ({ ...f, driver1_id: e.target.value, driver1_name: d?.nickname || d?.driver_name || '', opt_driver1_id: '', opt_driver1_name: '', ...seatBetaPatch('driver1', !!e.target.value) }))
                      }}>
                        <option value="">— Select —</option>
                        <option value={OPTING_VALUE}>{optingNameForSeat('driver1')}</option>
                        {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.nickname || d.driver_name}</option>)}
                      </Select>
                      {isVanTrip && isOptingRole('driver1') && (modal.row?.opt_driver1_name || modal.row?.opt_driver1_mobile) && (
                        <p className="text-[11px] font-semibold text-slate-500 mt-1">{String(modal.row?.opt_driver1_name ?? '')}{modal.row?.opt_driver1_mobile ? ` · ${modal.row.opt_driver1_mobile}` : ''}</p>
                      )}
                      {seatFields('driver1')}
                    </div>
                    )}
                    {!isVanTrip && (<>
                    <div>
                      <Label>Driver2 Name</Label>
                      <Select value={isOptingRole('driver2') ? OPTING_VALUE : form.driver2_id} onChange={(e) => {
                        if (e.target.value === OPTING_VALUE) { setForm((f) => ({ ...f, driver2_id: '', driver2_name: optingNameForSeat('driver2'), opt_driver2_id: '', opt_driver2_name: '', ...seatBetaPatch('driver2', true) })); return }
                        const d = drivers.find((dr: any) => String(dr.id) === e.target.value)
                        setForm((f) => ({ ...f, driver2_id: e.target.value, driver2_name: d?.nickname || d?.driver_name || '', opt_driver2_id: '', opt_driver2_name: '', ...seatBetaPatch('driver2', !!e.target.value) }))
                      }}>
                        <option value="">— Select —</option>
                        <option value={OPTING_VALUE}>{optingNameForSeat('driver1')}</option>
                        {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.nickname || d.driver_name}</option>)}
                      </Select>
                      {seatFields('driver2')}
                    </div>
                    <div>
                      <Label>Helper Name</Label>
                      <Select value={isOptingRole('helper') ? OPTING_VALUE : form.helper_id} onChange={(e) => {
                        if (e.target.value === OPTING_VALUE) { setForm((f) => ({ ...f, helper_id: '', helper_name: optingNameForSeat('helper'), opt_helper_id: '', opt_helper_name: '', ...seatBetaPatch('helper', true) })); return }
                        const h = helpers.find((x: any) => String(x.id) === e.target.value)
                        setForm((f) => ({ ...f, helper_id: e.target.value, helper_name: h?.helper_name ?? h?.nickname ?? '', opt_helper_id: '', opt_helper_name: '', ...seatBetaPatch('helper', !!e.target.value) }))
                      }}>
                        <option value="">— Select —</option>
                        <option value={OPTING_VALUE}>{optingNameForSeat('helper')}</option>
                        {helpers.map((h: any) => <option key={h.id} value={h.id}>{h.helper_name ?? h.nickname}</option>)}
                      </Select>
                      {seatFields('helper')}
                    </div>
                    <div>
                      <Label>Conductor Name</Label>
                      <Select value={isOptingRole('conductor') ? OPTING_VALUE : form.conductor_id} onChange={(e) => {
                        if (e.target.value === OPTING_VALUE) { setForm((f) => ({ ...f, conductor_id: '', conductor_name: optingNameForSeat('conductor'), ...seatBetaPatch('conductor', true) })); return }
                        const c = conductors.find((x: any) => String(x.id) === e.target.value)
                        setForm((f) => ({ ...f, conductor_id: e.target.value, conductor_name: c?.fullName || c?.nickName || '', ...seatBetaPatch('conductor', !!e.target.value) }))
                      }}>
                        <option value="">— Select —</option>
                        <option value={OPTING_VALUE}>{optingNameForSeat('conductor')}</option>
                        {conductors.map((c: any) => <option key={c.id} value={c.id}>{c.fullName || c.nickName}</option>)}
                      </Select>
                      {seatFields('conductor')}
                    </div>
                    </>)}
                    {/* Paid To is the bus crew's leftover; a van has none. A van
                        shows instead what it was created with. */}
                    {!isVanTrip && (
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
                          {/* Nothing derived to hand over: offer to put the payee on the
                              Credit side and let the amount be typed, rather than a dead
                              tick. A Van trip has no betas at all, so this is its only
                              way through this screen. */}
                          {paidToNothingDerived ? (
                            <>
                              <button
                                type="button" onClick={addPaidToCreditRow} disabled={paidToOnCredit}
                                className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:hover:bg-emerald-50"
                              >
                                <PlusCircle className="w-3.5 h-3.5" /> Pay {form.paid_to_name}
                              </button>
                              <p className="text-[11px] font-bold text-slate-400 pl-1 mt-1">
                                {paidToOnCredit
                                  ? `${form.paid_to_name} is on the Credit side — set the amount there`
                                  : anyoneTicked
                                    ? 'Every share is ticked — add them to Credit Accounts to pay anything more'
                                    : 'This trip carries no beta or parking — add them to Credit Accounts and enter the amount'}
                              </p>
                            </>
                          ) : (
                            <>
                              <label className={`flex items-center gap-2 text-xs font-semibold select-none ${paidToLedgerMissing ? 'text-slate-400 cursor-not-allowed' : 'text-slate-600 cursor-pointer'}`}>
                                <input
                                  type="checkbox" checked={paidToActive} onChange={togglePaidTo}
                                  disabled={paidToLedgerMissing}
                                  title={paidToLedgerMissing
                                    ? `${form.paid_to_name} has no ledger, so nothing can be posted to them`
                                    : 'Receives every share left unticked below — untick to place that leftover on another ledger yourself'}
                                  className="w-4 h-4 rounded accent-blue-600 disabled:opacity-40"
                                />
                                Pay {form.paid_to_name}
                              </label>
                              <p className="text-[11px] font-bold text-slate-400 pl-6">
                                {paidToActive
                                  ? `₹${paidToRowAmount.toLocaleString('en-IN')}`
                                  : paidToLedgerMissing
                                    ? `No ledger for ${form.paid_to_name} — nothing can be posted to them`
                                    : paidToOptedOut
                                      ? (noVoucher ? 'Off — nobody is paid through the books, so Submit saves without a voucher' : 'Off — assign the leftover yourself in Credit Accounts')
                                      : `₹${paidToRemainder.toLocaleString('en-IN')} available — tick to pay it to ${form.paid_to_name}`}
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    )}
                    {isVanTrip && (<>
                      <div><Label>Line Code</Label><Input value={String(modal.row?.line_code ?? '')} readOnly disabled /></div>
                      <div><Label>Status</Label><Input value={String(modal.row?.trip_run_status || 'Running')} readOnly disabled /></div>
                      {/* Only a hired van has a hirer, and only a hired van or an
                          opting driver carries an amount; an own van shows neither. */}
                      {vanHired && (<>
                        <div><Label>Hirer</Label><Input value={String(modal.row?.hirer_name ?? '')} readOnly disabled /></div>
                        <div><Label>Hirer Mobile</Label><Input value={String(modal.row?.phone_number ?? '')} readOnly disabled /></div>
                      </>)}
                      {num(modal.row?.booking_amount) > 0 && (
                        <div>
                          <Label>{vanAmountLabel(modal.row)}</Label>
                          <Input value={num(modal.row?.booking_amount).toLocaleString('en-IN')} readOnly disabled />
                        </div>
                      )}
                    </>)}
                  </div>

                  {/* A hired van's charge: either already on the books from the
                      trip's own Journal, or seeded onto the Debit side above for
                      this entry to carry. Either way it is stated, so a trip with
                      no betas never reads as a trip with nothing in it. */}
                  {hireAmount > 0 && (
                    <div className={`rounded-xl border px-4 py-2.5 ${hirePosted ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
                      <p className={`text-xs font-bold ${hirePosted ? 'text-emerald-700' : 'text-amber-700'}`}>
                        Hire charge ₹{hireAmount.toLocaleString('en-IN')}
                        {hirePosted && <span className="font-mono font-semibold"> · {modal.row.voucher_number}</span>}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {hirePosted
                          ? `Already on the books under this trip's voucher: ${modal.row.hire_debit_ledger_name ?? 'Hire vehicle charges'} debited, ${modal.row.hire_credit_ledger_name ?? 'the owner ledger'} credited — it is not filed a second time.`
                          : hireCreditSeeded
                            ? `Filled in for you: Hire vehicle charges debited, ${hireCreditSeeded} credited — change either side below if that is not right.`
                            : 'Seeded on the Debit side as Hire vehicle charges — pick who it is owed to on the Credit side.'}
                      </p>
                    </div>
                  )}

                  {/* A filed van expense whose posted total no longer matches the trip's
                      Amount (the Amount was changed on Trip Creation before that was
                      locked): said out loud, so the voucher is corrected on purpose. */}
                  {modal.mode === 'edit' && isVanTrip && !noVoucher && num(modal.row?.booking_amount) > 0
                    && Math.round(num(modal.row?.booking_amount) * 100) !== Math.round(debitTotal * 100) && (
                    <div className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-2.5">
                      <p className="text-xs font-bold text-red-700">Trip amount ₹{num(modal.row?.booking_amount).toLocaleString('en-IN')} does not match this voucher (₹{debitTotal.toLocaleString('en-IN')})</p>
                      <p className="text-[11px] text-slate-500">Set the ledger amounts below to the right figure — saving updates the trip's amount to the voucher total.</p>
                    </div>
                  )}
                  {/* An opting driver's pay on our own van, stated the same way. */}
                  {vanOptingPay > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-2.5">
                      <p className="text-xs font-bold text-amber-700">Opting driver pay ₹{vanOptingPay.toLocaleString('en-IN')}</p>
                      <p className="text-[11px] text-slate-500">
                        {vanOptingSeeded
                          ? `Filled in for you: Salaries debited, ${vanOptingSeeded} credited — change either side below if that is not right.`
                          : 'Entered on Trip Creation as the opting driver\'s pay — debit Salaries and credit Opting Driver for it below.'}
                      </p>
                    </div>
                  )}
                  {isHalt && (
                    <div className="rounded-xl border border-red-200 bg-red-50/60 px-4 py-2.5">
                      <p className="text-xs font-bold text-red-700">Service Halted</p>
                      <p className="text-[11px] text-slate-500">
                        Each assigned crew member is paid the company-wide Halt Beta instead of their running beta.
                      </p>
                    </div>
                  )}
                  {/* Parking is the one amount with no crew seat behind it — every
                      other beta now lives beside the dropdown that picked the
                      person it pays. */}
                  {Number(form.parking_amt) > 0 && (
                    <div className="max-w-xs pt-2 border-t border-slate-100">
                      <Label>Parking (₹)</Label>
                      <Input type="number" value={form.parking_amt} onChange={(e) => setForm((f) => ({ ...f, parking_amt: e.target.value }))} />
                      <p className="text-[11px] text-slate-400 mt-1">No individual payee — always folds into Paid To.</p>
                    </div>
                  )}

                  {/* Remarks */}
                  <div>
                    <Label>Remarks</Label>
                    <textarea rows={2} placeholder="Enter remarks" value={form.remarks}
                      onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
                  </div>

                  {/* Totals — a van trip has no beta or salary, so the boxes come away. */}
                  {!isVanTrip && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 p-3 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase">Total Salary</p>
                      <p className="text-lg font-extrabold text-slate-800">₹{totalSalary.toLocaleString('en-IN')}</p>
                      <p className="text-[11px] text-slate-400">
                        {anyoneOpting ? 'Opting seats only — OPT-Driver / OPT-Helper Salary from the service number' : 'No one opting on this trip'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 p-3 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase">Total Beta</p>
                      <p className="text-lg font-extrabold text-slate-800">₹{totalBeta.toLocaleString('en-IN')}</p>
                      <p className="text-[11px] text-slate-400">
                        {isHalt ? 'Halt beta per assigned crew member' : 'Driver1 + Driver2 + Helper + Conductor beta'}{num(form.parking_amt) > 0 ? ` + parking ₹${num(form.parking_amt).toLocaleString('en-IN')}` : ''}
                      </p>
                    </div>
                  </div>
                  )}

                  {noVoucher ? (
                    /* Nothing to post: the ledger sections come away and Submit
                       saves the expense on its own. */
                    <div className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-amber-800">No voucher</span>
                        <span className="text-xs text-amber-600 bg-amber-100 rounded-full px-2 py-0.5 font-medium">Nobody paid through the books</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        No crew member is ticked and Paid To is off, so Submit saves the betas and remarks without posting any ledger entry.
                        Tick a person, or turn Paid To on, to post a voucher instead.
                        {modal.mode === 'edit' && modal.row?.voucher_number ? ` The voucher posted earlier for this trip (${modal.row.voucher_number}) will be removed.` : ''}
                      </p>
                    </div>
                  ) : (
                  <>
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
                              {/* A person who is also the Paid To has two rows on one
                                  ledger; the tag says which is which. */}
                              {row.personKey === 'paidTo' ? (
                                <p className="text-[10px] font-semibold text-slate-400 pl-1 mt-0.5">Paid To · leftover</p>
                              ) : row.personKey && (PERSON_KEYS as string[]).includes(row.personKey) ? (
                                <p className="text-[10px] font-semibold text-slate-400 pl-1 mt-0.5">Pay {personName(row.personKey as PersonKey)}</p>
                              ) : null}
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
                  </>
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
                          {new Date(h.changed_at).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} · {h.changed_by_name || 'Unknown'}
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
        {viewModal.open && (() => { const viewIsVan = String(viewModal.row?.vehicle_type ?? '').toLowerCase() === 'van'; const viewHired = viewIsVan && isHireVehicle(String(viewModal.row?.bus_no ?? '')); return (
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
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Trip Date</p><p className="text-sm font-medium">{formatDate(viewModal.row?.trip_date)}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">{viewIsVan ? 'Van No' : 'Bus No'}</p><p className="text-sm font-medium">{viewModal.row?.bus_no}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Service No</p><p className="text-sm font-medium">{viewModal.row?.service_no}</p></div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">{viewIsVan ? 'Driver' : 'Driver 1'}</p><p className="text-sm font-medium flex items-center gap-1.5">
                    {!viewHired && <input type="checkbox" readOnly checked={viewPersonPaid('driver1', String(viewModal.row?.driver1_id ?? ''))} className="w-3.5 h-3.5 rounded accent-blue-600 pointer-events-none" />}
                    {viewModal.row?.driver1_name || (viewHired ? 'Hired' : '—')}</p>
                    {/* Who the opting driver actually was - the ledger is shared by every opting driver. */}
                    {viewModal.row?.opt_driver1_name && <p className="text-[11px] font-semibold text-slate-500 pl-5">{String(viewModal.row.opt_driver1_name)}{viewModal.row?.opt_driver1_mobile ? ` · ${viewModal.row.opt_driver1_mobile}` : ''}</p>}
                    {viewPersonPaid('driver1', String(viewModal.row?.driver1_id ?? '')) && <p className="text-[11px] font-bold text-slate-400 pl-5">₹{viewPersonAmount('driver1', String(viewModal.row?.driver1_id ?? '')).toLocaleString('en-IN')}</p>}
                  </div>
                  {/* A van has one driver and no Paid To; it shows what it was created with instead. */}
                  {!viewIsVan && (<>
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
                    {viewOptingKeys(viewModal.row).map((key) => (
                      <React.Fragment key={key}>
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 pt-1">
                          <input type="checkbox" readOnly checked={viewPersonPaid(key, '')} className="w-3.5 h-3.5 rounded accent-amber-600 pointer-events-none" />
                          {OPTING_LABEL[key]}
                        </label>
                        {viewPersonPaid(key, '') && <p className="text-[11px] font-bold text-slate-400 pl-5">₹{viewPersonAmount(key, '').toLocaleString('en-IN')}</p>}
                      </React.Fragment>
                    ))}
                  </div>
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">Paid To</p><p className="text-sm font-medium">{viewModal.row?.paid_to_name || '—'}</p></div>
                  </>)}
                  {viewIsVan && (<>
                    <div><p className="text-[10px] font-bold uppercase text-slate-400">Line Code</p><p className="text-sm font-medium">{viewModal.row?.line_code || '—'}</p></div>
                    <div><p className="text-[10px] font-bold uppercase text-slate-400">Status</p><p className="text-sm font-medium">{viewModal.row?.trip_run_status || 'Running'}</p></div>
                    {viewHired && <div><p className="text-[10px] font-bold uppercase text-slate-400">Hirer</p><p className="text-sm font-medium">{viewModal.row?.hirer_name || '—'}</p>{viewModal.row?.phone_number && <p className="text-[11px] text-slate-400">{viewModal.row.phone_number}</p>}</div>}
                    {num(viewModal.row?.booking_amount) > 0 && <div><p className="text-[10px] font-bold uppercase text-slate-400">{vanAmountLabel(viewModal.row)}</p><p className="text-sm font-medium">₹{num(viewModal.row?.booking_amount).toLocaleString('en-IN')}</p></div>}
                    {viewModal.row?.voucher_number && <div><p className="text-[10px] font-bold uppercase text-slate-400">Hire Voucher</p><p className="text-sm font-medium">{viewModal.row.voucher_number}</p>{(viewModal.row.hire_debit_ledger_name || viewModal.row.hire_credit_ledger_name) && <p className="text-[11px] text-slate-400">{String(viewModal.row.hire_debit_ledger_name ?? '—')} → {String(viewModal.row.hire_credit_ledger_name ?? '—')}</p>}</div>}
                  </>)}
                  <div><p className="text-[10px] font-bold uppercase text-slate-400">{viewIsVan ? 'Expense Filed' : 'Amount'}</p><p className="text-sm font-bold text-slate-900">₹{Number(viewModal.row?.grantotal ?? 0).toLocaleString('en-IN')}</p></div>
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
                            <span>{item.expensives}<LedgerGroupTag group={ledgerGroupOf({ id: (item as any).ledger_id, name: item.expensives })} /></span><span className="font-semibold">₹{item.amount}</span>
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
                            <span>{item.expensives}<LedgerGroupTag group={ledgerGroupOf({ id: (item as any).ledger_id, name: item.expensives })} /></span><span className="font-semibold">₹{item.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        ) })()}
      </AnimatePresence>
    </motion.div>
  )
}
