import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Map, Save, X, Plus, CalendarDays, Trash2, Pencil, ArrowUp, ArrowDown } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DualScrollTable, GlassCard, Button, Input, Label, Select, DataTable, Badge, PageHeader, TopNavTabs, MasterListPicker, SearchableSelect, LedgerNameWithGroup } from '@/components/shared'
import type { Column } from '@/components/shared'
import { tripsService } from '@/services/trips.service'
import { isVanVehicleType, formatDate, isValidMobile, todayISO, localDateTime } from '@/lib/utils'
import { mastersService } from '@/services/masters.service'
import { accountingService } from '@/services/accounting.service'
import { balStr, balCls, signedBalance } from '@/lib/ledgerFormat'

const today = todayISO()

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
  // Who an Opting Driver actually is - they are off the register, so the row
  // takes their name and mobile; both go with the trip (opt_driver1_name /
  // opt_driver1_mobile) so Trip Expenses and the records can name them.
  opt_driver_name: string; opt_driver_mobile: string
  hirer_name: string; phone_number: string
  // What the trip costs us beyond our own payroll: the hire charge on a hired
  // van, or the opting driver's pay when the seat is covered by someone off the
  // register. An own van with a registered driver has neither, so the field is
  // inactive there rather than silently accepting a number.
  amount: string
  remarks: string
}

// Built per render rather than fixed, so a created trip can be coloured by
// whether its vehicle was hired — that fact lives in Bus Masters, not on the
// trip row, so the set of hired vehicle numbers has to be handed in.
// The Trip Records table follows the Bus / Van tab above it, and the two kinds
// of trip carry different facts: a bus trip has a crew of four and a paid-to
// person, a van trip has one driver, a hirer and a booking amount. Each tab
// gets the columns that mean something for its rows rather than one wide grid
// that is half dashes whichever tab is open.
const slNoColumn: Column = { label: 'Sl No', key: '_sl', align: 'center', render: (_v, _r, i) => i + 1 }
const refNoColumn = (label: string): Column => ({
  label, key: 'c_number', filterable: true,
  render: (v, r: any) => <span className="font-bold text-blue-600">{String(v ?? `#${r.id}`)}</span>,
})
const dateColumn: Column = { label: 'Date', key: 'trip_date', render: (v) => formatDate(v) }
const dashOr = (v: unknown) => String(v ?? '').trim() ? String(v) : <span className="text-slate-300">—</span>

const makeColumns = (hireBusNos: Set<string>, kind: 'Bus' | 'Van'): Column[] => (kind === 'Van' ? [
  slNoColumn,
  {
    label: 'Vehicle Type', key: 'vehicle_type', filterable: true,
    filterOptions: [{ label: 'bus', value: 'bus' }, { label: 'van', value: 'van' }],
    render: (_v, r: any) => {
      const hired = hireBusNos.has(String(r.bus_no ?? ''))
      return <Badge variant={hired ? 'warning' : 'purple'}>{hired ? 'Van · Hire' : 'Van'}</Badge>
    },
  },
  refNoColumn('Ref No'),
  dateColumn,
  {
    label: 'Status', key: 'trip_run_status', filterable: true,
    filterOptions: [{ label: 'Running', value: 'Running' }, { label: 'Full Trip', value: 'Full Trip' }, { label: 'Halt', value: 'Halt' }],
    render: (v) => <Badge variant={v === 'Halt' ? 'danger' : v === 'Full Trip' ? 'info' : 'success'}>{String(v ?? 'Running')}</Badge>,
  },
  {
    label: 'Van No', key: 'bus_no', filterable: true,
    render: (v) => <span className={`font-semibold ${hireBusNos.has(String(v ?? '')) ? 'text-amber-700' : ''}`}>{String(v ?? '—')}</span>,
  },
  { label: 'Line Code', key: 'line_code', filterable: true, render: dashOr },
  // Set on the van's service route (Masters > Service Routes).
  { label: 'Pick/Drop', key: 'pick_drop', filterable: true, render: (v) => String(v ?? '').trim() ? <span className="capitalize">{String(v)}</span> : dashOr(v) },
  {
    label: 'Driver', key: 'driver1_name', filterable: true,
    render: (v, r: any) => (
      <div>
        <span className="font-medium">{String(v || (hireBusNos.has(String(r.bus_no ?? '')) ? 'Hired' : '—'))}</span>
        {r.opt_driver1_name && <div className="text-xs text-slate-500">{r.opt_driver1_name}{r.opt_driver1_mobile ? ` · ${r.opt_driver1_mobile}` : ''}</div>}
      </div>
    ),
  },
  {
    label: 'Hirer', key: 'hirer_name', filterable: true,
    render: (v, r: any) => (
      <div>
        <div className="text-sm">{String(v ?? '—')}</div>
        {r.phone_number && <div className="text-xs text-slate-400">{r.phone_number}</div>}
      </div>
    ),
  },
  {
    label: 'Amount', key: 'booking_amount',
    render: (v) => v ? <span className="text-sm font-semibold">{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <span className="text-slate-300 text-xs">—</span>,
  },
  {
    // The voucher Trip Expenses filed for the trip, with both sides named — a
    // hired van reads "Hire vehicle charges → <the van owner's ledger>" so the
    // entry is checkable from the trip list without opening the voucher.
    label: 'Voucher', key: 'voucher_number', filterable: true,
    render: (v, r: any) => v
      ? (
        <div>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{String(v)}</span>
          {(r.debit_ledger_name || r.credit_ledger_name) && (
            <div className="text-[11px] text-slate-400 mt-1">
              <LedgerNameWithGroup name={r.debit_ledger_name} /> → <LedgerNameWithGroup name={r.credit_ledger_name} />
            </div>
          )}
        </div>
      )
      : <span className="text-slate-300 text-xs">—</span>,
  },
  { label: 'Remarks', key: 'remarks', render: (v) => <span className="text-xs text-slate-500 truncate max-w-[10rem] block">{String(v ?? '—')}</span> },
] : [
  slNoColumn,
  {
    label: 'Vehicle Type', key: 'vehicle_type', filterable: true,
    filterOptions: [{ label: 'bus', value: 'bus' }, { label: 'van', value: 'van' }],
    render: (_v, r: any) => {
      const hired = hireBusNos.has(String(r.bus_no ?? ''))
      return <Badge variant={hired ? 'warning' : 'info'}>{hired ? 'Bus · Hire' : 'Bus'}</Badge>
    },
  },
  refNoColumn('Ref ID'),
  dateColumn,
  {
    label: 'Status', key: 'trip_run_status', filterable: true,
    filterOptions: [{ label: 'Running', value: 'Running' }, { label: 'Full Trip', value: 'Full Trip' }, { label: 'Halt', value: 'Halt' }],
    render: (v) => <Badge variant={v === 'Halt' ? 'danger' : v === 'Full Trip' ? 'info' : 'success'}>{String(v ?? 'Running')}</Badge>,
  },
  {
    label: 'Bus No', key: 'bus_no', filterable: true,
    render: (v) => <span className={`font-semibold ${hireBusNos.has(String(v ?? '')) ? 'text-amber-700' : ''}`}>{String(v ?? '—')}</span>,
  },
  {
    label: 'Service No', key: 'service_no', filterable: true,
    render: (v, r: any) => (
      <div>
        <div>{dashOr(v)}</div>
        {r.trip_for && <div className="text-xs text-slate-400">{String(r.trip_for)}</div>}
      </div>
    ),
  },
  { label: 'Driver 1', key: 'driver1_name', filterable: true, render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'Driver 2', key: 'driver2_name', filterable: true, render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
  { label: 'Helper', key: 'helper_name', filterable: true, render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
  { label: 'Conductor', key: 'conductor_name', filterable: true, render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
  { label: 'Paid To', key: 'paid_to_name', filterable: true, render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
  {
    label: 'Amount', key: 'booking_amount',
    render: (v) => v ? <span className="text-sm font-semibold">{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <span className="text-slate-300 text-xs">—</span>,
  },
  { label: 'Debit Ledger', key: 'debit_ledger_name', filterable: true, render: (v) => <span className="text-sm"><LedgerNameWithGroup name={v} /></span> },
  { label: 'Credit Ledger', key: 'credit_ledger_name', filterable: true, render: (v) => <span className="text-sm"><LedgerNameWithGroup name={v} /></span> },
  {
    label: 'Voucher', key: 'voucher_number', filterable: true,
    render: (v) => v
      ? <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">{String(v)}</span>
      : <span className="text-slate-300 text-xs">—</span>,
  },
  { label: 'Remarks', key: 'remarks', render: (v) => <span className="text-xs text-slate-500 truncate max-w-[10rem] block">{String(v ?? '—')}</span> },
])

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

export default function TripCreationPage() {
  const qc = useQueryClient()
  // The create-trips grid is what this page is opened for, so it is open on arrival.
  const [showGrid, setShowGrid] = useState(true)
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
  // Always fresh: the sheet hides a service and a bus already used on the
  // date, and a trip created in another tab or by someone else must count too,
  // so the list is refetched on arrival and whenever this tab regains focus.
  const { data: tripData, isLoading } = useQuery({ queryKey: ['trips'], queryFn: () => tripsService.getTrips1(), staleTime: 0, refetchOnWindowFocus: true })
  const { data: busData } = useQuery({ queryKey: ['buses'], queryFn: () => mastersService.getBuses() })
  // Refetched on arrival and on focus like the trips: a service number switched
  // off under Masters (maybe in another tab) must drop out of the grid at once,
  // not after the 2-minute cache runs out.
  const { data: routeData } = useQuery({ queryKey: ['routes'], queryFn: () => mastersService.getServiceRoutes(), staleTime: 0, refetchOnWindowFocus: true })
  const { data: driverData } = useQuery({ queryKey: ['drivers'], queryFn: () => mastersService.getDrivers() })
  const { data: helperData } = useQuery({ queryKey: ['helpers'], queryFn: () => mastersService.getHelper({ staffreports: 'Helper' }) })
  const { data: staffData } = useQuery({ queryKey: ['staff-all'], queryFn: () => mastersService.getStaff({}) })
  const { data: activeStaffData } = useQuery({ queryKey: ['active-staff'], queryFn: () => mastersService.getActiveStaff() })
  const buses: any[] = (busData?.data ?? []).filter((b: any) => b.d_in === 0 && !b.issparetank)
  // A service number switched off under Masters > Service Numbers is hidden
  // from the day it was switched off (inactive_from) until it is activated
  // again; a sheet for an earlier date still lists it, as it ran then.
  const offeredOn = (r: any, date: string) => String(r.is_active ?? '1') !== '0'
    || (!!r.inactive_from && date < String(r.inactive_from).slice(0, 10))
  const allRoutes: any[] = (routeData?.data ?? []).filter((r: any) => offeredOn(r, tripDate))
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
  // busses.vehicle_type is a vehicle-type master value; any value naming a van
  // ("VAN", "PICKUP VAN") is a van, and anything else is treated as a bus, so
  // vehicles seeded before that column was filled in still show up on the Bus
  // tab rather than vanishing from both.
  const isVanVehicle = (b: any) => isVanVehicleType(b.vehicle_type)
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
  const driverName = (d: any) => String(d.nickname || d.driver_name || '')
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
  // Conductors come from staff_register, where fullName is the Aadhar name and
  // nickName is a separate short name (driver_register's `nickname` is the Aadhar
  // name instead, which is why driverName() below reads that one). Show the
  // Aadhar name here, matching the Staff Register.
  const conductorName = (c: any) => String(c?.fullName || c?.nickName || '')
  const conductorOptions = [NA_OPTION, optingOption(OPTING_CONDUCTOR), ...conductors.map((c: any) => ({
    value: String(c.id),
    label: withSuffix(conductorName(c), c.designation),
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
    opt_driver_name: '', opt_driver_mobile: '',
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
  // The hire is owed to the van's owner, so picking a hired van fills the Pay
  const columns = useMemo(() => makeColumns(hireBusNos, vehicleType), [hireBusNos, vehicleType])
  // The records table shows the trips of the kind the tab above is on: bus
  // trips under Bus, van trips under Van. A row's kind is its stored
  // vehicle_type; rows from before that column existed are bus trips.
  const shownTrips = allTrips.filter((t) => (String(t.vehicle_type ?? '') === 'van') === (vehicleType === 'Van'))
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

  // A bus runs one trip a day: once it is on a trip for the date it is not
  // offered to any other service that day. Buses already saved for the date
  // and buses picked on other rows of this sheet are both out; a row keeps
  // its own pick so the dropdown never blanks what it shows. Vans are exempt -
  // a van may run several services a day - so vanOptions is untouched.
  const busesOnDate = useMemo(() => {
    const set = new Set<string>()
    allTrips.forEach((t) => {
      const d = String(t.trip_date ?? t.cts ?? '').split('T')[0]
      if (d === tripDate && String(t.vehicle_type ?? '') !== 'van' && t.bus_no) set.add(String(t.bus_no))
    })
    return set
  }, [allTrips, tripDate])
  const busOptionsForRoute = (routeId: number) => {
    const own = gridRows[routeId]?.bus_no ?? ''
    const pickedElsewhere = new Set(
      Object.entries(gridRows)
        .filter(([id, row]) => Number(id) !== routeId && !existingByRoute[id] && row.bus_no)
        .map(([, row]) => String(row.bus_no)))
    return busOptions.filter((o) => o.value === own || (!busesOnDate.has(o.value) && !pickedElsewhere.has(o.value)))
  }
  // Same rule when editing a bus trip: buses on any other bus trip that date
  // are out, the trip's own bus stays.
  const editBusOptions = useMemo(() => {
    if (!editRow || editRow.vehicle_type === 'van') return busOptions
    const date = String(editRow.trip_date ?? '').split('T')[0]
    const taken = new Set<string>()
    allTrips.forEach((t) => {
      if (t.id === editRow.id) return
      const d = String(t.trip_date ?? t.cts ?? '').split('T')[0]
      if (d === date && String(t.vehicle_type ?? '') !== 'van' && t.bus_no) taken.add(String(t.bus_no))
    })
    return busOptions.filter((o) => o.value === String(editRow.bus_no ?? '') || !taken.has(o.value))
  }, [editRow, allTrips, busOptions])

  // Picking a new date starts a fresh roster — already-created rows come from existingByRoute instead
  useEffect(() => { setGridRows({}); setVanRows({}) }, [tripDate])

  const updateRow = (routeId: number, patch: Partial<GridRow>) =>
    setGridRows((g) => ({ ...g, [routeId]: { ...(g[routeId] ?? makeEmptyGridRow()), ...patch } }))

  // A bus keeps much the same crew trip after trip, so picking a bus loads the
  // crew from the last trip it ran - four pickers already filled instead of four
  // blank ones. A slot is only filled when its person is still on the register
  // (or is an Opting name, which is stored as a name with no id and so survives
  // a register change): a driver deleted since that trip would otherwise write
  // an id no longer behind any option, leaving a cell that reads as blank with
  // no way to tell it was ever filled.
  const crewSlot = (last: any, list: any[], idKey: string, nameKey: string, optKeys?: [string, string]) => {
    const id = String(last?.[idKey] ?? '')
    const name = String(last?.[nameKey] ?? '').trim()
    // An Opting seat is stored as a bare name with no id, so it is filled from
    // the name alone. Anything else needs an id that still resolves to a person
    // on the register - a name on its own points at no option, so the picker
    // would show the cell blank with no sign it was ever filled.
    if (!isOptingName(name) && !(id && list.some((x: any) => String(x.id) === id))) return {}
    return { [idKey]: isOptingName(name) ? '' : id, [nameKey]: name, ...(optKeys ? { [optKeys[0]]: '', [optKeys[1]]: '' } : {}) }
  }

  // A bus with no trip history is left alone rather than cleared - a row the
  // user has already filled in should not be emptied because the bus they
  // switched to happens to be a new one.
  const { mutate: loadLastCrew } = useMutation({
    mutationFn: ({ busNo }: { routeId: number; busNo: string }) =>
      tripsService.getLastTripForBus(busNo).then((r: any) => r?.data?.[0] ?? null),
    onSuccess: (last, { routeId, busNo }) => {
      if (!last) return
      const patch = {
        ...crewSlot(last, drivers, 'driver1_id', 'driver1_name', ['opt_driver1_id', 'opt_driver1_name']),
        ...crewSlot(last, drivers, 'driver2_id', 'driver2_name', ['opt_driver2_id', 'opt_driver2_name']),
        ...crewSlot(last, helpers, 'helper_id', 'helper_name', ['opt_helper_id', 'opt_helper_name']),
        // The conductor has no Opting id/name pair on the row, so it fills from
        // the register alone.
        ...crewSlot(last, conductors, 'conductor_id', 'conductor_name'),
      }
      setGridRows((g) => {
        const cur = g[routeId] ?? makeEmptyGridRow()
        // Picking a second bus before the first lookup lands would otherwise let
        // the stale response write the previous bus's crew onto the row.
        if (String(cur.bus_no) !== String(busNo)) return g
        return { ...g, [routeId]: { ...cur, ...patch } }
      })
    },
  })

  const pickBus = (routeId: number, busNo: string) => {
    updateRow(routeId, { bus_no: busNo })
    if (busNo) loadLastCrew({ routeId, busNo })
  }

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
        toast.success(`${res.data?.inserted ?? 0} trip(s) created for ${tripDate}${res.data?.skipped ? ` (${res.data.skipped} already booked for this date, skipped)` : ''}${res.data?.skipped_bus ? ` (${res.data.skipped_bus} skipped: bus already on a trip that day)` : ''}${res.data?.skipped_inactive ? ` (${res.data.skipped_inactive} skipped: service number inactive)` : ''}`)
        qc.invalidateQueries({ queryKey: ['trips'] })
        qc.invalidateQueries({ queryKey: ['trip-expenses'] })
        setGridRows({})
      } else toast.error('Failed to create trips')
    },
    onError: () => toast.error('Server error'),
  })

  const updateVanRow = (routeId: number, patch: Partial<VanRow>) =>
    setVanRows((rows) => ({ ...rows, [routeId]: { ...(rows[routeId] ?? makeEmptyVanRow()), ...patch } }))

  // The Amount is live when there is someone to pay it to: the owner of a hired
  // van, or an opting driver covering the seat. Either way it must be filled;
  // an own van with a registered driver needs the driver instead. Every row
  // still needs a van and a hirer.
  // A halted van never left the yard: there is no driver on it, no hirer and
  // nothing to pay, so every one of those cells goes inactive and the row is
  // complete on its own — the same rule the Bus grid gives a halted route.
  const vanHalted = (row: VanRow) => row.status === 'Halt'
  const vanAmountActive = (row: VanRow) => !vanHalted(row) && (isHireBus(row.bus_no) || isOptingName(row.driver_name))
  // The hirer - who the vehicle is taken from - only exists on a hired van, so
  // the name and mobile are live and required there alone; an own van has
  // nobody to name and those cells go inactive, like Amount and Pay To Ledger.
  const vanHirerActive = (row: VanRow) => !vanHalted(row) && isHireBus(row.bus_no)
  // The same Name / Mobile cells take the opting driver on an own van - the
  // one person off the register the row has to name - so the sheet has a
  // single pair of inputs rather than a second pair under the driver.
  const vanOptingActive = (row: VanRow) => !vanHalted(row) && !isHireBus(row.bus_no) && isOptingName(row.driver_name)
  const vanRowReady = (row: VanRow | undefined) => {
    if (!row) return false
    if (vanHalted(row)) return true
    if (!row.bus_no) return false
    if (vanHirerActive(row) && !row.hirer_name) return false
    // A mobile is required of an opting driver and optional for a hirer, but
    // either way a number that is there has to be a real one.
    if (vanHirerActive(row) && row.phone_number && !isValidMobile(row.phone_number)) return false
    if (vanOptingActive(row) && (!row.opt_driver_name.trim() || !isValidMobile(row.opt_driver_mobile))) return false
    if (!vanAmountActive(row)) return !!row.driver_name
    if (Number(row.amount) <= 0) return false
    // The amount is all the sheet records; the voucher for it (hire charge or
    // opting pay) is filed from Trip Expenses, so no ledger is picked here.
    return true
  }
  // Only services that have no trip for this date yet, so the same van service
  // cannot be booked twice on one day - the rule the bus roster already applies.
  const readyVanRows = vanRoutes
    .filter((r) => !existingByRoute[String(r.id)] && vanRowReady(vanRows[r.id]))
    .map((r) => ({ route: r, row: vanRows[r.id] as VanRow }))

  const { mutate: submitVanRows, isPending: submittingVan } = useMutation({
    mutationFn: () => {
      const rows = readyVanRows.map(({ route, row }) => {
        // Anything typed before the row was switched to Halt is dropped rather
        // than filed against a trip that never ran.
        const halted = vanHalted(row)
        return {
          // The picker shows the service number's line code as the default; the
          // row only stores one when it is changed, so the default is sent too -
          // untouched rows used to save with no line code at all.
          vehicle_type: 'van', line_code: row.line_code || route.line_code || '', bus_no: row.bus_no,
          service_no: route.serviceNo, service_no_id: String(route.id),
          trip_for: route.serviceFor, trip_for_id: route.service_for_id,
          driver1_id: halted ? '' : row.driver_id, driver1_name: halted ? '' : row.driver_name,
          opt_driver1_name: !halted && isOptingName(row.driver_name) ? row.opt_driver_name.trim() : '',
          opt_driver1_mobile: !halted && isOptingName(row.driver_name) ? row.opt_driver_mobile : '',
          hirer_name: vanHirerActive(row) ? row.hirer_name : '', phone_number: vanHirerActive(row) ? row.phone_number : '',
          booking_amount: vanAmountActive(row) ? row.amount : '',
          // No ledgers: the hire charge is posted from Trip Expenses, where the
          // Debit (Hire vehicle charges) and Credit (the van owner's ledger from
          // Bus Masters) are filled in for the user.
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
        toast.success(`${res.data?.inserted ?? 0} van trip(s) created for ${tripDate}${res.data?.skipped ? ` (${res.data.skipped} already booked for this date, skipped)` : ''}${res.data?.skipped_invalid ? ` (${res.data.skipped_invalid} incomplete, skipped)` : ''}`)
        if (res.data?.skipped_invalid) toast.error(`Not saved: ${(res.data.invalid_reasons ?? []).join('; ')}`)
        qc.invalidateQueries({ queryKey: ['trips'] })
        qc.invalidateQueries({ queryKey: ['trip-expenses'] })
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
      opt_driver1_mobile: String(row.opt_driver1_mobile ?? ''),
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
      booking_amount: row.booking_amount ? String(row.booking_amount) : '',
      remarks: String(row.remarks ?? ''),
    })
  }
  // Same rule as the Van grid: the amount is live for a hired van or an opting
  // driver, and cleared for an own van with a registered driver.
  // A halted van has no driver, hirer or amount here either.
  const editHalted = editRow?.vehicle_type === 'van' && editForm.trip_run_status === 'Halt'
  const editAmountActive = !editHalted && (isHireBus(editForm.bus_no) || isOptingName(editForm.driver1_name))
  const editHirerActive = !editHalted && isHireBus(editForm.bus_no)
  const editOptingActive = !editHalted && !isHireBus(editForm.bus_no) && isOptingName(editForm.driver1_name)
  const patchEdit = (patch: Record<string, string>) => setEditForm((f) => ({ ...f, ...patch }))
  // The hire on this trip is already filed and sits on the books against the
  // hired van. Turning the trip into an own-van one would leave that voucher
  // standing for a vehicle the trip no longer used, so the expense has to come
  // off in Trip Expenses first.
  const hirePosted = editRow?.vehicle_type === 'van' && !!editRow?.voucher_number && isHireBus(String(editRow?.bus_no ?? ''))
  const hirePostedConflict = hirePosted && !!editForm.bus_no && !isHireBus(editForm.bus_no)
  // Once a van trip's expense is filed, its van, driver arrangement, Amount and
  // status are what the voucher was posted from. Changing them here left that
  // voucher standing for a trip that no longer matched it (an opting pay on a
  // hired van, a 1200 hire on a 1500 trip), so they are locked until the
  // expense is edited or deleted in Trip Expenses. The server holds the same rule.
  const vanFiled = editRow?.vehicle_type === 'van' && Number(editRow?.status) === 1

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
        driver1_id: editHalted ? '' : editForm.driver1_id, driver1_name: editHalted ? '' : editForm.driver1_name,
        opt_driver1_id: editHalted ? '' : editForm.opt_driver1_id, opt_driver1_name: editHalted ? '' : editForm.opt_driver1_name,
        updatedby_id: localStorage.getItem('user_id') ?? '',
        updatedby_name: localStorage.getItem('usr_nm') ?? '',
        updated_date: localDateTime(),
      }
      return tripsService.updateTrip(isVan
        ? { ...common, hirer_name: editHirerActive ? editForm.hirer_name : '', phone_number: editHirerActive ? editForm.phone_number : '', line_code: editForm.line_code,
            opt_driver1_mobile: !editHalted && isOptingName(editForm.driver1_name) ? editForm.opt_driver1_mobile : '',
            booking_amount: editAmountActive ? editForm.booking_amount : '' }
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
        qc.invalidateQueries({ queryKey: ['trip-expenses'] })
        setEditRow(null)
      } else toast.error(res?.msg ?? 'Failed to update trip')
    },
    onError: () => toast.error('Server error'),
  })

  // The roster is long, so Submit is offered both above and below it (the
  // same button, so the count and the disabled state never disagree), with a
  // jump to the other end beside each.
  const submitButton = vehicleType === 'Van' ? (
    <Button onClick={() => submitVanRows()} disabled={submittingVan || readyVanRows.length === 0} className="px-10 h-11">
      <Save className="w-4 h-4" />
      {submittingVan ? 'Submitting…' : `Submit ${readyVanRows.length > 0 ? `(${readyVanRows.length})` : ''}`}
    </Button>
  ) : (
    <Button onClick={() => submitGrid()} disabled={submittingGrid || submitRoutes.length === 0 || incompleteRoutes.length > 0} className="px-10 h-11">
      <Save className="w-4 h-4" />
      {submittingGrid ? 'Submitting…' : `Submit ${submitRoutes.length > 0 ? `(${submitRoutes.length})` : ''}`}
    </Button>
  )
  // The roster is its own scroll box (max 70vh). A small panel docked to its
  // right edge - always in view, never over the rows - jumps to either end of
  // the sheet by scrolling that box, not the page.
  const rosterJump = (
    <div className="pointer-events-none absolute inset-y-0 right-3 z-20 flex items-center">
      <div className="pointer-events-auto flex flex-col rounded-2xl bg-white/95 backdrop-blur shadow-lg border border-slate-200 p-1">
        {(['top', 'bottom'] as const).map((dir, i) => (
          <button key={dir} type="button"
            onClick={(e) => {
              const box = (e.currentTarget.closest('[data-roster]') as HTMLElement | null)?.querySelector('table')?.parentElement as HTMLElement | null
              box?.scrollTo({ top: dir === 'top' ? 0 : box.scrollHeight, behavior: 'smooth' })
            }}
            title={dir === 'top' ? 'Scroll to the top of the sheet' : 'Scroll to the bottom of the sheet'}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors ${i === 1 ? 'border-t border-slate-100' : ''}`}>
            {dir === 'top' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {dir === 'top' ? 'Top' : 'Bottom'}
          </button>
        ))}
      </div>
    </div>
  )

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
                <div className="flex items-center gap-2">
                  {submitButton}
                  <button onClick={() => setShowGrid(false)} className="text-slate-400 hover:text-red-500 transition-colors p-2" title="Close">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* The records table below switches with this tab, and its
                  column filters belong to the columns of one kind, so they are
                  dropped rather than carried over to columns that don't exist. */}
              <TopNavTabs tabs={['Bus', 'Van']} activeTab={vehicleType} onChange={(t) => { setVehicleType(t as 'Bus' | 'Van'); setColumnFilters({}) }} />

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
                  <div className="relative" data-roster>
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
                          <th className="py-2.5 px-3 w-40">Name</th>
                          <th className="py-2.5 px-3 w-32">Mobile</th>
                          <th className="py-2.5 px-3 w-32">Amount</th>
                          <th className="py-2.5 px-3 w-44">Voucher</th>
                          <th className="py-2.5 px-3 w-80">Remarks</th>
                          <th className="py-2.5 px-3 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {vanRoutes.length === 0 ? (
                          <tr><td colSpan={14} className="py-6 text-center text-sm text-slate-400">
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
                                <td className="py-2 px-3 text-slate-600 text-xs">{existing.hirer_name || existing.opt_driver1_name || '—'}</td>
                                <td className="py-2 px-3 text-slate-500 text-xs">{existing.phone_number || existing.opt_driver1_mobile || '—'}</td>
                                <td className="py-2 px-3 text-slate-600 text-xs">{existing.booking_amount ? `₹${Number(existing.booking_amount).toLocaleString('en-IN')}` : '—'}</td>
                                {/* The trip's voucher, once Trip Expenses has filed it — the
                                    row's proof that the charge reached the books. */}
                                <td className="py-2 px-3 text-xs">
                                  {existing.voucher_number ? (
                                    <>
                                      <div className="font-mono text-emerald-700">{existing.voucher_number}</div>
                                      {existing.credit_ledger_name && <div className="text-slate-400"><LedgerNameWithGroup name={existing.credit_ledger_name} /></div>}
                                    </>
                                  ) : <span className="text-slate-400">—</span>}
                                </td>
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
                          const halted = vanHalted(row)
                          const amountActive = vanAmountActive(row)
                          const hirerActive = vanHirerActive(row)
                          const optingActive = vanOptingActive(row)
                          // Whose name and mobile the two cells hold on this row.
                          const nameKey = optingActive ? 'opt_driver_name' : 'hirer_name'
                          const mobileKey = optingActive ? 'opt_driver_mobile' : 'phone_number'
                          const nameActive = hirerActive || optingActive
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
                                    ? { bus_no: v, driver_id: '', driver_name: '', opt_driver_name: '', opt_driver_mobile: '' }
                                    : { bus_no: v, amount: '' })}
                                  onClear={() => updateVanRow(r.id, { bus_no: '' })} />
                                {hired && <p className="text-[10px] font-bold text-amber-700 mt-1">Hired vehicle</p>}
                              </td>
                              <td className="py-2 px-3">
                                {hired || halted ? (
                                  <p className="text-xs text-slate-400 h-11 flex items-center">Not applicable</p>
                                ) : (
                                  <SearchableSelect className="min-w-[14rem]" placeholder="Select" options={driverOptions}
                                    value={personValue(row.driver_id, row.driver_name, OPTING_DRIVER)}
                                    onChange={(v) => {
                                      if (isOptingName(v)) { updateVanRow(r.id, { driver_id: '', driver_name: v }); return }
                                      // A registered driver is paid through payroll, so an
                                      // amount typed for an opting pick is dropped with it.
                                      const d = drivers.find((dr) => String(dr.id) === v)
                                      updateVanRow(r.id, { driver_id: v, driver_name: d?.nickname || d?.driver_name || '', amount: '', opt_driver_name: '', opt_driver_mobile: '' })
                                    }}
                                    onClear={() => updateVanRow(r.id, { driver_id: '', driver_name: '', amount: '', opt_driver_name: '', opt_driver_mobile: '' })} />
                                )}
                                {optingActive && <p className="text-[10px] font-bold text-blue-700 mt-1">Name and mobile in the next two cells</p>}
                              </td>
                              {/* Hirer on a hired van, opting driver on an own van: the
                                  same two cells, bound to whichever the row has. */}
                              <td className="py-2 px-3">
                                <Input value={nameActive ? row[nameKey] : ''} disabled={!nameActive}
                                  onChange={(e) => updateVanRow(r.id, { [nameKey]: e.target.value })}
                                  placeholder={optingActive ? 'Opting driver name' : hirerActive ? 'Hirer name' : '—'} className="h-11 text-sm" />
                                {nameActive && <p className="text-[10px] font-semibold text-slate-400 mt-1">{optingActive ? 'Opting driver' : 'Hirer'}</p>}
                              </td>
                              <td className="py-2 px-3">
                                <Input inputMode="numeric" maxLength={10} value={nameActive ? row[mobileKey] : ''} disabled={!nameActive}
                                  onChange={(e) => updateVanRow(r.id, { [mobileKey]: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                  placeholder={nameActive ? 'Mobile' : '—'} className="h-11 text-sm" />
                                {nameActive && row[mobileKey] && !isValidMobile(row[mobileKey]) && (
                                  <p className="text-[10px] font-semibold text-red-500 mt-1">10 digits, starting 6-9</p>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <Input type="number" value={amountActive ? row.amount : ''} disabled={!amountActive}
                                  onChange={(e) => updateVanRow(r.id, { amount: e.target.value })}
                                  placeholder={amountActive ? 'Amount' : '—'} className="h-11 text-sm" />
                              </td>
                              {/* Nothing is posted from the sheet: the hire charge (or an
                                  opting driver's pay) is filed from Trip Expenses, and the
                                  voucher it makes shows in this column on the created row. */}
                              <td className="py-2 px-3">
                                <p className="text-xs text-slate-400 h-11 flex items-center">{amountActive ? 'Filed from Trip Expenses' : 'Not applicable'}</p>
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
{rosterJump}
</div>

                  {/* No "Add Row": the Van tab is a roster of every van service for
                      the date, the same as the Bus tab, so rows are not added by hand. */}
                  <div className="flex items-center justify-center gap-3 mt-3">
                    {submitButton}
                  </div>
                </>
              ) : busRoutes.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No Bus service routes found — add one under Masters → Service Routes first.</p>
              ) : (
                <div className="relative" data-roster>
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
                              <SearchableSelect className="min-w-[13rem]" placeholder="Select" options={busOptionsForRoute(r.id)}
                                value={row.bus_no} onChange={(v) => pickBus(r.id, v)} onClear={() => updateRow(r.id, { bus_no: '' })} />
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
                                    updateRow(r.id, { conductor_id: v, conductor_name: conductorName(c) })
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
{rosterJump}
</div>
              )}

              {vehicleType === 'Bus' && (
                <div className="flex items-center justify-center gap-3 mt-6">
                  {incompleteRoutes.length > 0 && (
                    <span className="text-xs font-semibold text-amber-600">
                      {incompleteRoutes.length} row(s) need Driver 1
                    </span>
                  )}
                  {submitButton}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trip Records Table ── */}
      <DataTable
        title={`${vehicleType} Trip Records (${shownTrips.length})`}
        columns={columns}
        data={shownTrips}
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
                      {editRow.trip_date ? ' · ' + formatDate(editRow.trip_date) : ''}
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
                  <Select value={editForm.trip_run_status} disabled={vanFiled} onChange={(e) => patchEdit({ trip_run_status: e.target.value })}>
                    <option value="Running">Running</option>
                    <option value="Full Trip">Full Trip</option>
                    <option value="Halt">Halt</option>
                  </Select>
                </div>
                <div>
                  <Label>Bus No <span className="text-red-500">*</span></Label>
                  <SearchableSelect placeholder="Select" options={editRow.vehicle_type === 'van' ? vanOptions : editBusOptions} disabled={vanFiled}
                    value={editForm.bus_no}
                    onChange={(v) => patchEdit(editRow.vehicle_type !== 'van'
                      ? { bus_no: v }
                      // Changing a van between hired and own changes who is paid,
                      // so whatever belonged to the old arrangement goes with it.
                      // The Amount especially: left behind, the hire charge was
                      // read as the opting driver's pay the moment a driver was
                      // picked, and saved against them.
                      : isHireBus(v)
                        ? { bus_no: v, driver1_id: '', driver1_name: '', opt_driver1_id: '', opt_driver1_name: '', opt_driver1_mobile: '', booking_amount: '' }
                        : { bus_no: v, hirer_name: '', phone_number: '', booking_amount: '' })}
                    onClear={() => patchEdit({ bus_no: '' })} />
                </div>

                {editRow.vehicle_type === 'van' ? (
                  <>
                    <div>
                      <Label>Driver {!editHalted && <span className="text-red-500">*</span>}</Label>
                      <SearchableSelect disabled={editHalted || vanFiled} placeholder={editHalted ? '—' : 'Select'} options={driverOptions} value={editHalted ? '' : personValue(editForm.driver1_id, editForm.driver1_name, OPTING_DRIVER)}
                        onChange={(v) => patchEdit(personPatch(v, drivers, driverName, 'driver1_id', 'driver1_name', 'opt_driver1_id', 'opt_driver1_name'))}
                        onClear={() => patchEdit(clearPerson('driver1_id', 'driver1_name', 'opt_driver1_id', 'opt_driver1_name'))} />
                    </div>
                    <div>
                      <Label>Line Code</Label>
                      <MasterListPicker panelId="van-edit-line-code-panel" queryKey="line-codes" queryFn={() => mastersService.getLineCodes()}
                        valueKey="line_code" value={editForm.line_code} onChange={(v) => patchEdit({ line_code: v })} placeholder="Select" />
                    </div>
                    {/* Hirer on a hired van, opting driver on an own van: the same
                        two fields, bound to whichever the trip has. */}
                    <div>
                      <Label>{editOptingActive ? 'Opting Driver Name' : 'Hirer Name'} {(editHirerActive || editOptingActive) && <span className="text-red-500">*</span>}</Label>
                      <Input value={editOptingActive ? editForm.opt_driver1_name : editHirerActive ? editForm.hirer_name : ''} disabled={!editHirerActive && !editOptingActive}
                        placeholder={editHirerActive || editOptingActive ? '' : '—'}
                        onChange={(e) => patchEdit(editOptingActive ? { opt_driver1_name: e.target.value } : { hirer_name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Mobile {editOptingActive && <span className="text-red-500">*</span>}</Label>
                      <Input inputMode="numeric" maxLength={10} value={editOptingActive ? editForm.opt_driver1_mobile : editHirerActive ? editForm.phone_number : ''} disabled={!editHirerActive && !editOptingActive}
                        placeholder={editHirerActive || editOptingActive ? '' : '—'}
                        onChange={(e) => patchEdit(editOptingActive ? { opt_driver1_mobile: e.target.value.replace(/\D/g, '').slice(0, 10) } : { phone_number: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                      {(() => {
                        const m = editOptingActive ? editForm.opt_driver1_mobile : editHirerActive ? editForm.phone_number : ''
                        return m && !isValidMobile(m)
                          ? <p className="text-[11px] font-semibold text-red-500 mt-1">10 digits, starting 6-9</p>
                          : null
                      })()}
                    </div>
                    <div>
                      <Label>Amount {editAmountActive && <span className="text-red-500">*</span>}</Label>
                      <Input type="number" value={editAmountActive ? editForm.booking_amount : ''} disabled={!editAmountActive || vanFiled}
                        onChange={(e) => patchEdit({ booking_amount: e.target.value })}
                        placeholder={editAmountActive ? 'Amount' : '—'} />
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
                            patchEdit({ conductor_id: v, conductor_name: conductorName(c) })
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

              {vanFiled && (
                <div className="px-6 pb-2">
                  <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                    The expense for this trip is already filed{editRow.voucher_number ? ` under voucher ${String(editRow.voucher_number)}` : ''}. The van, driver, amount and status are locked — edit or delete the expense in Trip Expenses to change them.
                  </p>
                </div>
              )}
              {hirePostedConflict && (
                <div className="px-6 pb-2">
                  <p className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                    The hire on this trip is already filed under voucher {String(editRow.voucher_number)}. Delete that expense in Trip Expenses before moving the trip onto an own van.
                  </p>
                </div>
              )}
              <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                <Button variant="outline" onClick={() => setEditRow(null)}>Cancel</Button>
                <Button
                  onClick={() => saveEdit()}
                  disabled={savingEdit || !editForm.bus_no || hirePostedConflict ||
                    (editRow.vehicle_type === 'van'
                      ? ((editHirerActive && !editForm.hirer_name) || (editAmountActive ? !(Number(editForm.booking_amount) > 0) : !editForm.driver1_name)
                        || (editHirerActive && !!editForm.phone_number && !isValidMobile(editForm.phone_number))
                        || (editOptingActive && (!String(editForm.opt_driver1_name ?? '').trim() || !isValidMobile(editForm.opt_driver1_mobile))))
                      : (!editForm.driver1_name && !editForm.opt_driver1_name))}
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
