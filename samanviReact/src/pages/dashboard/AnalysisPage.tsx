import { useState } from 'react'
import { motion } from 'motion/react'
import { Bus, Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, TopNavTabs, PageHeader, Badge } from '@/components/shared'
import { mastersService } from '@/services/masters.service'
import { fuelService } from '@/services/fuel.service'

const tabs = ['Vehicle Documents', 'Driver Licences']

type ExpiryStatus = 'expired' | 'critical' | 'warning' | 'upcoming' | 'ok'

function getExpiryStatus(dateStr: string | null | undefined): ExpiryStatus {
  if (!dateStr || dateStr === 'null' || dateStr === 'undefined') return 'ok'
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return 'ok'
  const today = new Date()
  const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'expired'
  if (diffDays <= 7) return 'critical'
  if (diffDays <= 15) return 'warning'
  if (diffDays <= 30) return 'upcoming'
  return 'ok'
}

function getExpiryBadge(status: ExpiryStatus) {
  const map = { expired: 'danger', critical: 'danger', warning: 'warning', upcoming: 'info', ok: 'success' } as const
  const label = { expired: 'EXPIRED', critical: '≤7 days', warning: '≤15 days', upcoming: '≤30 days', ok: 'Valid' }
  return <Badge variant={map[status]}>{label[status]}</Badge>
}

function ExpiryCell({ value }: { value: string | null | undefined }) {
  if (!value || value === 'null' || value === 'undefined') return <span className="text-slate-300">—</span>
  const status = getExpiryStatus(value)
  const bg = { expired: 'bg-red-50 text-red-700', critical: 'bg-red-50 text-red-600', warning: 'bg-amber-50 text-amber-700', upcoming: 'bg-yellow-50 text-yellow-700', ok: '' }
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${bg[status]}`}>
      {new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
    </span>
  )
}

const VEHICLE_COLS = [
  { key: 'bus_no', label: 'Bus No' },
  { key: 'insurance_validity', label: 'Insurance' },
  { key: 'pollution_validity', label: 'Pollution' },
  { key: 'fc_validity', label: 'FC' },
  { key: 'atp_validity', label: 'ATP' },
  { key: 'atp_authentication_validity', label: 'ATP Auth' },
  { key: 'base_point_validity', label: 'Base Point' },
  { key: 'home_tax_validity', label: 'Home Tax' },
]

const DRIVER_COLS = [
  { key: 'driver_name', label: 'Driver Name' },
  { key: 'mobile_number', label: 'Mobile' },
  { key: 'dl_number', label: 'DL Number' },
  { key: 'dl_expiry_date', label: 'DL Expiry' },
]

type FilterType = 'all' | 'expired' | 'critical' | 'warning' | 'ok'

export default function AnalysisPage() {
  const [tab, setTab] = useState('Vehicle Documents')
  const [filter, setFilter] = useState<FilterType>('all')

  const { data: buses, isLoading: loadBus } = useQuery({ queryKey: ['buses'], queryFn: () => mastersService.getBuses() })
  const { data: drivers, isLoading: loadDrv } = useQuery({ queryKey: ['drivers'], queryFn: () => mastersService.getDrivers() })

  const busList: any[] = (buses?.data ?? []).filter((b: any) => b.d_in === 0)
  const driverList: any[] = drivers?.data ?? []

  const getVehicleWorstStatus = (row: any): ExpiryStatus => {
    const fields = ['insurance_validity', 'pollution_validity', 'fc_validity', 'atp_validity', 'base_point_validity', 'home_tax_validity']
    const statuses: ExpiryStatus[] = fields.map((f) => getExpiryStatus(row[f]))
    const order: ExpiryStatus[] = ['expired', 'critical', 'warning', 'upcoming', 'ok']
    for (const s of order) if (statuses.includes(s)) return s
    return 'ok'
  }

  const filteredBuses = filter === 'all' ? busList : busList.filter((b) => getVehicleWorstStatus(b) === filter)
  const filteredDrivers = filter === 'all' ? driverList : driverList.filter((d) => getExpiryStatus(d.dl_expiry_date_date) === filter)

  const countBusByStatus = (s: ExpiryStatus) => busList.filter((b) => getVehicleWorstStatus(b) === s).length
  const countDrvByStatus = (s: ExpiryStatus) => driverList.filter((d) => getExpiryStatus(d.dl_expiry_date) === s).length

  const isVehicle = tab === 'Vehicle Documents'
  const stats = [
    { label: 'Expired', count: isVehicle ? countBusByStatus('expired') : countDrvByStatus('expired'), color: 'text-red-600', bg: 'bg-red-50', filter: 'expired' as FilterType },
    { label: 'Critical (≤7d)', count: isVehicle ? countBusByStatus('critical') : countDrvByStatus('critical'), color: 'text-orange-600', bg: 'bg-orange-50', filter: 'critical' as FilterType },
    { label: 'Warning (≤15d)', count: isVehicle ? countBusByStatus('warning') : countDrvByStatus('warning'), color: 'text-amber-600', bg: 'bg-amber-50', filter: 'warning' as FilterType },
    { label: 'All Valid', count: isVehicle ? countBusByStatus('ok') : countDrvByStatus('ok'), color: 'text-emerald-600', bg: 'bg-emerald-50', filter: 'ok' as FilterType },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Document Expiry Analysis" subtitle="Color-coded alerts for vehicle certificates and driver licences" />

      <TopNavTabs tabs={tabs} activeTab={tab} onChange={(t) => { setTab(t); setFilter('all') }} />

      {/* Alert summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => (
          <GlassCard
            key={s.label}
            className={`p-5 cursor-pointer ${s.bg} border-2 ${filter === s.filter ? 'border-current opacity-100' : 'border-transparent opacity-80 hover:opacity-100'}`}
            onClick={() => setFilter(filter === s.filter ? 'all' : s.filter)}
          >
            <p className="text-xs font-bold text-slate-500 uppercase">{s.label}</p>
            <h3 className={`text-3xl font-extrabold mt-1 ${s.color}`}>{s.count}</h3>
          </GlassCard>
        ))}
      </div>

      {filter !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-600">Filtering by:</span>
          <Badge variant={filter === 'expired' || filter === 'critical' ? 'danger' : filter === 'warning' ? 'warning' : 'success'}>
            {stats.find((s) => s.filter === filter)?.label}
          </Badge>
          <button onClick={() => setFilter('all')} className="text-xs text-blue-600 hover:underline ml-1">Clear filter</button>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap text-xs font-medium">
        <span className="text-slate-500">Colour legend:</span>
        {[
          { label: 'Expired', cls: 'bg-red-100 text-red-700' },
          { label: '≤7 days', cls: 'bg-red-50 text-red-600' },
          { label: '≤15 days', cls: 'bg-amber-50 text-amber-700' },
          { label: '≤30 days', cls: 'bg-yellow-50 text-yellow-700' },
          { label: 'Valid', cls: '' },
        ].map((l) => (
          <span key={l.label} className={`px-2 py-0.5 rounded ${l.cls} border border-slate-200`}>{l.label}</span>
        ))}
      </div>

      {/* Vehicle table */}
      {isVehicle && (
        <GlassCard className="overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-white/40">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Bus className="w-5 h-5 text-blue-500" /> Vehicle Document Status
              <span className="text-sm font-normal text-slate-500">({filteredBuses.length} vehicles)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="p-3 pl-6 text-xs font-bold text-slate-500 uppercase">#</th>
                  {VEHICLE_COLS.map((c) => (
                    <th key={c.key} className="p-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{c.label}</th>
                  ))}
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Overall</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadBus ? (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-400">Loading…</td></tr>
                ) : filteredBuses.length === 0 ? (
                  <tr><td colSpan={10} className="p-8 text-center text-slate-400">No vehicles match the filter</td></tr>
                ) : filteredBuses.map((bus, i) => (
                  <tr key={bus.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 pl-6 text-slate-500 text-sm">{i + 1}</td>
                    <td className="p-3 font-bold text-blue-600 whitespace-nowrap">{bus.bus_no}</td>
                    {VEHICLE_COLS.slice(1).map((c) => (
                      <td key={c.key} className="p-3 whitespace-nowrap"><ExpiryCell value={bus[c.key]} /></td>
                    ))}
                    <td className="p-3">{getExpiryBadge(getVehicleWorstStatus(bus))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* Driver table */}
      {!isVehicle && (
        <GlassCard className="overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-white/40">
            <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-500" /> Driver Licence Status
              <span className="text-sm font-normal text-slate-500">({filteredDrivers.length} drivers)</span>
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="p-3 pl-6 text-xs font-bold text-slate-500 uppercase">#</th>
                  {DRIVER_COLS.map((c) => (
                    <th key={c.key} className="p-3 text-xs font-bold text-slate-500 uppercase">{c.label}</th>
                  ))}
                  <th className="p-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadDrv ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading…</td></tr>
                ) : filteredDrivers.length === 0 ? (
                  <tr><td colSpan={6} className="p-8 text-center text-slate-400">No drivers match the filter</td></tr>
                ) : filteredDrivers.map((d, i) => (
                  <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 pl-6 text-slate-500 text-sm">{i + 1}</td>
                    <td className="p-3 font-bold">{d.driver_name ?? d.nickname ?? '—'}</td>
                    <td className="p-3 text-sm text-slate-600">{d.mobile_number ?? '—'}</td>
                    <td className="p-3 text-sm">{d.dl_number ?? '—'}</td>
                    <td className="p-3"><ExpiryCell value={d.dl_expiry_date} /></td>
                    <td className="p-3">{getExpiryBadge(getExpiryStatus(d.dl_expiry_date))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </motion.div>
  )
}
