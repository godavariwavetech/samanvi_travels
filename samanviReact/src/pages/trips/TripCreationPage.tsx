import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Map, Save, X, Plus, CalendarDays, Trash2, Pencil } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, Select, DataTable, Badge, PageHeader, TopNavTabs, MasterListPicker, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { tripsService } from '@/services/trips.service'
import { mastersService } from '@/services/masters.service'
import { accountingService } from '@/services/accounting.service'
import { balStr, balCls, signedBalance } from '@/lib/ledgerFormat'

const today = new Date().toISOString().split('T')[0]

type TripRunStatus = 'Running' | 'Halt' | 'Full Trip'

type GridRow = {
  status: TripRunStatus
  bus_no: string
  driver1_id: string; driver1_name: string; driver1_checked: boolean
  opt_driver1_id: string; opt_driver1_name: string
  driver2_id: string; driver2_name: string; driver2_checked: boolean
  opt_driver2_id: string; opt_driver2_name: string
  helper_id: string; helper_name: string; helper_checked: boolean
  opt_helper_id: string; opt_helper_name: string
  conductor_id: string; conductor_name: string; conductor_checked: boolean
  paid_to_id: string; paid_to_name: string; paid_to_type: string; paid_to_ledger_id: string
  // Checking this means the trip genuinely has no Paid To recipient (e.g. every
  // role is already paid_direct) — it clears and locks the Paid To picker rather
  // than leaving it merely blank-and-unfilled, which reads the same as "not
  // gotten to yet". Separate from the auto-disable below (all three checked).
  paid_to_skip: boolean
  remarks: string
}

// Van trip rows are added manually (no pre-defined roster like the Bus grid) —
// each one is an ad-hoc charter booking for a customer, not a driver/staff.
type VanRow = {
  status: TripRunStatus
  line_code: string
  bus_no: string
  driver_id: string; driver_name: string
  hirer_name: string; phone_number: string
  // Charged only when the vehicle is a hired one — an own van costs nothing to
  // hire, so the field is inactive there rather than silently accepting a number.
  amount: string
  remarks: string
}

// Built per render rather than fixed, so a created trip can be coloured by
// whether its vehicle was hired — that fact lives in Bus Masters, not on the
// trip row, so the set of hired vehicle numbers has to be handed in.
const makeColumns = (hireBusNos: Set<string>): Column[] => [
  {
    label: 'Vehicle Type', key: 'vehicle_type', filterable: true,
    filterOptions: [{ label: 'bus', value: 'bus' }, { label: 'van', value: 'van' }],
    render: (v, r: any) => {
      const hired = hireBusNos.has(String(r.bus_no ?? ''))
      if (v === 'van') {
        return <Badge variant={hired ? 'warning' : 'purple'}>{hired ? 'Van · Hire' : 'Van'}</Badge>
      }
      return <Badge variant={hired ? 'warning' : 'info'}>{hired ? 'Bus · Hire' : 'Bus'}</Badge>
    },
  },
  {
    label: 'Trip ID / Date', key: 'c_number', filterable: true,
    render: (v, r: any) => (
      <div>
        <div className="font-bold text-blue-600">{String(v ?? `#${r.id}`)}</div>
        <div className="text-xs text-slate-400">{String(r.trip_date ?? '').split('T')[0]}</div>
      </div>
    ),
  },
  {
    label: 'Status', key: 'trip_run_status', filterable: true,
    filterOptions: [{ label: 'Running', value: 'Running' }, { label: 'Full Trip', value: 'Full Trip' }, { label: 'Halt', value: 'Halt' }],
    render: (v) => <Badge variant={v === 'Halt' ? 'danger' : v === 'Full Trip' ? 'info' : 'success'}>{String(v ?? 'Running')}</Badge>,
  },
  {
    label: 'Bus / Service', key: 'bus_no', filterable: true,
    render: (v, r: any) => (
      <div>
        <div className={`font-semibold ${hireBusNos.has(String(v ?? '')) ? 'text-amber-700' : ''}`}>{String(v ?? '—')}</div>
        <div className="text-xs text-slate-500">{r.vehicle_type === 'van' ? r.line_code : `${r.service_no ?? ''} · ${r.trip_for ?? ''}`}</div>
      </div>
    ),
  },
  { label: 'Driver 1', key: 'driver1_name', filterable: true, render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'Driver 2', key: 'driver2_name', filterable: true, render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
  { label: 'Helper', key: 'helper_name', filterable: true, render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
  { label: 'Conductor', key: 'conductor_name', filterable: true, render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
  {
    label: 'Paid To / Hirer', key: 'paid_to_name', filterable: true,
    render: (v, r: any) => (
      <div>
        <div className="text-sm">{String(v ?? r.hirer_name ?? '—')}</div>
        {r.vehicle_type === 'van' && r.phone_number && <div className="text-xs text-slate-400">{r.phone_number}</div>}
      </div>
    ),
  },
  {
    label: 'Amount', key: 'booking_amount',
    render: (v) => v ? <span className="text-sm font-semibold">{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <span className="text-slate-300 text-xs">—</span>,
  },
  { label: 'Debit Ledger', key: 'debit_ledger_name', filterable: true, render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
  { label: 'Credit Ledger', key: 'credit_ledger_name', filterable: true, render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
  {
    label: 'Voucher', key: 'voucher_number', filterable: true,
    render: (v) => v
      ? <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{String(v)}</span>
      : <span className="text-slate-300 text-xs">—</span>,
  },
  { label: 'Remarks', key: 'remarks', render: (v) => <span className="text-xs text-slate-500 truncate max-w-[10rem] block">{String(v ?? '—')}</span> },
]

// Shows a Paid-To person's all-time Dr/Cr ledger balance beneath their select,
// once resolved from getallstfdrivhelp (which now returns ledger_id per person).
// Balance only reflects approved vouchers (getsearchdataMdl filters status='1'),
// so a just-created advance voucher won't move this until it's approved.
function PaidToBalance({ ledgerId }: { ledgerId: string }) {
  const { data } = useQuery({
    queryKey: ['ledger-balance', ledgerId],
    queryFn: () => accountingService.getSearchData({ ledger_id: ledgerId }),
    enabled: !!ledgerId,
  })
  if (!ledgerId || !data?.data?.opening_balance) return null
  const bal = signedBalance(data.data.opening_balance)
  return <div className={`text-[11px] font-semibold mt-1 ${balCls(bal)}`}>{balStr(bal)}</div>
}

// Compact checkbox toggle placed beside each of Driver1/Driver2/Helper/Conductor's
// dropdown (rather than stacked above it) so each grid row stays a single line tall.
function PersonToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <input
      type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
      title={label} aria-label={label}
      className="w-4 h-4 shrink-0 rounded accent-blue-600 cursor-pointer"
    />
  )
}

// Mirrors a scrollbar above a wide horizontally-scrolling table so it's reachable
// without first scrolling down past max-h-[70vh] to reach the one at the bottom.
function DualScrollTable({ children, tableClassName }: { children: React.ReactNode; tableClassName: string }) {
  const topRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [scrollWidth, setScrollWidth] = useState(0)
  const syncing = useRef<'top' | 'bottom' | null>(null)

  useEffect(() => {
    const el = bottomRef.current
    if (!el) return
    const update = () => setScrollWidth(el.scrollWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div>
      <div
        ref={topRef} className="overflow-x-auto overflow-y-hidden"
        style={{ height: 14 }}
        onScroll={() => {
          if (syncing.current === 'bottom') { syncing.current = null; return }
          if (!topRef.current || !bottomRef.current) return
          syncing.current = 'top'
          bottomRef.current.scrollLeft = topRef.current.scrollLeft
        }}
      >
        <div style={{ width: scrollWidth, height: 1 }} />
      </div>
      <div
        ref={bottomRef} className={tableClassName}
        onScroll={() => {
          if (syncing.current === 'top') { syncing.current = null; return }
          if (!topRef.current || !bottomRef.current) return
          syncing.current = 'bottom'
          topRef.current.scrollLeft = bottomRef.current.scrollLeft
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default function TripCreationPage() {
  const qc = useQueryClient()
  const [showGrid, setShowGrid] = useState(false)
  const [tripDate, setTripDate] = useState(today)
  const [gridRows, setGridRows] = useState<Record<number, GridRow>>({})
  const [vehicleType, setVehicleType] = useState<'Bus' | 'Van'>('Bus')
  const [serviceForFilter, setServiceForFilter] = useState('')
  // Keyed by van service-number id, exactly like the bus roster's gridRows: the
  // Van tab lists every van service for the date rather than starting empty.
  const [vanRows, setVanRows] = useState<Record<number, VanRow>>({})
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  // Edit a trip that has already been created. Bus and Van rows share this one
  // form — the fields differ, so it branches on the row's vehicle_type rather
  // than trying to show every column for both.
  const [editRow, setEditRow] = useState<any | null>(null)
  const [editForm, setEditForm] = useState<Record<string, string>>({})

  // Data queries
  const { data: tripData, isLoading } = useQuery({ queryKey: ['trips'], queryFn: () => tripsService.getTrips1() })
  const { data: busData } = useQuery({ queryKey: ['buses'], queryFn: () => mastersService.getBuses() })
  const { data: routeData } = useQuery({ queryKey: ['routes'], queryFn: () => mastersService.getServiceRoutes() })
  const { data: driverData } = useQuery({ queryKey: ['drivers'], queryFn: () => mastersService.getDrivers() })
  const { data: helperData } = useQuery({ queryKey: ['helpers'], queryFn: () => mastersService.getHelper({ staffreports: 'Helper' }) })
  const { data: staffData } = useQuery({ queryKey: ['staff-all'], queryFn: () => mastersService.getStaff({}) })
  const { data: activeStaffData } = useQuery({ queryKey: ['active-staff'], queryFn: () => mastersService.getActiveStaff() })

  const buses: any[] = (busData?.data ?? []).filter((b: any) => b.d_in === 0 && !b.issparetank)
  const allRoutes: any[] = routeData?.data ?? []
  const drivers: any[] = driverData?.data ?? []
  const helpers: any[] = helperData?.data ?? []
  const paidToList: any[] = staffData?.data ?? []
  // Every active staff member is selectable as conductor, not just those whose
  // designation happens to read "CONDUCTOR" — designation is free text from a
  // master picker, so filtering on it left the dropdown empty on databases where
  // nobody had been given that exact designation. The designation is shown in
  // the label instead, so the list stays readable.
  const conductors: any[] = activeStaffData?.data ?? []

  // Option lists for the searchable dropdowns — built once per render and shared
  // by every grid row, rather than re-mapping the same master list per <td>.
  // A bus trip can only be run by a bus and a van trip only by a van, so each
  // grid gets its own vehicle list rather than sharing one of everything.
  // busses.vehicle_type holds 'BUS'/'VAN'; anything not marked VAN is treated as
  // a bus, so vehicles seeded before that column was filled in still show up on
  // the Bus tab rather than vanishing from both.
  const isVanVehicle = (b: any) => String(b.vehicle_type ?? '').trim().toUpperCase() === 'VAN'
  const toVehicleOptions = (list: any[]) => list.map((b: any) => ({ value: String(b.bus_no), label: String(b.bus_no) }))
  const busOptions = toVehicleOptions(buses.filter((b: any) => !isVanVehicle(b)))
  const vanOptions = toVehicleOptions(buses.filter(isVanVehicle))
  // One dropdown per role, listing everyone — the separate "Opting" selects that
  // used to sit beside each of these drew from these very same lists, so folding
  // them away costs no one their place in the list. Driver type and staff
  // designation ride along in the label so a substitute is still identifiable.
  const withSuffix = (name: string, suffix?: string) =>
    suffix && String(suffix).trim() ? `${name} — ${String(suffix).trim()}` : name
  // "NA" is a real entry rather than just a placeholder, so an unfilled slot
  // reads NA on screen and can be set back to NA after a wrong pick without
  // hunting for the × — SearchableSelect matches it because its value is ''.
  // Every crew dropdown carries two fixed entries above the people: "NA" for an
  // unfilled slot, and an Opting entry for a seat covered by someone who is NOT
  // on the driver / helper / staff register — their name goes in Remarks, and
  // Trip Expenses pays that seat through the shared Payables ledger for its role
  // at the service number's OPT rate. The Opting entry is named per role
  // ("Opting Driver", "Opting Helper", "Opting Conductor") because each role has
  // its own ledger, and Trip Expenses resolves that ledger from this very name.
  // They are plain options rather than a suffix on every name, so the list stays
  // one entry per person.
  const NA_OPTION = { value: '', label: 'NA' }
  const OPTING_DRIVER = 'Opting Driver'
  const OPTING_HELPER = 'Opting Helper'
  const OPTING_CONDUCTOR = 'Opting Conductor'
  const optingOption = (label: string) => ({ value: label, label })
  const driverName = (d: any) => String(d.nickname ?? d.driver_name ?? '')
  const helperName = (h: any) => String(h.helper_name ?? h.nickname ?? '')
  const withOpting = (opting: string, list: any[], name: (x: any) => string, suffix?: (x: any) => string | undefined) => [
    NA_OPTION,
    optingOption(opting),
    ...list.map((x: any) => ({ value: String(x.id), label: withSuffix(name(x), suffix?.(x)) })),
  ]
  // Any of the three Opting entries, recognised by prefix so a row saved before
  // the roles were split (name "Opting") still reads as opting rather than as a
  // stray person who has since been deleted.
  const isOptingName = (v: any) => /^opting/i.test(String(v ?? '').trim())

  // An Opting entry is stored in the role's name with no id behind it, so it
  // shows up as-is in the grid, the records table and the edit modal without
  // needing a person to point at.
  const personPatch = (v: string, list: any[], nameOf: (x: any) => string,
    idKey: string, nameKey: string, optIdKey: string, optNameKey: string) => {
    if (isOptingName(v)) {
      return ({ [idKey]: '', [nameKey]: v, [optIdKey]: '', [optNameKey]: '' }) as Record<string, string>
    }
    const person = list.find((x: any) => String(x.id) === v)
    return ({ [idKey]: v, [nameKey]: person ? nameOf(person) : '', [optIdKey]: '', [optNameKey]: '' }) as Record<string, string>
  }
  // A stored name of "Opting" from before the split has no option of its own any
  // more, so it resolves to its role's entry and re-saves under the new name.
  const optingValueFor = (name: string, role: string) => (String(name).trim().length > 6 ? String(name).trim() : role)
  const personValue = (id: string, name: string, role: string) =>
    (id ? id : isOptingName(name) ? optingValueFor(name, role) : '')
  const clearPerson = (idKey: string, nameKey: string, optIdKey: string, optNameKey: string) =>
    ({ [idKey]: '', [nameKey]: '', [optIdKey]: '', [optNameKey]: '' }) as Record<string, string>

  const driverOptions = withOpting(OPTING_DRIVER, drivers, driverName, (d) => d.driver_type)
  const helperOptions = withOpting(OPTING_HELPER, helpers, helperName)
  const conductorOptions = [NA_OPTION, optingOption(OPTING_CONDUCTOR), ...conductors.map((c: any) => ({
    value: String(c.id),
    label: withSuffix(String(c.nickName ?? c.fullName ?? ''), c.designation),
  }))]
  const paidToOptions = paidToList.map((p: any) => ({
    value: p.paid_to_id + '_' + p.paid_to_type, label: p.paid_to_name + ' (' + p.paid_to_type + ')',
  }))

  const makeEmptyGridRow = (): GridRow => ({
    status: 'Running', bus_no: '',
    driver1_id: '', driver1_name: '', driver1_checked: false,
    opt_driver1_id: '', opt_driver1_name: '',
    driver2_id: '', driver2_name: '', driver2_checked: false,
    opt_driver2_id: '', opt_driver2_name: '',
    helper_id: '', helper_name: '', helper_checked: false,
    opt_helper_id: '', opt_helper_name: '',
    conductor_id: '', conductor_name: '', conductor_checked: true,
    paid_to_id: '', paid_to_name: '', paid_to_type: '', paid_to_ledger_id: '', paid_to_skip: false,
    remarks: '',
  })
  const makeEmptyVanRow = (): VanRow => ({
    status: 'Running', line_code: '', bus_no: '',
    driver_id: '', driver_name: '',
    hirer_name: '', phone_number: '',
    amount: '',
    remarks: '',
  })

  const allTrips: any[] = tripData?.data ?? []

  // Bus grid only shows Bus-type routes (any Van-type routes added via Service
  // Numbers are irrelevant here — Van trips are ad-hoc rows, not roster-driven).
  const serviceForOptions = [...new Set(allRoutes.map((r) => r.serviceFor).filter(Boolean))]
  // Van rows are driven by the Van service numbers, which carry the trip type
  // (pickup/drop) and the first boarding point shown read-only beside them.
  const vanRoutes = allRoutes.filter((r) => r.vehicle_type === 'van')
  const vanRouteOptions = vanRoutes.map((r) => ({ value: String(r.id), label: String(r.serviceNo ?? '') }))
  const vanRouteById = (id: string) => vanRoutes.find((r) => String(r.id) === String(id))
  // A hired vehicle is one added to Bus Masters through the Hire Bus form. It
  // changes what the row means: the owner is paid an Amount and no driver of
  // ours is on it, so the Driver cell goes inactive and Amount becomes required.
  const hireBusNos = useMemo(
    () => new Set(buses.filter((b: any) => String(b.bus_category ?? '') === 'hire').map((b: any) => String(b.bus_no))),
    [buses])
  const isHireBus = (busNo: string) => hireBusNos.has(String(busNo))
  const columns = useMemo(() => makeColumns(hireBusNos), [hireBusNos])
  const busRoutes = allRoutes
    .filter((r) => r.vehicle_type !== 'van')
    .filter((r) => !serviceForFilter || r.serviceFor === serviceForFilter)

  // Trips already created for the selected grid date, keyed by service_no_id —
  // those rows render read-only so the same route/day can't be double-booked.
  const existingByRoute = useMemo(() => {
    const map: Record<string, any> = {}
    allTrips.forEach((t) => {
      const d = String(t.trip_date ?? t.cts ?? '').split('T')[0]
      if (d === tripDate && t.service_no_id) map[String(t.service_no_id)] = t
    })
    return map
  }, [allTrips, tripDate])

  // Picking a new date starts a fresh roster — already-created rows come from existingByRoute instead
  useEffect(() => { setGridRows({}); setVanRows({}) }, [tripDate])

  const updateRow = (routeId: number, patch: Partial<GridRow>) =>
    setGridRows((g) => ({ ...g, [routeId]: { ...(g[routeId] ?? makeEmptyGridRow()), ...patch } }))

  // A running row needs a bus before it counts as filled. A Halt row is the
  // opposite: nothing ran, so it has no bus and no crew to enter — but it still
  // has to be saved, otherwise the day's sheet silently loses the fact that the
  // service was halted and the route looks untouched tomorrow.
  const filledRoutes = busRoutes.filter((r) => !existingByRoute[String(r.id)] && gridRows[r.id]?.status !== 'Halt' && gridRows[r.id]?.bus_no)
  const haltRoutes = busRoutes.filter((r) => !existingByRoute[String(r.id)] && gridRows[r.id]?.status === 'Halt')
  const submitRoutes = [...filledRoutes, ...haltRoutes]
  // Only running rows need a driver — a Halt row is complete by definition.
  const incompleteRoutes = filledRoutes.filter((r) => {
    const row = gridRows[r.id]
    return !row?.driver1_name && !row?.opt_driver1_name
  })

  const { mutate: submitGrid, isPending: submittingGrid } = useMutation({
    mutationFn: () => {
      const rows = submitRoutes.map((r) => {
        const row = gridRows[r.id]
        return {
          service_no: r.serviceNo, service_no_id: r.id,
          trip_for: r.serviceFor, trip_for_id: r.service_for_id,
          bus_no: row.bus_no,
          driver1_id: row.driver1_id, driver1_name: row.driver1_name,
          opt_driver1_id: row.opt_driver1_id, opt_driver1_name: row.opt_driver1_name,
          driver2_id: row.driver2_id, driver2_name: row.driver2_name,
          opt_driver2_id: row.opt_driver2_id, opt_driver2_name: row.opt_driver2_name,
          helper_id: row.helper_id, helper_name: row.helper_name,
          opt_helper_id: row.opt_helper_id, opt_helper_name: row.opt_helper_name,
          conductor_id: row.conductor_id, conductor_name: row.conductor_name,
          paid_to_id: row.paid_to_id, paid_to_name: row.paid_to_name, paid_to_type: row.paid_to_type,
          // Persisted so the Trip Expenses modal opens with the same people
          // already ticked — without these the selection died with the grid.
          driver1_paid_direct: row.driver1_checked ? 1 : 0,
          driver2_paid_direct: row.driver2_checked ? 1 : 0,
          helper_paid_direct: row.helper_checked ? 1 : 0,
          conductor_paid_direct: row.conductor_checked ? 1 : 0,
          remarks: row.remarks, trip_run_status: row.status,
        }
      })
      return tripsService.bulkCreateTrips({
        trip_date: tripDate, rows,
        user_id: localStorage.getItem('user_id'),
        usr_nm: localStorage.getItem('usr_nm'),
      })
    },
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success(`${res.data?.inserted ?? 0} trip(s) created for ${tripDate}`)
        qc.invalidateQueries({ queryKey: ['trips'] })
        setGridRows({})
      } else toast.error('Failed to create trips')
    },
    onError: () => toast.error('Server error'),
  })

  const updateVanRow = (routeId: number, patch: Partial<VanRow>) =>
    setVanRows((rows) => ({ ...rows, [routeId]: { ...(rows[routeId] ?? makeEmptyVanRow()), ...patch } }))

  // A hired van has no driver of ours to name but must carry its Amount; an own
  // van is the other way round. Both still need a van and a hirer.
  const vanRowReady = (row: VanRow | undefined) => {
    if (!row || row.status === 'Halt' || !row.bus_no || !row.hirer_name) return false
    return isHireBus(row.bus_no) ? Number(row.amount) > 0 : !!row.driver_name
  }
  // Only services that have no trip for this date yet, so the same van service
  // cannot be booked twice on one day - the rule the bus roster already applies.
  const readyVanRows = vanRoutes
    .filter((r) => !existingByRoute[String(r.id)] && vanRowReady(vanRows[r.id]))
    .map((r) => ({ route: r, row: vanRows[r.id] as VanRow }))

  const { mutate: submitVanRows, isPending: submittingVan } = useMutation({
    mutationFn: () => {
      const rows = readyVanRows.map(({ route, row }) => ({
        vehicle_type: 'van', line_code: row.line_code, bus_no: row.bus_no,
        service_no: route.serviceNo, service_no_id: String(route.id),
        trip_for: route.serviceFor, trip_for_id: route.service_for_id,
        driver1_id: row.driver_id, driver1_name: row.driver_name,
        hirer_name: row.hirer_name, phone_number: row.phone_number,
        booking_amount: isHireBus(row.bus_no) ? row.amount : '',
        remarks: row.remarks, trip_run_status: row.status,
      }))
      return tripsService.bulkCreateTrips({
        trip_date: tripDate, rows,
        user_id: localStorage.getItem('user_id'),
        usr_nm: localStorage.getItem('usr_nm'),
      })
    },
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success(`${res.data?.inserted ?? 0} van trip(s) created for ${tripDate}`)
        qc.invalidateQueries({ queryKey: ['trips'] })
        setVanRows({})
      } else toast.error('Failed to create trips')
    },
    onError: () => toast.error('Server error'),
  })

  const openEdit = (row: any) => {
    setEditRow(row)
    setEditForm({
      trip_run_status: String(row.trip_run_status ?? 'Running'),
      bus_no: String(row.bus_no ?? ''),
      driver1_id: String(row.driver1_id ?? ''), driver1_name: String(row.driver1_name ?? ''),
      opt_driver1_id: String(row.opt_driver1_id ?? ''), opt_driver1_name: String(row.opt_driver1_name ?? ''),
      driver1_checked: row.driver1_paid_direct ? '1' : '',
      driver2_id: String(row.driver2_id ?? ''), driver2_name: String(row.driver2_name ?? ''),
      opt_driver2_id: String(row.opt_driver2_id ?? ''), opt_driver2_name: String(row.opt_driver2_name ?? ''),
      driver2_checked: row.driver2_paid_direct ? '1' : '',
      helper_id: String(row.helper_id ?? ''), helper_name: String(row.helper_name ?? ''),
      opt_helper_id: String(row.opt_helper_id ?? ''), opt_helper_name: String(row.opt_helper_name ?? ''),
      helper_checked: row.helper_paid_direct ? '1' : '',
      conductor_id: String(row.conductor_id ?? ''), conductor_name: String(row.conductor_name ?? ''),
      conductor_checked: row.conductor_paid_direct ? '1' : '',
      paid_to_id: String(row.paid_to_id ?? ''), paid_to_name: String(row.paid_to_name ?? ''),
      paid_to_type: String(row.paid_to_type ?? ''),
      // Always starts unchecked — defaulting this on from a merely-blank
      // paid_to_id would lock the picker shut on exactly the trips someone is
      // opening Edit to fix, indistinguishable from a deliberate skip.
      paid_to_skip: '',
      hirer_name: String(row.hirer_name ?? ''), phone_number: String(row.phone_number ?? ''),
      line_code: String(row.line_code ?? ''),
      remarks: String(row.remarks ?? ''),
    })
  }
  const patchEdit = (patch: Record<string, string>) => setEditForm((f) => ({ ...f, ...patch }))

  const { mutate: saveEdit, isPending: savingEdit } = useMutation({
    // Only the keys relevant to this row's vehicle type are sent — the backend
    // writes exactly what it receives, so omitting the others leaves them alone
    // rather than blanking them.
    mutationFn: () => {
      const isVan = editRow?.vehicle_type === 'van'
      const common = {
        id: editRow.id, c_number: editRow.c_number,
        bus_no: editForm.bus_no, trip_run_status: editForm.trip_run_status,
        remarks: editForm.remarks,
        driver1_id: editForm.driver1_id, driver1_name: editForm.driver1_name,
        opt_driver1_id: editForm.opt_driver1_id, opt_driver1_name: editForm.opt_driver1_name,
        updatedby_id: localStorage.getItem('user_id') ?? '',
        updatedby_name: localStorage.getItem('usr_nm') ?? '',
        updated_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      }
      return tripsService.updateTrip(isVan
        ? { ...common, hirer_name: editForm.hirer_name, phone_number: editForm.phone_number, line_code: editForm.line_code }
        : { ...common,
            driver2_id: editForm.driver2_id, driver2_name: editForm.driver2_name,
            opt_driver2_id: editForm.opt_driver2_id, opt_driver2_name: editForm.opt_driver2_name,
            helper_id: editForm.helper_id, helper_name: editForm.helper_name,
            opt_helper_id: editForm.opt_helper_id, opt_helper_name: editForm.opt_helper_name,
            conductor_id: editForm.conductor_id, conductor_name: editForm.conductor_name,
            paid_to_id: editForm.paid_to_id, paid_to_name: editForm.paid_to_name, paid_to_type: editForm.paid_to_type,
            driver1_paid_direct: editForm.driver1_checked === '1' ? 1 : 0,
            driver2_paid_direct: editForm.driver2_checked === '1' ? 1 : 0,
            helper_paid_direct: editForm.helper_checked === '1' ? 1 : 0,
            conductor_paid_direct: editForm.conductor_checked === '1' ? 1 : 0 })
    },
    onSuccess: (res: any) => {
      if (res?.status === 200 || res?.status === undefined) {
        toast.success('Trip updated')
        qc.invalidateQueries({ queryKey: ['trips'] })
        setEditRow(null)
      } else toast.error(res?.msg ?? 'Failed to update trip')
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex justify-between items-end">
        <PageHeader title="Trip Related Reports" subtitle="Create and manage trip assignments" />
        <Button
          variant={showGrid ? 'danger' : 'teal'}
          onClick={() => setShowGrid((v) => !v)}
        >
          {showGrid ? <><X className="w-4 h-4" /> Close</> : <><Plus className="w-4 h-4" /> Create Trips</>}
        </Button>
      </div>

      {/* ── Daily Trip Sheet: date + per-service-route grid ── */}
      <AnimatePresence>
        {showGrid && (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
          >
            <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-indigo-500">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Map className="w-5 h-5 text-blue-500" /> Daily Trip Sheet
                </h2>
                <button onClick={() => setShowGrid(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <TopNavTabs tabs={['Bus', 'Van']} activeTab={vehicleType} onChange={(t) => setVehicleType(t as 'Bus' | 'Van')} />

              <div className="mb-5 flex items-end gap-4 flex-wrap">
                <div className="max-w-xs">
                  <Label>Trip Date <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <Input type="date" max={today} value={tripDate} onChange={(e) => setTripDate(e.target.value)} className="pl-9" />
                  </div>
                </div>
                {vehicleType === 'Bus' && (
                  <div className="max-w-xs">
                    <Label>Service For</Label>
                    <Select value={serviceForFilter} onChange={(e) => setServiceForFilter(e.target.value)}>
                      <option value="">All</option>
                      {serviceForOptions.map((s) => <option key={s as string} value={s as string}>{s as string}</option>)}
                    </Select>
                  </div>
                )}
              </div>

              {vehicleType === 'Van' ? (
                <>
                  <DualScrollTable tableClassName="overflow-auto max-h-[70vh] rounded-xl border border-slate-200">
                    <table className="table-fixed w-max text-sm border-collapse">
                      <thead>
                        <tr className="sticky top-0 z-10 text-left text-xs font-bold text-white uppercase tracking-wider bg-blue-600">
                          <th className="py-2.5 px-3 w-12">Sl.No</th>
                          <th className="py-2.5 px-3 w-40">Svc No</th>
                          <th className="py-2.5 px-3 w-44">Line Code</th>
                          <th className="py-2.5 px-3 w-28">Pick/Drop</th>
                          <th className="py-2.5 px-3 w-40">From</th>
                          <th className="py-2.5 px-3 w-32">Status</th>
                          <th className="py-2.5 px-3 w-52">Van No</th>
                          <th className="py-2.5 px-3 w-56">Driver</th>
                          <th className="py-2.5 px-3 w-40">Hirer Name</th>
                          <th className="py-2.5 px-3 w-32">Mobile</th>
                          <th className="py-2.5 px-3 w-32">Amount</th>
                          <th className="py-2.5 px-3 w-80">Remarks</th>
                          <th className="py-2.5 px-3 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {vanRoutes.length === 0 ? (
                          <tr><td colSpan={13} className="py-6 text-center text-sm text-slate-400">
                            No Van service routes found — add one under Masters → Service Routes (Van tab) first.
                          </td></tr>
                        ) : vanRoutes.map((r, i) => {
                          const existing = existingByRoute[String(r.id)]
                          const pickDrop = r.trip_type || '—'
                          const from = r.start_boarding_point || r.fromCity || '—'
                          if (existing) {
                            const wasHired = isHireBus(existing.bus_no)
                            return (
                              <tr key={r.id} className="border-b border-slate-100 bg-emerald-50/40">
                                <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                                <td className="py-2 px-3 font-semibold text-slate-700">{r.serviceNo}</td>
                                <td className="py-2 px-3 text-slate-600 text-xs">{existing.line_code || r.line_code || '—'}</td>
                                <td className="py-2 px-3 text-slate-600 text-xs capitalize">{pickDrop}</td>
                                <td className="py-2 px-3 text-slate-600 text-xs">{from}</td>
                                <td className="py-2 px-3"><Badge variant="success">Created</Badge></td>
                                <td className={`py-2 px-3 font-medium ${wasHired ? 'text-amber-700' : ''}`}>{existing.bus_no || '—'}</td>
                                <td className="py-2 px-3 text-slate-600 text-xs">{existing.driver1_name || (wasHired ? 'Hired' : '—')}</td>
                                <td className="py-2 px-3 text-slate-600 text-xs">{existing.hirer_name || '—'}</td>
                                <td className="py-2 px-3 text-slate-500 text-xs">{existing.phone_number || '—'}</td>
                                <td className="py-2 px-3 text-slate-600 text-xs">{existing.booking_amount ? `₹${Number(existing.booking_amount).toLocaleString('en-IN')}` : '—'}</td>
                                <td className="py-2 px-3 text-slate-500 text-xs truncate max-w-[9rem]">{existing.remarks || '—'}</td>
                                <td className="py-2 px-3">
                                  <button
                                    type="button"
                                    onClick={() => openEdit(existing)}
                                    title="Edit this trip"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                  </button>
                                </td>
                              </tr>
                            )
                          }
                          const row = vanRows[r.id] ?? makeEmptyVanRow()
                          const hired = isHireBus(row.bus_no)
                          return (
                            // A hired van is tinted so a sheet of mixed rows shows at
                            // a glance which trips are bought in rather than run by us.
                            <tr key={r.id} className={`border-b border-slate-100 align-top ${hired ? 'bg-amber-50/60' : ''}`}>
                              <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                              <td className="py-2 px-3">
                                <div className="font-semibold text-slate-700">{r.serviceNo}</div>
                                <div className="text-xs text-slate-400">{r.serviceFor}</div>
                              </td>
                              <td className="py-2 px-3">
                                <MasterListPicker panelId={`van-line-code-panel-${r.id}`} queryKey="line-codes" queryFn={() => mastersService.getLineCodes()}
                                  valueKey="line_code" value={row.line_code || r.line_code || ''} onChange={(v) => updateVanRow(r.id, { line_code: v })} placeholder="Select" />
                              </td>
                              {/* Pick/Drop and From are the service number's own trip
                                  type and first boarding point — shown, not re-entered,
                                  so a row can never disagree with its service master. */}
                              <td className="py-2 px-3 text-sm text-slate-600 capitalize">{pickDrop}</td>
                              <td className="py-2 px-3 text-sm text-slate-600">{from}</td>
                              <td className="py-2 px-3">
                                <select
                                  value={row.status}
                                  onChange={(e) => updateVanRow(r.id, { status: e.target.value as TripRunStatus })}
                                  className="w-full h-11 rounded-xl border border-slate-200 bg-white text-sm px-3 shadow-sm transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                                >
                                  <option value="Running">Running</option>
                                  <option value="Full Trip">Full Trip</option>
                                  <option value="Halt">Halt</option>
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <SearchableSelect className="min-w-[13rem]" placeholder="Select" options={vanOptions}
                                  value={row.bus_no}
                                  onChange={(v) => updateVanRow(r.id, isHireBus(v)
                                    // Switching to a hired vehicle drops the driver: no
                                    // driver of ours is on it, so leaving a stale name
                                    // behind would file a trip against the wrong person.
                                    ? { bus_no: v, driver_id: '', driver_name: '' }
                                    : { bus_no: v, amount: '' })}
                                  onClear={() => updateVanRow(r.id, { bus_no: '' })} />
                                {hired && <p className="text-[10px] font-bold text-amber-700 mt-1">Hired vehicle</p>}
                              </td>
                              <td className="py-2 px-3">
                                {hired ? (
                                  <p className="text-xs text-slate-400 h-11 flex items-center">Not applicable</p>
                                ) : (
                                  <SearchableSelect className="min-w-[14rem]" placeholder="Select" options={driverOptions}
                                    value={personValue(row.driver_id, row.driver_name, OPTING_DRIVER)}
                                    onChange={(v) => {
                                      if (isOptingName(v)) { updateVanRow(r.id, { driver_id: '', driver_name: v }); return }
                                      const d = drivers.find((dr) => String(dr.id) === v)
                                      updateVanRow(r.id, { driver_id: v, driver_name: d?.nickname ?? d?.driver_name ?? '' })
                                    }}
                                    onClear={() => updateVanRow(r.id, { driver_id: '', driver_name: '' })} />
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <Input value={row.hirer_name} onChange={(e) => updateVanRow(r.id, { hirer_name: e.target.value })}
                                  placeholder="Name" className="h-11 text-sm" />
                              </td>
                              <td className="py-2 px-3">
                                <Input inputMode="numeric" maxLength={10} value={row.phone_number}
                                  onChange={(e) => updateVanRow(r.id, { phone_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                  placeholder="Mobile" className="h-11 text-sm" />
                              </td>
                              <td className="py-2 px-3">
                                <Input type="number" value={hired ? row.amount : ''} disabled={!hired}
                                  onChange={(e) => updateVanRow(r.id, { amount: e.target.value })}
                                  placeholder={hired ? 'Amount' : '—'} className="h-11 text-sm" />
                              </td>
                              <td className="py-2 px-3">
                                <Input value={row.remarks} onChange={(e) => updateVanRow(r.id, { remarks: e.target.value })}
                                  placeholder="Remarks" className="h-11 text-sm" />
                              </td>
                              <td className="py-2 px-3" />
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </DualScrollTable>

                  {/* No "Add Row": the Van tab is a roster of every van service for
                      the date, the same as the Bus tab, so rows are not added by hand. */}
                  <div className="flex items-center justify-center gap-3 mt-3">
                    <Button
                      onClick={() => submitVanRows()}
                      disabled={submittingVan || readyVanRows.length === 0}
                      className="px-14 text-base h-11"
                    >
                      <Save className="w-4 h-4" />
                      {submittingVan ? 'Submitting…' : `Submit ${readyVanRows.length > 0 ? `(${readyVanRows.length})` : ''}`}
                    </Button>
                  </div>
                </>
              ) : busRoutes.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No Bus service routes found — add one under Masters → Service Routes first.</p>
              ) : (
                <DualScrollTable tableClassName="overflow-auto max-h-[70vh] rounded-xl border border-slate-200">
                  <table className="table-fixed w-max text-sm border-collapse">
                    <thead>
                      <tr className="sticky top-0 z-10 text-left text-xs font-bold text-white uppercase tracking-wider bg-blue-600">
                        <th className="py-2.5 px-3 w-48">Service No</th>
                        <th className="py-2.5 px-3 w-32">Status</th>
                        <th className="py-2.5 px-3 w-52">Bus No</th>
                        <th className="py-2.5 px-3 w-56">Driver 1</th>
                        <th className="py-2.5 px-3 w-56">Driver 2</th>
                        <th className="py-2.5 px-3 w-52">Helper</th>
                        <th className="py-2.5 px-3 w-52">Conductor</th>
                        <th className="py-2.5 px-3 w-64">Paid To</th>
                        <th className="py-2.5 px-3 w-80">Remarks</th>
                        <th className="py-2.5 px-3 w-24">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {busRoutes.map((r) => {
                        const existing = existingByRoute[String(r.id)]
                        if (existing) {
                          return (
                            <tr key={r.id} className="border-b border-slate-100 bg-emerald-50/40">
                              <td className="py-2 px-3">
                                <div className="font-semibold text-slate-700">{r.serviceNo}</div>
                                <div className="text-xs text-slate-400">{r.fromCity} → {r.toCity}</div>
                              </td>
                              <td className="py-2 px-3"><Badge variant="success">Created</Badge></td>
                              <td className="py-2 px-3 font-medium">{existing.bus_no || '—'}</td>
                              <td className="py-2 px-3 text-slate-600">{existing.driver1_name || existing.opt_driver1_name || '—'}</td>
                              <td className="py-2 px-3 text-slate-500 text-xs">{existing.driver2_name || existing.opt_driver2_name || '—'}</td>
                              <td className="py-2 px-3 text-slate-500 text-xs">{existing.helper_name || existing.opt_helper_name || '—'}</td>
                              <td className="py-2 px-3 text-slate-500 text-xs">{existing.conductor_name || '—'}</td>
                              <td className="py-2 px-3 text-slate-600 text-xs">{existing.paid_to_name || '—'}</td>
                              <td className="py-2 px-3 text-slate-500 text-xs truncate max-w-[9rem]">{existing.remarks || '—'}</td>
                              <td className="py-2 px-3">
                                <button
                                  type="button"
                                  onClick={() => openEdit(existing)}
                                  title="Edit this trip"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-colors"
                                >
                                  <Pencil className="w-3.5 h-3.5" /> Edit
                                </button>
                              </td>
                            </tr>
                          )
                        }
                        const row = gridRows[r.id] ?? makeEmptyGridRow()
                        return (
                          <tr key={r.id} className="border-b border-slate-100 align-top">
                            <td className="py-2 px-3">
                              <div className="font-semibold text-slate-700">{r.serviceNo}</div>
                              <div className="text-xs text-slate-400">{r.fromCity} → {r.toCity}</div>
                            </td>
                            <td className="py-2 px-3">
                              <select
                                value={row.status}
                                onChange={(e) => updateRow(r.id, { status: e.target.value as TripRunStatus })}
                                className="w-full h-11 rounded-xl border border-slate-200 bg-white text-sm px-3 shadow-sm transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                              >
                                <option value="Running">Running</option>
                                <option value="Full Trip">Full Trip</option>
                                <option value="Halt">Halt</option>
                              </select>
                            </td>
                            <td className="py-2 px-3">
                              <SearchableSelect className="min-w-[13rem]" placeholder="Select" options={busOptions}
                                value={row.bus_no} onChange={(v) => updateRow(r.id, { bus_no: v })} onClear={() => updateRow(r.id, { bus_no: '' })} />
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <PersonToggle label="Driver 1" checked={row.driver1_checked} onChange={(v) => updateRow(r.id, { driver1_checked: v })} />
                                <SearchableSelect className="min-w-[14rem] flex-1" placeholder="Select" options={driverOptions} value={personValue(row.driver1_id, row.driver1_name, OPTING_DRIVER)}
                                  onChange={(v) => updateRow(r.id, personPatch(v, drivers, driverName, 'driver1_id', 'driver1_name', 'opt_driver1_id', 'opt_driver1_name') as Partial<GridRow>)}
                                  onClear={() => updateRow(r.id, clearPerson('driver1_id', 'driver1_name', 'opt_driver1_id', 'opt_driver1_name') as Partial<GridRow>)} />
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <PersonToggle label="Driver 2" checked={row.driver2_checked} onChange={(v) => updateRow(r.id, { driver2_checked: v })} />
                                <SearchableSelect className="min-w-[14rem] flex-1" placeholder="Select" options={driverOptions} value={personValue(row.driver2_id, row.driver2_name, OPTING_DRIVER)}
                                  onChange={(v) => updateRow(r.id, personPatch(v, drivers, driverName, 'driver2_id', 'driver2_name', 'opt_driver2_id', 'opt_driver2_name') as Partial<GridRow>)}
                                  onClear={() => updateRow(r.id, clearPerson('driver2_id', 'driver2_name', 'opt_driver2_id', 'opt_driver2_name') as Partial<GridRow>)} />
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <PersonToggle label="Helper" checked={row.helper_checked} onChange={(v) => updateRow(r.id, { helper_checked: v })} />
                                <SearchableSelect className="min-w-[13rem] flex-1" placeholder="Select" options={helperOptions} value={personValue(row.helper_id, row.helper_name, OPTING_HELPER)}
                                  onChange={(v) => updateRow(r.id, personPatch(v, helpers, helperName, 'helper_id', 'helper_name', 'opt_helper_id', 'opt_helper_name') as Partial<GridRow>)}
                                  onClear={() => updateRow(r.id, clearPerson('helper_id', 'helper_name', 'opt_helper_id', 'opt_helper_name') as Partial<GridRow>)} />
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <PersonToggle label="Conductor" checked={row.conductor_checked} onChange={(v) => updateRow(r.id, { conductor_checked: v })} />
                                <SearchableSelect className="min-w-[13rem] flex-1" placeholder="Select" options={conductorOptions}
                                  value={personValue(row.conductor_id, row.conductor_name, OPTING_CONDUCTOR)}
                                  onChange={(v) => {
                                    if (isOptingName(v)) { updateRow(r.id, { conductor_id: '', conductor_name: v }); return }
                                    const c = conductors.find((x) => String(x.id) === v)
                                    updateRow(r.id, { conductor_id: v, conductor_name: c?.nickName ?? c?.fullName ?? '' })
                                  }}
                                  onClear={() => updateRow(r.id, { conductor_id: '', conductor_name: '' })} />
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <PersonToggle label="No Paid To needed" checked={row.paid_to_skip} onChange={(v) => updateRow(r.id, v
                                  ? { paid_to_skip: true, paid_to_id: '', paid_to_name: '', paid_to_type: '', paid_to_ledger_id: '' }
                                  : { paid_to_skip: false })} />
                                <SearchableSelect
                                  disabled={row.paid_to_skip}
                                  className="min-w-[15rem] flex-1" placeholder="Select" options={paidToOptions}
                                  value={row.paid_to_id ? row.paid_to_id + '_' + row.paid_to_type : ''}
                                  onChange={(v) => {
                                    const p = paidToList.find((x) => x.paid_to_id + '_' + x.paid_to_type === v)
                                    const ledgerId = p?.ledger_id ? String(p.ledger_id) : ''
                                    updateRow(r.id, {
                                      paid_to_id: String(p?.paid_to_id ?? ''), paid_to_name: p?.paid_to_name ?? '', paid_to_type: p?.paid_to_type ?? '', paid_to_ledger_id: ledgerId,
                                    })
                                  }}
                                  onClear={() => updateRow(r.id, { paid_to_id: '', paid_to_name: '', paid_to_type: '', paid_to_ledger_id: '' })} />
                              </div>
                              {row.paid_to_skip ? (
                                <p className="text-[11px] font-semibold text-slate-400 mt-1">No Paid To needed for this trip</p>
                              ) : row.driver1_checked && row.driver2_checked && row.helper_checked && (
                                // Informational only — the picker stays open. The Conductor and
                                // parking can still leave a remainder, and these ticks are
                                // re-editable at expense time, so locking it here would strand
                                // that remainder with nowhere to go.
                                <p className="text-[11px] font-semibold text-slate-400 mt-1">Driver 1, Driver 2 &amp; Helper all paid individually</p>
                              )}
                              <PaidToBalance ledgerId={row.paid_to_ledger_id} />
                            </td>
                            <td className="py-2 px-3">
                              <Input value={row.remarks} onChange={(e) => updateRow(r.id, { remarks: e.target.value })}
                                placeholder="Remarks" className="h-11 text-sm" />
                            </td>
                            {/* Nothing to edit until the row exists — keeps the column count matching the header. */}
                            <td className="py-2 px-3" />
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </DualScrollTable>
              )}

              {vehicleType === 'Bus' && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  {incompleteRoutes.length > 0 && (
                    <span className="text-xs font-semibold text-amber-600">
                      {incompleteRoutes.length} row(s) need Driver 1
                    </span>
                  )}
                  <Button
                    onClick={() => submitGrid()}
                    disabled={submittingGrid || submitRoutes.length === 0 || incompleteRoutes.length > 0}
                    className="px-14 text-base h-11"
                  >
                    <Save className="w-4 h-4" />
                    {submittingGrid ? 'Submitting…' : `Submit ${submitRoutes.length > 0 ? `(${submitRoutes.length})` : ''}`}
                  </Button>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trip Records Table ── */}
      <DataTable
        title={`Trip Records (${allTrips.length})`}
        columns={columns}
        data={allTrips}
        loading={isLoading}
        onAction={(action, row) => { if (action === 'edit') openEdit(row) }}
        actions={['edit']}
        icon={<Map className="w-5 h-5 text-blue-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />

      {/* ── Edit a created trip (Bus or Van) ── */}
      <AnimatePresence>
        {editRow && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
            onClick={() => setEditRow(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                    <Map className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Edit {editRow.vehicle_type === 'van' ? 'Van' : 'Bus'} Trip
                    </h3>
                    <p className="text-xs font-medium text-slate-500">
                      <span className="text-blue-600">{editRow.c_number ?? '#' + editRow.id}</span>
                      {editRow.trip_date ? ' · ' + String(editRow.trip_date).split('T')[0] : ''}
                      {editRow.service_no ? ' · ' + editRow.service_no : ''}
                    </p>
                  </div>
                </div>
                <button onClick={() => setEditRow(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={editForm.trip_run_status} onChange={(e) => patchEdit({ trip_run_status: e.target.value })}>
                    <option value="Running">Running</option>
                    <option value="Full Trip">Full Trip</option>
                    <option value="Halt">Halt</option>
                  </Select>
                </div>
                <div>
                  <Label>Bus No <span className="text-red-500">*</span></Label>
                  <SearchableSelect placeholder="Select" options={editRow.vehicle_type === 'van' ? vanOptions : busOptions}
                    value={editForm.bus_no}
                    onChange={(v) => patchEdit({ bus_no: v })} onClear={() => patchEdit({ bus_no: '' })} />
                </div>

                {editRow.vehicle_type === 'van' ? (
                  <>
                    <div>
                      <Label>Driver <span className="text-red-500">*</span></Label>
                      <SearchableSelect placeholder="Select" options={driverOptions} value={personValue(editForm.driver1_id, editForm.driver1_name, OPTING_DRIVER)}
                        onChange={(v) => patchEdit(personPatch(v, drivers, driverName, 'driver1_id', 'driver1_name', 'opt_driver1_id', 'opt_driver1_name'))}
                        onClear={() => patchEdit(clearPerson('driver1_id', 'driver1_name', 'opt_driver1_id', 'opt_driver1_name'))} />
                    </div>
                    <div>
                      <Label>Line Code</Label>
                      <Input value={editForm.line_code} onChange={(e) => patchEdit({ line_code: e.target.value })} />
                    </div>
                    <div>
                      <Label>Hirer Name <span className="text-red-500">*</span></Label>
                      <Input value={editForm.hirer_name} onChange={(e) => patchEdit({ hirer_name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Phone Number</Label>
                      <Input value={editForm.phone_number} onChange={(e) => patchEdit({ phone_number: e.target.value })} />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Driver 1 <span className="text-red-500">*</span></Label>
                      <div className="flex items-center gap-2">
                        <PersonToggle label="Driver 1" checked={editForm.driver1_checked === '1'} onChange={(v) => patchEdit({ driver1_checked: v ? '1' : '' })} />
                        <SearchableSelect className="flex-1" placeholder="Select" options={driverOptions} value={personValue(editForm.driver1_id, editForm.driver1_name, OPTING_DRIVER)}
                          onChange={(v) => patchEdit(personPatch(v, drivers, driverName, 'driver1_id', 'driver1_name', 'opt_driver1_id', 'opt_driver1_name'))}
                          onClear={() => patchEdit(clearPerson('driver1_id', 'driver1_name', 'opt_driver1_id', 'opt_driver1_name'))} />
                      </div>
                    </div>
                    <div>
                      <Label>Driver 2</Label>
                      <div className="flex items-center gap-2">
                        <PersonToggle label="Driver 2" checked={editForm.driver2_checked === '1'} onChange={(v) => patchEdit({ driver2_checked: v ? '1' : '' })} />
                        <SearchableSelect className="flex-1" placeholder="Select" options={driverOptions} value={personValue(editForm.driver2_id, editForm.driver2_name, OPTING_DRIVER)}
                          onChange={(v) => patchEdit(personPatch(v, drivers, driverName, 'driver2_id', 'driver2_name', 'opt_driver2_id', 'opt_driver2_name'))}
                          onClear={() => patchEdit(clearPerson('driver2_id', 'driver2_name', 'opt_driver2_id', 'opt_driver2_name'))} />
                      </div>
                    </div>
                    <div>
                      <Label>Helper</Label>
                      <div className="flex items-center gap-2">
                        <PersonToggle label="Helper" checked={editForm.helper_checked === '1'} onChange={(v) => patchEdit({ helper_checked: v ? '1' : '' })} />
                        <SearchableSelect className="flex-1" placeholder="Select" options={helperOptions} value={personValue(editForm.helper_id, editForm.helper_name, OPTING_HELPER)}
                          onChange={(v) => patchEdit(personPatch(v, helpers, helperName, 'helper_id', 'helper_name', 'opt_helper_id', 'opt_helper_name'))}
                          onClear={() => patchEdit(clearPerson('helper_id', 'helper_name', 'opt_helper_id', 'opt_helper_name'))} />
                      </div>
                    </div>
                    <div>
                      <Label>Conductor</Label>
                      <div className="flex items-center gap-2">
                        <PersonToggle label="Conductor" checked={editForm.conductor_checked === '1'} onChange={(v) => patchEdit({ conductor_checked: v ? '1' : '' })} />
                        <SearchableSelect className="flex-1" placeholder="Select" options={conductorOptions}
                          value={personValue(editForm.conductor_id, editForm.conductor_name, OPTING_CONDUCTOR)}
                          onChange={(v) => {
                            if (isOptingName(v)) { patchEdit({ conductor_id: '', conductor_name: v }); return }
                            const c = conductors.find((x: any) => String(x.id) === v)
                            patchEdit({ conductor_id: v, conductor_name: c?.nickName ?? c?.fullName ?? '' })
                          }}
                          onClear={() => patchEdit({ conductor_id: '', conductor_name: '' })} />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label>Paid To</Label>
                      <div className="flex items-center gap-2">
                        <PersonToggle label="No Paid To needed" checked={editForm.paid_to_skip === '1'} onChange={(v) => patchEdit(v
                          ? { paid_to_skip: '1', paid_to_id: '', paid_to_name: '', paid_to_type: '' }
                          : { paid_to_skip: '' })} />
                        <SearchableSelect
                          className="flex-1"
                          disabled={editForm.paid_to_skip === '1'}
                          placeholder="Select" options={paidToOptions}
                          value={editForm.paid_to_id ? editForm.paid_to_id + '_' + editForm.paid_to_type : ''}
                          onChange={(v) => {
                            const pp = paidToList.find((x: any) => x.paid_to_id + '_' + x.paid_to_type === v)
                            patchEdit({ paid_to_id: pp ? String(pp.paid_to_id) : '', paid_to_name: pp?.paid_to_name ?? '', paid_to_type: pp?.paid_to_type ?? '' })
                          }}
                          onClear={() => patchEdit({ paid_to_id: '', paid_to_name: '', paid_to_type: '' })} />
                      </div>
                      {editForm.paid_to_skip === '1' ? (
                        <p className="text-[11px] font-semibold text-slate-400 mt-1">No Paid To needed for this trip</p>
                      ) : editForm.driver1_checked === '1' && editForm.driver2_checked === '1' && editForm.helper_checked === '1' && (
                        <p className="text-[11px] font-semibold text-slate-400 mt-1">Driver 1, Driver 2 &amp; Helper all paid individually</p>
                      )}
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <Label>Remarks</Label>
                  <Input value={editForm.remarks} onChange={(e) => patchEdit({ remarks: e.target.value })} />
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
                <Button
                  onClick={() => saveEdit()}
                  disabled={savingEdit || !editForm.bus_no || (!editForm.driver1_name && !editForm.opt_driver1_name) ||
                    (editRow.vehicle_type === 'van' && !editForm.hirer_name)}
                >
                  <Save className="w-4 h-4" /> {savingEdit ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
