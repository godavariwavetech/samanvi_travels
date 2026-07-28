import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Map, Save, X, Plus, Search, Filter } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { tripsService } from '@/services/trips.service'
import { mastersService } from '@/services/masters.service'

const EMPTY = {
  trip_date: new Date().toISOString().split('T')[0],
  bus_no: '',
  service_no: '', service_no_id: '',
  trip_for: '', trip_for_id: '',
  optreg: '',   driver1_name: '', driver1_id: '',
  optreg1: '',  driver2_name: '', driver2_id: '',
  optreg2: '',  helper_name: '',  helper_id: '',
  conductor_name: '', conductor_id: '',
  paid_to_name: '', paid_to_id: '', paid_to_type: '',
  remarks: '',
}

const today = new Date().toISOString().split('T')[0]
const firstOfMonth = today.slice(0, 8) + '01'

const columns: Column[] = [
  {
    label: 'Trip ID / Date', key: 'c_number',
    render: (v, r: any) => (
      <div>
        <div className="font-bold text-blue-600">{String(v ?? `#${r.id}`)}</div>
        <div className="text-xs text-slate-400">{String(r.trip_date ?? '').split('T')[0]}</div>
      </div>
    ),
  },
  {
    label: 'Bus / Service', key: 'bus_no',
    render: (v, r: any) => (
      <div>
        <div className="font-semibold">{String(v ?? '—')}</div>
        <div className="text-xs text-slate-500">{r.service_no} · {r.trip_for}</div>
      </div>
    ),
  },
  { label: 'Driver 1', key: 'driver1_name', render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'Driver 2', key: 'driver2_name', render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
  { label: 'Helper', key: 'helper_name', render: (v) => <span className="text-slate-500 text-sm">{String(v ?? '—')}</span> },
  { label: 'Paid To', key: 'paid_to_name', render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
]

// Clearable select
function ClearSelect({ value, onChange, onClear, children }: {
  value: string; onChange: (v: string) => void; onClear: () => void; children: React.ReactNode
}) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 pl-3 pr-8 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 appearance-none">
        {children}
      </select>
      {value
        ? <button type="button" onClick={onClear} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
        : <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▾</span>
      }
    </div>
  )
}

export default function TripCreationPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const clear = (k: keyof typeof EMPTY) => setForm((f) => ({ ...f, [k]: '' }))

  // Date range filter state
  const [fromDate, setFromDate] = useState(firstOfMonth)
  const [toDate, setToDate] = useState(today)
  const [applied, setApplied] = useState({ from: firstOfMonth, to: today })

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
  const serviceForList = [...new Set(allRoutes.map((r) => r.serviceFor))].filter(Boolean)
  const filteredRoutes = form.trip_for ? allRoutes.filter((r) => r.serviceFor === form.trip_for) : allRoutes
  const drivers: any[] = driverData?.data ?? []
  const helpers: any[] = helperData?.data ?? []
  const paidToList: any[] = staffData?.data ?? []
  const conductors: any[] = (activeStaffData?.data ?? []).filter((s: any) => s.designation === 'Conductor')

  // Client-side date filter
  const allTrips: any[] = tripData?.data ?? []
  const filteredTrips = useMemo(() => {
    if (!applied.from && !applied.to) return allTrips
    return allTrips.filter((t) => {
      const d = String(t.trip_date ?? t.cts ?? '').split('T')[0]
      if (!d) return true
      if (applied.from && d < applied.from) return false
      if (applied.to && d > applied.to) return false
      return true
    })
  }, [allTrips, applied])

  const onServiceNoChange = (routeId: string) => {
    const route = allRoutes.find((r) => String(r.id) === routeId)
    setForm((f) => ({
      ...f,
      service_no: route?.serviceNo ?? '',
      service_no_id: routeId,
      trip_for: route?.serviceFor ?? f.trip_for,
      trip_for_id: route?.service_for_id ?? '',
    }))
  }

  const onDriverChange = (field: 'driver1' | 'driver2', driverId: string) => {
    const d = drivers.find((dr) => String(dr.id) === driverId)
    if (field === 'driver1') setForm((f) => ({ ...f, driver1_id: driverId, driver1_name: d?.nickname ?? d?.driver_name ?? '' }))
    else setForm((f) => ({ ...f, driver2_id: driverId, driver2_name: d?.nickname ?? d?.driver_name ?? '' }))
  }

  const onHelperChange = (helperId: string) => {
    const h = helpers.find((x) => String(x.id) === helperId)
    setForm((f) => ({ ...f, helper_id: helperId, helper_name: h?.helper_name ?? '' }))
  }

  const onConductorChange = (id: string) => {
    const c = conductors.find((x) => String(x.id) === id)
    setForm((f) => ({ ...f, conductor_id: id, conductor_name: c?.nickName ?? c?.fullName ?? '' }))
  }

  const onPaidToChange = (val: string) => {
    const p = paidToList.find((x) => `${x.paid_to_id}_${x.paid_to_type}` === val)
    setForm((f) => ({ ...f, paid_to_id: String(p?.paid_to_id ?? ''), paid_to_name: p?.paid_to_name ?? '', paid_to_type: p?.paid_to_type ?? '' }))
  }

  const { mutate: createTrip, isPending } = useMutation({
    mutationFn: () => tripsService.createTrip({
      ...form,
      type: 'add',
      created_id: localStorage.getItem('user_id'),
      created_name: localStorage.getItem('usr_nm'),
      user_id: localStorage.getItem('user_id'),
      usr_nm: localStorage.getItem('usr_nm'),
    }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success(`Trip created — ${res.data?.c_number ?? ''}`)
        qc.invalidateQueries({ queryKey: ['trips'] })
        setForm({ ...EMPTY, trip_date: form.trip_date })
        setShowForm(false)
      } else toast.error('Failed to create trip')
    },
    onError: () => toast.error('Server error'),
  })

  const canSubmit = form.trip_date && form.bus_no && form.service_no && form.trip_for && form.driver1_name && form.paid_to_name

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Trip Related Reports" subtitle="Create and manage trip assignments" />

      {/* ── Filter bar + Create button ── */}
      <GlassCard className="p-4" colorBar="bg-gradient-to-r from-slate-400 to-slate-500">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label>From Date</Label>
            <Input type="date" max={today} value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36" />
          </div>
          <div>
            <Label>To Date</Label>
            <Input type="date" max={today} value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-36" />
          </div>
          <Button
            variant="primary"
            onClick={() => setApplied({ from: fromDate, to: toDate })}
          >
            <Search className="w-4 h-4" /> Apply Filter
          </Button>
          <button
            onClick={() => { setFromDate(''); setToDate(''); setApplied({ from: '', to: '' }) }}
            className="text-xs text-slate-500 hover:text-red-500 font-medium underline"
          >
            Clear
          </button>

          <div className="ml-auto">
            <Button
              variant={showForm ? 'danger' : 'teal'}
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? <><X className="w-4 h-4" /> Close Form</> : <><Plus className="w-4 h-4" /> Create Trip</>}
            </Button>
          </div>
        </div>

        {/* Active filter badge */}
        {(applied.from || applied.to) && (
          <div className="flex items-center gap-2 mt-3">
            <Filter className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-blue-600">
              Showing {filteredTrips.length} of {allTrips.length} trips
              {applied.from && ` from ${applied.from}`}
              {applied.to && ` to ${applied.to}`}
            </span>
          </div>
        )}
      </GlassCard>

      {/* ── Trip Creation Form (shown on button click) ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.2 }}
          >
            <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-indigo-500">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Map className="w-5 h-5 text-blue-500" /> Create New Trip
                </h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Row 1 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label>Trip Date <span className="text-red-500">*</span></Label>
                  <Input type="date" max={today} value={form.trip_date} onChange={(e) => set('trip_date', e.target.value)} />
                </div>
                <div>
                  <Label>Bus Number <span className="text-red-500">*</span></Label>
                  <ClearSelect value={form.bus_no} onChange={(v) => set('bus_no', v)} onClear={() => clear('bus_no')}>
                    <option value="">Select</option>
                    {buses.map((b) => <option key={b.id} value={b.bus_no}>{b.bus_no}</option>)}
                  </ClearSelect>
                </div>
                <div>
                  <Label>Service Number <span className="text-red-500">*</span></Label>
                  <ClearSelect value={form.service_no_id} onChange={onServiceNoChange} onClear={() => setForm((f) => ({ ...f, service_no: '', service_no_id: '' }))}>
                    <option value="">Select</option>
                    {filteredRoutes.map((r) => <option key={r.id} value={r.id}>{r.serviceNo} — {r.fromCity} → {r.toCity}</option>)}
                  </ClearSelect>
                </div>
                <div>
                  <Label>Service For <span className="text-red-500">*</span></Label>
                  <select value={form.trip_for}
                    onChange={(e) => setForm((f) => ({ ...f, trip_for: e.target.value, service_no: '', service_no_id: '', trip_for_id: '' }))}
                    className="w-full h-10 pl-3 pr-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
                    <option value="">Select</option>
                    {serviceForList.map((s) => <option key={s as string} value={s as string}>{s as string}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div>
                  <Label>Driver1 Name <span className="text-red-500">*</span></Label>
                  <ClearSelect value={form.driver1_id} onChange={(v) => onDriverChange('driver1', v)} onClear={() => setForm((f) => ({ ...f, driver1_id: '', driver1_name: '' }))}>
                    <option value="">Select</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.nickname ?? d.driver_name}</option>)}
                  </ClearSelect>
                </div>
                <div>
                  <Label>Drive2 Name</Label>
                  <ClearSelect value={form.driver2_id} onChange={(v) => onDriverChange('driver2', v)} onClear={() => setForm((f) => ({ ...f, driver2_id: '', driver2_name: '' }))}>
                    <option value="">Select</option>
                    {drivers.map((d) => <option key={d.id} value={d.id}>{d.nickname ?? d.driver_name}</option>)}
                  </ClearSelect>
                </div>
                <div>
                  <Label>Helper Name <span className="text-red-500">*</span></Label>
                  <ClearSelect value={form.helper_id} onChange={onHelperChange} onClear={() => setForm((f) => ({ ...f, helper_id: '', helper_name: '' }))}>
                    <option value="">Select</option>
                    {helpers.map((h) => <option key={h.id} value={h.id}>{h.helper_name ?? h.nickname}</option>)}
                  </ClearSelect>
                </div>
                <div>
                  <Label>Conductor Name</Label>
                  <ClearSelect value={form.conductor_id} onChange={onConductorChange} onClear={() => setForm((f) => ({ ...f, conductor_id: '', conductor_name: '' }))}>
                    <option value="">Select</option>
                    {conductors.map((c) => (
                      <option key={c.id} value={c.id}>{c.nickName ?? c.fullName}</option>
                    ))}
                  </ClearSelect>
                </div>
                <div>
                  <Label>Paid To <span className="text-red-500">*</span></Label>
                  <ClearSelect
                    value={form.paid_to_id ? `${form.paid_to_id}_${form.paid_to_type}` : ''}
                    onChange={onPaidToChange}
                    onClear={() => setForm((f) => ({ ...f, paid_to_id: '', paid_to_name: '', paid_to_type: '' }))}
                  >
                    <option value="">Select</option>
                    {paidToList.map((p) => (
                      <option key={`${p.paid_to_id}_${p.paid_to_type}`} value={`${p.paid_to_id}_${p.paid_to_type}`}>
                        {p.paid_to_name} ({p.paid_to_type})
                      </option>
                    ))}
                  </ClearSelect>
                </div>
              </div>

              {/* Row 3: Remarks */}
              <div className="mb-5">
                <Label>Remarks</Label>
                <textarea rows={3} placeholder="Enter remarks" value={form.remarks}
                  onChange={(e) => set('remarks', e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
              </div>

              <div className="flex justify-center">
                <Button onClick={() => createTrip()} disabled={isPending || !canSubmit} className="px-14 text-base h-11">
                  <Save className="w-4 h-4" />
                  {isPending ? 'Submitting…' : 'Submit'}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trip Records Table ── */}
      <DataTable
        title={`Trip Records ${filteredTrips.length !== allTrips.length ? `(${filteredTrips.length} filtered)` : `(${allTrips.length})`}`}
        columns={columns}
        data={filteredTrips}
        loading={isLoading}
        onAction={() => {}}
        actions={[]}
        icon={<Map className="w-5 h-5 text-blue-500" />}
      />
    </motion.div>
  )
}
