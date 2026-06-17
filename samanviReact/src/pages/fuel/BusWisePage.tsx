import { useState } from 'react'
import { motion } from 'motion/react'
import { Bus, Search, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, TopNavTabs, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'

const tabs = ['Bus Wise Summary', 'Bus Performance']

const busCols: Column[] = [
  { label: 'Bus No', key: 'vehicle_number', render: (v, r: any) => <span className="font-bold text-blue-600">{String(v ?? r.busno ?? '—')}</span> },
  { label: 'Total Fills', key: 'total_fills' },
  { label: 'Total Litres', key: 'total_litres', render: (v) => <span className="font-bold">{v} L</span> },
  { label: 'Total Amount', key: 'total_amount', render: (v) => <span className="font-bold">₹{v}</span> },
  { label: 'KM Covered', key: 'total_km' },
  { label: 'Avg Mileage', key: 'avg_kmpl', render: (v) => <Badge variant={Number(v) >= 4 ? 'success' : Number(v) >= 3 ? 'warning' : 'danger'}>{String(v)} km/L</Badge> },
]

const perfCols: Column[] = [
  { label: 'Bus No', key: 'vehicle_number', render: (v, r: any) => <span className="font-bold">{String(v ?? r.busno ?? '—')}</span> },
  { label: 'KM/Litre', key: 'kmpl', render: (v) => <span className="font-bold text-emerald-600">{v}</span> },
  { label: 'Best Run', key: 'best_kmpl' },
  { label: 'Worst Run', key: 'worst_kmpl' },
  { label: 'Trips', key: 'total_trips' },
  { label: 'Grade', key: 'grade', render: (v) => <Badge variant={v === 'A' ? 'success' : v === 'B' ? 'warning' : 'danger'}>{String(v)}</Badge> },
]

const today = new Date().toISOString().split('T')[0]

export default function BusWisePage() {
  const [tab, setTab] = useState('Bus Wise Summary')
  const [filter, setFilter] = useState({ from_date: '', to_date: '', bus_no: '' })
  const [applied, setApplied] = useState(filter)

  const { data: busWise, isLoading: l1 } = useQuery({ queryKey: ['buswise', applied], queryFn: () => fuelService.getBusWiseReports(applied), enabled: tab === 'Bus Wise Summary' })
  const { data: perf, isLoading: l2 } = useQuery({ queryKey: ['busperf', applied], queryFn: () => fuelService.getBusPerformanceReports(applied), enabled: tab === 'Bus Performance' })
  const { data: buses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Bus Wise Reports" subtitle="Per-bus fuel consumption and efficiency analysis" />
      <TopNavTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div><Label>Bus No</Label>
            <Select value={filter.bus_no} onChange={(e) => setFilter({ ...filter, bus_no: e.target.value })}>
              <option value="">All Buses</option>
              {(buses?.data ?? []).map((b: any) => <option key={b.id} value={b.bus_no}>{b.bus_no}</option>)}
            </Select></div>
          <div><Label>From</Label><Input type="date" max={today} value={filter.from_date} onChange={(e) => setFilter({ ...filter, from_date: e.target.value })} /></div>
          <div><Label>To</Label><Input type="date" max={today} value={filter.to_date} onChange={(e) => setFilter({ ...filter, to_date: e.target.value })} /></div>
          <Button onClick={() => setApplied(filter)}><Search className="w-4 h-4" /> Search</Button>
        </div>
      </GlassCard>

      {tab === 'Bus Wise Summary' && <DataTable title="Bus Wise Fuel Summary" columns={busCols} data={busWise?.data ?? []} loading={l1} onAction={() => {}} actions={['view']} />}
      {tab === 'Bus Performance' && <DataTable title="Bus Performance Report" columns={perfCols} data={perf?.data ?? []} loading={l2} onAction={() => {}} actions={['view']} />}
    </motion.div>
  )
}
