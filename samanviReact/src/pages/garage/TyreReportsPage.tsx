import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BarChart3, X, Bus, Wrench, Recycle, ShoppingCart, Gauge } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DataTable, Badge, PageHeader, DualScrollTable } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'

const STATUSES = ['In Stock', 'In Use', 'Retreaded', 'Scrapped', 'Sold', 'Pending Retread']

const statusVariant: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'purple' | 'teal'> = {
  'In Stock': 'success', 'In Use': 'info', Retreaded: 'warning', Scrapped: 'danger', Sold: 'purple', 'Pending Retread': 'teal',
}

const STATUS_COLORS: Record<string, string> = {
  'In Stock': '#10b981', 'In Use': '#3b82f6', Retreaded: '#f59e0b', Scrapped: '#ef4444', Sold: '#7c3aed', 'Pending Retread': '#14b8a6',
}

function countBy(list: any[], key: string) {
  const m: Record<string, number> = {}
  list.forEach((r) => { const k = r[key] ?? ''; m[k] = (m[k] ?? 0) + 1 })
  return m
}

function fmtDate(v: any) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

type TimelineEvent = {
  date: string
  km: number | null
  label: string
  sub?: string
  type: 'purchase' | 'fitted' | 'removed' | 'repair' | 'retread'
}

const eventStyle: Record<TimelineEvent['type'], { icon: any; color: string }> = {
  purchase: { icon: ShoppingCart, color: 'text-slate-500 bg-slate-100' },
  fitted:   { icon: Bus,          color: 'text-blue-600 bg-blue-50' },
  removed:  { icon: Bus,          color: 'text-slate-400 bg-slate-100' },
  repair:   { icon: Wrench,       color: 'text-rose-600 bg-rose-50' },
  retread:  { icon: Recycle,      color: 'text-amber-600 bg-amber-50' },
}

// Merges every lifecycle event for a tyre (purchase, mount/unmount, repair, retread)
// into one chronological trail. Only fitting and repair rows carry an odometer
// reading in this schema — removal/retread don't — so "km since last reading"
// is computed off whichever odometer-bearing event came before it, not a strict
// per-bus total.
function buildTimeline(tyre: any, positions: any[], repairs: any[], retreads: any[]): (TimelineEvent & { delta: number | null })[] {
  const events: TimelineEvent[] = []

  if (tyre.purchase_date) {
    events.push({ date: tyre.purchase_date, km: 0, label: 'Purchased', sub: tyre.remarks || undefined, type: 'purchase' })
  }
  positions.forEach((p) => {
    events.push({
      date: p.fitted_date, km: p.odometer_at_fitting != null && p.odometer_at_fitting !== '' ? Number(p.odometer_at_fitting) : null,
      label: `Fitted on ${p.vehicle_number} (${p.position})`, type: 'fitted',
    })
    if (p.removed_date) {
      events.push({ date: p.removed_date, km: null, label: `Removed from ${p.vehicle_number} (${p.position})`, type: 'removed' })
    }
  })
  repairs.forEach((r) => {
    events.push({
      date: r.repair_date, km: r.odometer != null && r.odometer !== '' ? Number(r.odometer) : null,
      label: `Repaired — ${r.repair_type || 'Repair'}`,
      sub: [r.vendor_name ? `Vendor: ${r.vendor_name}` : null, r.cost ? `₹${Number(r.cost).toLocaleString('en-IN')}` : null].filter(Boolean).join(' · ') || undefined,
      type: 'repair',
    })
  })
  retreads.forEach((r) => {
    events.push({ date: r.retread_date, km: null, label: 'Retreaded', sub: r.vendor_name ? `Vendor: ${r.vendor_name}` : undefined, type: 'retread' })
  })

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  let lastKm: number | null = null
  return events.map((e) => {
    let delta: number | null = null
    if (e.km != null && lastKm != null && e.km > lastKm) delta = e.km - lastKm
    if (e.km != null) lastKm = e.km
    return { ...e, delta }
  })
}

export default function TyreReportsPage() {
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [detailTyre, setDetailTyre] = useState<any | null>(null)

  const { data: tyresData, isLoading } = useQuery({ queryKey: ['tyre-inventory'], queryFn: () => garageService.getTyreInventory() })
  const { data: retreadsData } = useQuery({ queryKey: ['tyre-retreads'], queryFn: () => garageService.getTyreRetreads() })
  const { data: repairsData } = useQuery({ queryKey: ['tyre-repairs'], queryFn: () => garageService.getTyreRepairs() })
  const { data: positionsData } = useQuery({ queryKey: ['tyre-position-history'], queryFn: () => garageService.getTyrePositionHistory() })

  const tyres: any[] = tyresData?.data ?? []
  const retreads: any[] = retreadsData?.data ?? []
  const repairs: any[] = repairsData?.data ?? []
  const positions: any[] = positionsData?.data ?? []

  const statusCounts = useMemo(() => countBy(tyres, 'status'), [tyres])
  const totalPurchaseCost = useMemo(() => tyres.reduce((s, t) => s + Number(t.cost || 0), 0), [tyres])
  const totalRepairCost = useMemo(() => repairs.reduce((s, r) => s + Number(r.cost || 0), 0), [repairs])

  const retreadCountByTyre = useMemo(() => countBy(retreads, 'tyre_id'), [retreads])
  const repairCountByTyre = useMemo(() => countBy(repairs, 'tyre_id'), [repairs])
  const repairCostByTyre = useMemo(() => {
    const m: Record<string, number> = {}
    repairs.forEach((r) => { m[r.tyre_id] = (m[r.tyre_id] ?? 0) + Number(r.cost || 0) })
    return m
  }, [repairs])

  // Distinct buses each tyre has been mounted on, from the full mount/unmount log.
  const busesByTyre = useMemo(() => {
    const m: Record<string, Set<string>> = {}
    positions.forEach((p) => {
      const key = String(p.tyre_id)
      if (!m[key]) m[key] = new Set()
      if (p.vehicle_number) m[key].add(p.vehicle_number)
    })
    return m
  }, [positions])

  const chartData = STATUSES.map((s) => ({ status: s, count: statusCounts[s] ?? 0 }))

  const cols: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Tyre Code', key: 'tyre_code', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Make', key: 'brand', filterable: true },
    { label: 'Size', key: 'size', filterable: true },
    { label: 'Status', key: 'status', filterable: true, render: (v) => <Badge variant={statusVariant[String(v)] ?? 'default'}>{String(v)}</Badge> },
    { label: 'Current Vehicle', key: 'current_vehicle_number', filterable: true, render: (v) => v ? <span className="font-medium">{String(v)}</span> : <span className="text-slate-300">—</span> },
    { label: 'Purchase Cost', key: 'cost', align: 'right', render: (v) => <span className="font-medium">₹{v ?? 0}</span> },
    { label: 'Buses Used', key: '_buses', align: 'center', render: (_v, r: any) => <span className="font-semibold">{busesByTyre[String(r.id)]?.size ?? 0}</span> },
    { label: 'Retreads', key: 'id', align: 'center', render: (_v, r: any) => <span className="font-semibold">{retreadCountByTyre[r.id] ?? 0}</span> },
    { label: 'Repairs', key: '_repairs', align: 'center', render: (_v, r: any) => <span className="font-semibold">{repairCountByTyre[r.id] ?? 0}</span> },
    { label: 'Repair Cost', key: '_repair_cost', align: 'right', render: (_v, r: any) => <span className="font-medium">₹{(repairCostByTyre[r.id] ?? 0).toLocaleString('en-IN')}</span> },
  ]

  const detailPositions = useMemo(() => detailTyre ? positions.filter((p) => String(p.tyre_id) === String(detailTyre.id)).sort((a, b) => new Date(a.fitted_date).getTime() - new Date(b.fitted_date).getTime()) : [], [detailTyre, positions])
  const detailRepairs = useMemo(() => detailTyre ? repairs.filter((r) => String(r.tyre_id) === String(detailTyre.id)) : [], [detailTyre, repairs])
  const detailRetreads = useMemo(() => detailTyre ? retreads.filter((r) => String(r.tyre_id) === String(detailTyre.id)) : [], [detailTyre, retreads])
  const timeline = useMemo(() => detailTyre ? buildTimeline(detailTyre, detailPositions, detailRepairs, detailRetreads) : [], [detailTyre, detailPositions, detailRepairs, detailRetreads])
  const detailBusCount = detailTyre ? (busesByTyre[String(detailTyre.id)]?.size ?? 0) : 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Tyre Reports" subtitle="Stock status, spend, and per-tyre history at a glance" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STATUSES.map((s) => (
          <div key={s} className="rounded-xl p-3 text-center border" style={{ backgroundColor: `${STATUS_COLORS[s]}14`, borderColor: `${STATUS_COLORS[s]}40` }}>
            <p className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: STATUS_COLORS[s] }}>{s}</p>
            <p className="text-2xl font-extrabold" style={{ color: STATUS_COLORS[s] }}>{statusCounts[s] ?? 0}</p>
          </div>
        ))}
        <div className="rounded-xl p-3 text-center border bg-slate-50 border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Total Purchase Spend</p>
          <p className="text-xl font-extrabold text-slate-800">₹{totalPurchaseCost.toLocaleString('en-IN')}</p>
        </div>
        <div className="rounded-xl p-3 text-center border bg-slate-50 border-slate-200">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Total Repair Spend</p>
          <p className="text-xl font-extrabold text-slate-800">₹{totalRepairCost.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-blue-500" /> Tyres by Status</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="status" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {chartData.map((d) => <Cell key={d.status} fill={STATUS_COLORS[d.status]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <DataTable
        title="Tyre Detail"
        columns={cols}
        data={tyres}
        loading={isLoading}
        onAction={(action, row) => { if (action === 'view') setDetailTyre(row) }}
        actions={['view']}
        icon={<BarChart3 className="w-5 h-5 text-blue-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />

      <AnimatePresence>
        {detailTyre && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-blue-500" /> {detailTyre.tyre_code}
                    <Badge variant={statusVariant[String(detailTyre.status)] ?? 'default'}>{detailTyre.status}</Badge>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{detailTyre.brand} · {detailTyre.size || 'No size'} · Serial {detailTyre.serial_no || '—'}</p>
                </div>
                <button onClick={() => setDetailTyre(null)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
              </div>

              <div className="overflow-y-auto flex-1 p-6 space-y-6">
                {/* Stat row */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl p-3 text-center border bg-blue-50 border-blue-100">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-blue-600 mb-1">Buses Used</p>
                    <p className="text-2xl font-extrabold text-blue-700">{detailBusCount}</p>
                  </div>
                  <div className="rounded-xl p-3 text-center border bg-rose-50 border-rose-100">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-rose-600 mb-1">Repairs</p>
                    <p className="text-2xl font-extrabold text-rose-700">{detailRepairs.length}</p>
                  </div>
                  <div className="rounded-xl p-3 text-center border bg-amber-50 border-amber-100">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600 mb-1">Retreads</p>
                    <p className="text-2xl font-extrabold text-amber-700">{detailRetreads.length}</p>
                  </div>
                  <div className="rounded-xl p-3 text-center border bg-slate-50 border-slate-200">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">Repair Spend</p>
                    <p className="text-lg font-extrabold text-slate-800">₹{(repairCostByTyre[detailTyre.id] ?? 0).toLocaleString('en-IN')}</p>
                  </div>
                </div>

                {/* Bus history */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Bus History ({detailBusCount} bus{detailBusCount !== 1 ? 'es' : ''})</h4>
                  {detailPositions.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Never mounted on a bus yet.</p>
                  ) : (
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <DualScrollTable tableClassName="overflow-auto max-h-64">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Vehicle</th>
                            <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Position</th>
                            <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Fitted</th>
                            <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase text-right">Odometer</th>
                            <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Removed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {detailPositions.map((p, i) => (
                            <tr key={i}>
                              <td className="px-3 py-2 font-semibold text-blue-600">{p.vehicle_number}</td>
                              <td className="px-3 py-2"><Badge variant="purple">{p.position}</Badge></td>
                              <td className="px-3 py-2 text-slate-600">{fmtDate(p.fitted_date)}</td>
                              <td className="px-3 py-2 text-right text-slate-600">{p.odometer_at_fitting ? `${p.odometer_at_fitting} km` : '—'}</td>
                              <td className="px-3 py-2">
                                {p.removed_date ? <span className="text-slate-600">{fmtDate(p.removed_date)}</span> : <Badge variant="success">Active</Badge>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </DualScrollTable>
                    </div>
                  )}
                </div>

                {/* Odometer timeline */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Odometer Timeline</h4>
                  {timeline.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">No lifecycle events recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {timeline.map((e, i) => {
                        const { icon: Icon, color } = eventStyle[e.type]
                        return (
                          <div key={i} className="flex gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${color}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 pb-3 border-b border-slate-100 last:border-b-0">
                              <div className="flex items-center justify-between flex-wrap gap-1">
                                <span className="text-sm font-semibold text-slate-800">{e.label}</span>
                                <span className="text-xs text-slate-400">{fmtDate(e.date)}</span>
                              </div>
                              {e.sub && <p className="text-xs text-slate-500 mt-0.5">{e.sub}</p>}
                              <div className="flex items-center gap-2 mt-1">
                                {e.km != null && (
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{e.km.toLocaleString('en-IN')} km</span>
                                )}
                                {e.delta != null && (
                                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">+{e.delta.toLocaleString('en-IN')} km since last reading</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <p className="text-[11px] text-slate-400 mt-3">Odometer is only captured at fitting and repair time — removal/retread dates don't record a reading, so "km since last reading" spans back to whichever fitting or repair came before it.</p>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 flex justify-end flex-shrink-0">
                <button onClick={() => setDetailTyre(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Close</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
