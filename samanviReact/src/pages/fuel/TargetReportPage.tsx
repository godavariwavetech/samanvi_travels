import { useState } from 'react'
import { motion } from 'motion/react'
import { Target, Search, TrendingUp, TrendingDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'

const today = new Date().toISOString().split('T')[0]

const cols: Column[] = [
  { label: '#', key: 'i', render: (v) => <span className="text-slate-400 text-xs font-medium">{String(v)}</span> },
  { label: 'Date', key: 'date', render: (v) => <span className="font-medium">{String(v ?? '').split(' ')[0]}</span> },
  { label: 'Service No', key: 'service_number', render: (v) => <Badge variant="info">{String(v ?? '—')}</Badge> },
  { label: 'Bus No', key: 'vehicle_number', render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'Driver 1', key: 'driver1' },
  { label: 'Driver 2', key: 'driver2', render: (v) => <span className="text-slate-500">{String(v ?? '—')}</span> },
  { label: 'Qty Filled (L)', key: 'quantity_filled', render: (v) => <span className="font-bold text-blue-600">{v} L</span> },
  { label: 'Target (L)', key: 'target', render: (v) => <span className="font-medium text-slate-700">{v} L</span> },
  {
    label: 'Achieved',
    key: '_achieved',
    render: (_, row: any) => {
      const achieved = (Number(row.quantity_filled) - Number(row.target)).toFixed(2)
      const isPos = Number(achieved) >= 0
      return (
        <span className={`font-bold flex items-center gap-1 ${isPos ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {achieved} L
        </span>
      )
    },
  },
]

export default function TargetReportPage() {
  const [filter, setFilter] = useState({ fromdate: today, todate: today, ledger_name: '' })
  const [applied, setApplied] = useState(filter)

  const { data, isLoading } = useQuery({
    queryKey: ['fuel-target-report', applied],
    queryFn: () => fuelService.getTargetReports(applied),
  })

  const rawList: any[] = data?.data ?? []
  const list = rawList.map((r, i) => ({ ...r, i: i + 1 }))

  const totalQty = list.reduce((s, r) => s + (Number(r.quantity_filled) || 0), 0)
  const totalTarget = list.reduce((s, r) => s + (Number(r.target) || 0), 0)
  const totalAchieved = totalQty - totalTarget
  const hitCount = list.filter((r) => Number(r.quantity_filled) >= Number(r.target)).length

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Target Report" subtitle="Track fuel target vs actual consumption by service route" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-violet-400 to-purple-600">
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
            { label: 'Qty Filled (L)', value: totalQty.toFixed(2), color: 'from-amber-400 to-orange-500' },
            { label: 'Target (L)', value: totalTarget.toFixed(2), color: 'from-purple-400 to-violet-500' },
            { label: 'Targets Hit', value: `${hitCount}/${list.length}`, color: totalAchieved >= 0 ? 'from-emerald-400 to-teal-500' : 'from-red-400 to-rose-500' },
          ].map((s) => (
            <GlassCard key={s.label} className="p-4">
              <div className={`text-2xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">{s.label}</div>
            </GlassCard>
          ))}
        </div>
      )}

      <DataTable
        title="Target vs Achieved Report"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={() => {}}
        actions={[]}
        icon={<Target className="w-5 h-5 text-purple-500" />}
      />
    </motion.div>
  )
}
