import { useState } from 'react'
import { motion } from 'motion/react'
import { User, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'

const cols: Column[] = [
  { label: 'Driver', key: 'driver1', render: (v, r: any) => <span className="font-bold">{String(v ?? r.drivername ?? '—')}</span> },
  { label: 'Total Trips', key: 'total_trips' },
  { label: 'Total KM', key: 'total_km' },
  { label: 'Total Litres', key: 'total_litres', render: (v) => <span className="font-medium">{v} L</span> },
  { label: 'Avg km/L', key: 'avg_kmpl', render: (v) => <Badge variant={Number(v) >= 4 ? 'success' : Number(v) >= 3 ? 'warning' : 'danger'}>{String(v)} km/L</Badge> },
  { label: 'Rank', key: 'rank', render: (v) => <span className={`font-bold text-lg ${Number(v) <= 3 ? 'text-amber-500' : 'text-slate-600'}`}>#{v}</span> },
]

const topCols: Column[] = [
  { label: 'Rank', key: 'rank', render: (v) => <span className={`font-extrabold text-xl ${Number(v) === 1 ? 'text-amber-500' : Number(v) === 2 ? 'text-slate-400' : Number(v) === 3 ? 'text-orange-600' : 'text-slate-600'}`}>#{v}</span> },
  { label: 'Driver', key: 'driver1', render: (v, r: any) => <span className="font-bold">{String(v ?? r.drivername ?? '—')}</span> },
  { label: 'km/L', key: 'avg_kmpl', render: (v) => <span className="font-extrabold text-emerald-600 text-lg">{v}</span> },
  { label: 'Total KM', key: 'total_km' },
  { label: 'Trips', key: 'total_trips' },
]

const today = new Date().toISOString().split('T')[0]

export default function DriverWisePage() {
  const [filter, setFilter] = useState({ from_date: '', to_date: '' })
  const [applied, setApplied] = useState(filter)

  const { data, isLoading } = useQuery({ queryKey: ['driver-perf', applied], queryFn: () => fuelService.getDriverPerformanceReports(applied) })
  const { data: top } = useQuery({ queryKey: ['top-performers', applied], queryFn: () => fuelService.getTopPerformers(applied) })

  const driverList: any[] = data?.data ?? []
  const topList: any[] = top?.data ?? []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Driver Wise Performance" subtitle="Fuel efficiency rankings and performance per driver" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-violet-500 to-purple-500">
        <div className="flex items-end gap-4">
          <div><Label>From Date</Label><Input type="date" max={today} value={filter.from_date} onChange={(e) => setFilter({ ...filter, from_date: e.target.value })} /></div>
          <div><Label>To Date</Label><Input type="date" max={today} value={filter.to_date} onChange={(e) => setFilter({ ...filter, to_date: e.target.value })} /></div>
          <Button onClick={() => setApplied(filter)}><Search className="w-4 h-4" /> Generate</Button>
        </div>
      </GlassCard>

      {topList.length > 0 && (
        <GlassCard className="p-6">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2"><User className="w-5 h-5 text-amber-500" /> Top Performers</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topList.slice(0, 3).map((d: any, i) => (
              <div key={i} className={`p-4 rounded-2xl border-2 ${i === 0 ? 'border-amber-400 bg-amber-50' : i === 1 ? 'border-slate-300 bg-slate-50' : 'border-orange-300 bg-orange-50'}`}>
                <div className={`text-3xl font-black mb-1 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : 'text-orange-500'}`}>#{i + 1}</div>
                <div className="font-bold text-slate-900">{d.drivername}</div>
                <div className="text-emerald-600 font-bold text-xl">{d.avg_kmpl} km/L</div>
                <div className="text-xs text-slate-500">{d.total_trips} trips · {d.total_km} km</div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <DataTable title="Driver Performance Report" columns={cols} data={driverList} loading={isLoading} onAction={() => {}} actions={['view']} />
    </motion.div>
  )
}
