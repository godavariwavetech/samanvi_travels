import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Map, Save, X, Plus, CalendarDays, Trash2 } from 'lucide-react'
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
  remarks: string
}

const columns: Column[] = [
  {
    label: 'Vehicle Type', key: 'vehicle_type', filterable: true,
    filterOptions: [{ label: 'bus', value: 'bus' }, { label: 'van', value: 'van' }],
    render: (v) => <Badge variant={v === 'van' ? 'purple' : 'info'}>{v === 'van' ? 'Van' : 'Bus'}</Badge>,
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
        <div className="font-semibold">{String(v ?? '—')}</div>
        <div className="text-xs text-slate-500">{r.vehicle_type === 'van' ? r.line_code : `${r.service_no ?? ''} · ${r.trip_for ?? ''}`}</div>
      </div>
    ),
  },
  { label: 'Driver 1', key: 'driver1_name', filterable: true, render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'Opting Driver 1', key: 'opt_driver1_name', filterable: true, render: (v) => <span className="text-slate-400 text-xs">{String(v ?? 'NA')}</span> },
  { label: 'Driver 2', key: 'driver2_name', filterable: true, render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
  { label: 'Opting Driver 2', key: 'opt_driver2_name', filterable: true, render: (v) => <span className="text-slate-400 text-xs">{String(v ?? 'NA')}</span> },
  { label: 'Helper', key: 'helper_name', filterable: true, render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
  { label: 'Opting Helper', key: 'opt_helper_name', filterable: true, render: (v) => <span className="text-slate-400 text-xs">{String(v ?? 'NA')}</span> },
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
  const [vanRows, setVanRows] = useState<VanRow[]>([])
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

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
  // designation is a free-text/master-picker field, not a fixed enum, so its
  // casing varies by whoever entered it (e.g. "CONDUCTOR" vs "Conductor") —
  // match case-insensitively or real conductors silently vanish from this list.
  const conductors: any[] = (activeStaffData?.data ?? []).filter((s: any) => String(s.designation ?? '').toUpperCase() === 'CONDUCTOR')

  // Option lists for the searchable dropdowns — built once per render and shared
  // by every grid row, rather than re-mapping the same master list per <td>.
  const busOptions = buses.map((b: any) => ({ value: String(b.bus_no), label: String(b.bus_no) }))
  const driverOptions = drivers.map((d: any) => ({ value: String(d.id), label: String(d.nickname ?? d.driver_name ?? '') }))
  const helperOptions = helpers.map((h: any) => ({ value: String(h.id), label: String(h.helper_name ?? h.nickname ?? '') }))
  const conductorOptions = conductors.map((c: any) => ({ value: String(c.id), label: String(c.nickName ?? c.fullName ?? '') }))
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
    paid_to_id: '', paid_to_name: '', paid_to_type: '', paid_to_ledger_id: '',
    remarks: '',
  })
  const makeEmptyVanRow = (): VanRow => ({
    status: 'Running', line_code: '', bus_no: '',
    driver_id: '', driver_name: '',
    hirer_name: '', phone_number: '',
    remarks: '',
  })

  const allTrips: any[] = tripData?.data ?? []

  // Bus grid only shows Bus-type routes (any Van-type routes added via Service
  // Numbers are irrelevant here — Van trips are ad-hoc rows, not roster-driven).
  const serviceForOptions = [...new Set(allRoutes.map((r) => r.serviceFor).filter(Boolean))]
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
  useEffect(() => { setGridRows({}) }, [tripDate])

  const updateRow = (routeId: number, patch: Partial<GridRow>) =>
    setGridRows((g) => ({ ...g, [routeId]: { ...(g[routeId] ?? makeEmptyGridRow()), ...patch } }))

  const filledRoutes = busRoutes.filter((r) => !existingByRoute[String(r.id)] && gridRows[r.id]?.status !== 'Halt' && gridRows[r.id]?.bus_no)
  const incompleteRoutes = filledRoutes.filter((r) => {
    const row = gridRows[r.id]
    return !row?.driver1_name
  })

  const { mutate: submitGrid, isPending: submittingGrid } = useMutation({
    mutationFn: () => {
      const rows = filledRoutes.map((r) => {
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

  const addVanRow = () => setVanRows((rows) => [...rows, makeEmptyVanRow()])
  const removeVanRow = (i: number) => setVanRows((rows) => rows.filter((_, idx) => idx !== i))
  const updateVanRow = (i: number, patch: Partial<VanRow>) =>
    setVanRows((rows) => rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))

  const readyVanRows = vanRows
    .map((row, i) => ({ row, i }))
    .filter(({ row }) => row.status !== 'Halt' && row.bus_no && row.driver_name && row.hirer_name)

  const { mutate: submitVanRows, isPending: submittingVan } = useMutation({
    mutationFn: () => {
      const rows = readyVanRows.map(({ row }) => ({
        vehicle_type: 'van', line_code: row.line_code, bus_no: row.bus_no,
        driver1_id: row.driver_id, driver1_name: row.driver_name,
        hirer_name: row.hirer_name, phone_number: row.phone_number,
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
        setVanRows([])
      } else toast.error('Failed to create trips')
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
                          <th className="py-2.5 px-3 w-44">Line Code</th>
                          <th className="py-2.5 px-3 w-32">Status</th>
                          <th className="py-2.5 px-3 w-52">Bus No</th>
                          <th className="py-2.5 px-3 w-56">Driver</th>
                          <th className="py-2.5 px-3 w-40">Hirer Name</th>
                          <th className="py-2.5 px-3 w-32">Mobile</th>
                          <th className="py-2.5 px-3 w-80">Remarks</th>
                          <th className="py-2.5 px-3 w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {vanRows.length === 0 ? (
                          <tr><td colSpan={9} className="py-6 text-center text-sm text-slate-400">No rows yet — click "+ Add Row" to start a van trip entry.</td></tr>
                        ) : vanRows.map((row, i) => {
                          return (
                            <tr key={i} className="border-b border-slate-100 align-top">
                              <td className="py-2 px-3 text-slate-500">{i + 1}</td>
                              <td className="py-2 px-3">
                                <MasterListPicker panelId={`van-line-code-panel-${i}`} queryKey="line-codes" queryFn={() => mastersService.getLineCodes()}
                                  valueKey="line_code" value={row.line_code} onChange={(v) => updateVanRow(i, { line_code: v })} placeholder="Select" />
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={row.status}
                                  onChange={(e) => updateVanRow(i, { status: e.target.value as TripRunStatus })}
                                  className="w-full h-11 rounded-xl border border-slate-200 bg-white text-sm px-3 shadow-sm transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400"
                                >
                                  <option value="Running">Running</option>
                                  <option value="Full Trip">Full Trip</option>
                                  <option value="Halt">Halt</option>
                                </select>
                              </td>
                              <td className="py-2 px-3">
                                <SearchableSelect className="min-w-[13rem]" placeholder="Select" options={busOptions}
                                  value={row.bus_no} onChange={(v) => updateVanRow(i, { bus_no: v })} onClear={() => updateVanRow(i, { bus_no: '' })} />
                              </td>
                              <td className="py-2 px-3">
                                <SearchableSelect className="min-w-[14rem]" placeholder="Select" options={driverOptions} value={row.driver_id}
                                  onChange={(v) => { const d = drivers.find((dr) => String(dr.id) === v); updateVanRow(i, { driver_id: v, driver_name: d?.nickname ?? d?.driver_name ?? '' }) }}
                                  onClear={() => updateVanRow(i, { driver_id: '', driver_name: '' })} />
                              </td>
                              <td className="py-2 px-3">
                                <Input value={row.hirer_name} onChange={(e) => updateVanRow(i, { hirer_name: e.target.value })}
                                  placeholder="Name" className="h-11 text-sm" />
                              </td>
                              <td className="py-2 px-3">
                                <Input inputMode="numeric" maxLength={10} value={row.phone_number}
                                  onChange={(e) => updateVanRow(i, { phone_number: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                                  placeholder="Mobile" className="h-11 text-sm" />
                              </td>
                              <td className="py-2 px-3">
                                <Input value={row.remarks} onChange={(e) => updateVanRow(i, { remarks: e.target.value })}
                                  placeholder="Remarks" className="h-11 text-sm" />
                              </td>
                              <td className="py-2 px-3">
                                <button onClick={() => removeVanRow(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </DualScrollTable>

                  <div className="flex items-center justify-center gap-3 mt-3">
                    <Button variant="ghost" onClick={addVanRow}>
                      <Plus className="w-4 h-4" /> Add Row
                    </Button>
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
                        <th className="py-2.5 px-3 w-48">Opting Driver 1</th>
                        <th className="py-2.5 px-3 w-56">Driver 2</th>
                        <th className="py-2.5 px-3 w-48">Opting Driver 2</th>
                        <th className="py-2.5 px-3 w-52">Helper</th>
                        <th className="py-2.5 px-3 w-48">Opting Helper</th>
                        <th className="py-2.5 px-3 w-52">Conductor</th>
                        <th className="py-2.5 px-3 w-64">Paid To</th>
                        <th className="py-2.5 px-3 w-80">Remarks</th>
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
                              <td className="py-2 px-3 text-slate-600">{existing.driver1_name || '—'}</td>
                              <td className="py-2 px-3 text-slate-500 text-xs">{existing.opt_driver1_name || 'NA'}</td>
                              <td className="py-2 px-3 text-slate-500 text-xs">{existing.driver2_name || '—'}</td>
                              <td className="py-2 px-3 text-slate-500 text-xs">{existing.opt_driver2_name || 'NA'}</td>
                              <td className="py-2 px-3 text-slate-500 text-xs">{existing.helper_name || '—'}</td>
                              <td className="py-2 px-3 text-slate-500 text-xs">{existing.opt_helper_name || 'NA'}</td>
                              <td className="py-2 px-3 text-slate-500 text-xs">{existing.conductor_name || '—'}</td>
                              <td className="py-2 px-3 text-slate-600 text-xs">{existing.paid_to_name || '—'}</td>
                              <td className="py-2 px-3 text-slate-500 text-xs truncate max-w-[9rem]">{existing.remarks || '—'}</td>
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
                                <SearchableSelect className="min-w-[14rem] flex-1" placeholder="Select" options={driverOptions} value={row.driver1_id}
                                  onChange={(v) => { const d = drivers.find((dr) => String(dr.id) === v); updateRow(r.id, { driver1_id: v, driver1_name: d?.nickname ?? d?.driver_name ?? '' }) }}
                                  onClear={() => updateRow(r.id, { driver1_id: '', driver1_name: '' })} />
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <SearchableSelect className="min-w-[12rem]" placeholder="NA" options={driverOptions} value={row.opt_driver1_id}
                                onChange={(v) => { const d = drivers.find((dr) => String(dr.id) === v); updateRow(r.id, { opt_driver1_id: v, opt_driver1_name: d?.nickname ?? d?.driver_name ?? '' }) }}
                                onClear={() => updateRow(r.id, { opt_driver1_id: '', opt_driver1_name: '' })} />
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <PersonToggle label="Driver 2" checked={row.driver2_checked} onChange={(v) => updateRow(r.id, { driver2_checked: v })} />
                                <SearchableSelect className="min-w-[14rem] flex-1" placeholder="Select" options={driverOptions} value={row.driver2_id}
                                  onChange={(v) => { const d = drivers.find((dr) => String(dr.id) === v); updateRow(r.id, { driver2_id: v, driver2_name: d?.nickname ?? d?.driver_name ?? '' }) }}
                                  onClear={() => updateRow(r.id, { driver2_id: '', driver2_name: '' })} />
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <SearchableSelect className="min-w-[12rem]" placeholder="NA" options={driverOptions} value={row.opt_driver2_id}
                                onChange={(v) => { const d = drivers.find((dr) => String(dr.id) === v); updateRow(r.id, { opt_driver2_id: v, opt_driver2_name: d?.nickname ?? d?.driver_name ?? '' }) }}
                                onClear={() => updateRow(r.id, { opt_driver2_id: '', opt_driver2_name: '' })} />
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <PersonToggle label="Helper" checked={row.helper_checked} onChange={(v) => updateRow(r.id, { helper_checked: v })} />
                                <SearchableSelect className="min-w-[13rem] flex-1" placeholder="Select" options={helperOptions} value={row.helper_id}
                                  onChange={(v) => { const h = helpers.find((x) => String(x.id) === v); updateRow(r.id, { helper_id: v, helper_name: h?.helper_name ?? h?.nickname ?? '' }) }}
                                  onClear={() => updateRow(r.id, { helper_id: '', helper_name: '' })} />
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <SearchableSelect className="min-w-[12rem]" placeholder="NA" options={helperOptions} value={row.opt_helper_id}
                                onChange={(v) => { const h = helpers.find((x) => String(x.id) === v); updateRow(r.id, { opt_helper_id: v, opt_helper_name: h?.helper_name ?? h?.nickname ?? '' }) }}
                                onClear={() => updateRow(r.id, { opt_helper_id: '', opt_helper_name: '' })} />
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <PersonToggle label="Conductor" checked={row.conductor_checked} onChange={(v) => updateRow(r.id, { conductor_checked: v })} />
                                <SearchableSelect className="min-w-[13rem] flex-1" placeholder="Select" options={conductorOptions} value={row.conductor_id}
                                  onChange={(v) => { const c = conductors.find((x) => String(x.id) === v); updateRow(r.id, { conductor_id: v, conductor_name: c?.nickName ?? c?.fullName ?? '' }) }}
                                  onClear={() => updateRow(r.id, { conductor_id: '', conductor_name: '' })} />
                              </div>
                            </td>
                            <td className="py-2 px-3">
                              <SearchableSelect
                                disabled={row.driver1_checked && row.driver2_checked && row.helper_checked}
                                className="min-w-[15rem]" placeholder="Select" options={paidToOptions}
                                value={row.paid_to_id ? row.paid_to_id + '_' + row.paid_to_type : ''}
                                onChange={(v) => {
                                  const p = paidToList.find((x) => x.paid_to_id + '_' + x.paid_to_type === v)
                                  const ledgerId = p?.ledger_id ? String(p.ledger_id) : ''
                                  updateRow(r.id, {
                                    paid_to_id: String(p?.paid_to_id ?? ''), paid_to_name: p?.paid_to_name ?? '', paid_to_type: p?.paid_to_type ?? '', paid_to_ledger_id: ledgerId,
                                  })
                                }}
                                onClear={() => updateRow(r.id, { paid_to_id: '', paid_to_name: '', paid_to_type: '', paid_to_ledger_id: '' })} />
                              {row.driver1_checked && row.driver2_checked && row.helper_checked && (
                                <p className="text-[11px] font-semibold text-slate-400 mt-1">Driver 1, Driver 2 &amp; Helper all paid individually</p>
                              )}
                              <PaidToBalance ledgerId={row.paid_to_ledger_id} />
                            </td>
                            <td className="py-2 px-3">
                              <Input value={row.remarks} onChange={(e) => updateRow(r.id, { remarks: e.target.value })}
                                placeholder="Remarks" className="h-11 text-sm" />
                            </td>
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
                    disabled={submittingGrid || filledRoutes.length === 0 || incompleteRoutes.length > 0}
                    className="px-14 text-base h-11"
                  >
                    <Save className="w-4 h-4" />
                    {submittingGrid ? 'Submitting…' : `Submit ${filledRoutes.length > 0 ? `(${filledRoutes.length})` : ''}`}
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
        onAction={() => {}}
        actions={[]}
        icon={<Map className="w-5 h-5 text-blue-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
