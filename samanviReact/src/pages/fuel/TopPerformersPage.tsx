import { useState } from 'react'
import { motion } from 'motion/react'
import { Award, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'

const today = new Date().toISOString().split('T')[0]
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

const cols: Column[] = [
  { label: '#', key: 'i', render: (v) => <span className="text-slate-400 text-xs font-medium">{String(v)}</span> },
  { label: 'Date', key: 'date', render: (v) => <span className="font-medium">{String(v ?? '').split(' ')[0]}</span> },
  { label: 'Bus No', key: 'bus_no', render: (v) => <Badge variant="info">{String(v ?? '—')}</Badge> },
  { label: 'Service No', key: 'service_number', render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'KMs Run', key: 'kilometers', render: (v, r: any) => <span className="font-bold">{v ?? r.kms_run ?? '—'} km</span> },
  { label: 'Qty (L)', key: 'quantity_filled', render: (_, r: any) => <span className="text-blue-600 font-medium">{r.qty ?? r.quantity_filled ?? '—'} L</span> },
  {
    label: 'Avg KMPL',
    key: 'avg_kmpl',
    render: (v, r: any) => {
      const kmpl = Number(v) || (r.kms_run && r.qty ? (r.kms_run / r.qty) : 0)
      const variant = kmpl >= 5 ? 'success' : kmpl >= 3.5 ? 'warning' : 'danger'
      return <Badge variant={variant}>{kmpl.toFixed(2)} km/L</Badge>
    },
  },
  {
    label: 'Paired Drivers',
    key: 'driver1',
    render: (v, r: any) => (
      <div className="text-sm">
        <span className="font-medium">{String(v ?? '—')}</span>
        {r.driver2 && <span className="text-slate-400"> · {r.driver2}</span>}
      </div>
    ),
  },
]

export default function TopPerformersPage() {
  const [filter, setFilter] = useState({ fromdate: weekAgo, todate: today })
  const [applied, setApplied] = useState(filter)

  const { data, isLoading } = useQuery({
    queryKey: ['fuel-top-performers', applied],
    queryFn: () => fuelService.getTopPerformers(applied),
  })

  const rawList: any[] = data?.data ?? []
  const list = rawList.map((r, i) => ({
    ...r,
    i: i + 1,
    avg_kmpl: r.avg_kmpl || (r.kms_run && r.qty ? (r.kms_run / r.qty).toFixed(2) : 0),
  }))

  const totalKm = list.reduce((s, r) => s + (Number(r.kilometers ?? r.kms_run) || 0), 0)
  const totalQty = list.reduce((s, r) => s + (Number(r.qty ?? r.quantity_filled) || 0), 0)
  const avgKmpl = list.length > 0
    ? (list.reduce((s, r) => s + Number(r.avg_kmpl || 0), 0) / list.length)
    : 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Top Performers" subtitle="Vehicle-wise mileage and efficiency ranking" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-yellow-400 to-amber-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div><Label>From Date</Label><Input type="date" max={today} value={filter.fromdate} onChange={(e) => setFilter({ ...filter, fromdate: e.target.value })} /></div>
          <div><Label>To Date</Label><Input type="date" max={today} value={filter.todate} onChange={(e) => setFilter({ ...filter, todate: e.target.value })} /></div>
          <Button onClick={() => setApplied(filter)}><Search className="w-4 h-4" /> Search</Button>
        </div>
      </GlassCard>

      {list.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Trips', value: list.length, color: 'from-blue-500 to-indigo-500' },
            { label: 'Total KMs', value: `${totalKm.toLocaleString('en-IN')} km`, color: 'from-amber-400 to-orange-500' },
            { label: 'Total Fuel (L)', value: `${totalQty.toFixed(2)} L`, color: 'from-teal-400 to-cyan-500' },
            { label: 'Fleet Avg KMPL', value: `${avgKmpl.toFixed(2)} km/L`, color: avgKmpl >= 4 ? 'from-emerald-400 to-green-500' : 'from-red-400 to-rose-500' },
          ].map((s) => (
            <GlassCard key={s.label} className="p-4">
              <div className={`text-2xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">{s.label}</div>
            </GlassCard>
          ))}
        </div>
      )}

      <DataTable
        title="Vehicle-wise Performance Rankings"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={() => {}}
        actions={[]}
        icon={<Award className="w-5 h-5 text-yellow-500" />}
      />
    </motion.div>
  )
}
