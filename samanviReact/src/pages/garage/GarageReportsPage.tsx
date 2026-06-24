import { useState } from 'react'
import { motion } from 'motion/react'
import { BarChart2, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { fuelService } from '@/services/fuel.service'
import { formatCurrency } from '@/lib/utils'

const cols: Column[] = [
  { label: 'Job Card', key: 'job_card_no', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
  { label: 'Bus', key: 'bus_no' },
  { label: 'Category', key: 'category', render: (v) => <Badge variant="warning">{String(v)}</Badge> },
  { label: 'Parts Cost', key: 'parts_cost', render: (v) => <span className="font-medium">₹{v}</span> },
  { label: 'Labour', key: 'labour_cost', render: (v) => <span className="font-medium">₹{v}</span> },
  { label: 'Total', key: 'total_amount', render: (v) => <span className="font-bold text-slate-900">₹{v}</span> },
  { label: 'Completed', key: 'completed_date' },
]

const today = new Date().toISOString().split('T')[0]

export default function GarageReportsPage() {
  const [filter, setFilter] = useState({ bus_no: '', from_date: '', to_date: '', category: '' })
  const [applied, setApplied] = useState(filter)

  const { data, isLoading } = useQuery({ queryKey: ['garage-reports', applied], queryFn: () => garageService.getRepairEntries(applied) })
  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })
  const { data: categories, refetch: reloadCats, isFetching: loadingCats } = useQuery({ queryKey: ['repair-cats'], queryFn: () => garageService.getCategories() })

  const list: any[] = data?.data ?? []
  const totalCost = list.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  const catList: any[] = categories?.data ?? []
  const busList: any[] = buses?.data ?? []

  const chartData = catList.map(c => ({
    name: c.name,
    cost: list.filter(r => r.category === c.name).reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  })).filter(d => d.cost > 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Garage Reports" subtitle="Vehicle repair cost analysis and maintenance history" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-orange-500 to-red-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div><Label>Bus</Label>
            <SearchableSelect
              value={filter.bus_no}
              onChange={(v) => setFilter({ ...filter, bus_no: v })}
              options={busList.map((b) => ({ value: b.bus_no, label: b.bus_no }))}
              placeholder="All Buses"
              onReload={() => reloadBuses()}
              reloading={loadingBuses}
            /></div>
          <div><Label>Category</Label>
            <SearchableSelect
              value={filter.category}
              onChange={(v) => setFilter({ ...filter, category: v })}
              options={catList.map((c) => ({ value: c.name, label: c.name }))}
              placeholder="All Categories"
              onReload={() => reloadCats()}
              reloading={loadingCats}
            /></div>
          <div><Label>From</Label><Input type="date" max={today} value={filter.from_date} onChange={(e) => setFilter({ ...filter, from_date: e.target.value })} /></div>
          <div><Label>To</Label><Input type="date" max={today} value={filter.to_date} onChange={(e) => setFilter({ ...filter, to_date: e.target.value })} /></div>
          <Button onClick={() => setApplied(filter)}><Search className="w-4 h-4" /> Apply</Button>
        </div>
      </GlassCard>

      {list.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Job Cards', value: list.length, color: 'text-blue-600' },
              { label: 'Total Cost', value: formatCurrency(totalCost), color: 'text-red-600' },
              { label: 'Avg Per Job', value: formatCurrency(totalCost / list.length), color: 'text-amber-600' },
            ].map((s) => <GlassCard key={s.label} className="p-5"><p className="text-xs font-bold text-slate-500 uppercase">{s.label}</p><h3 className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</h3></GlassCard>)}
          </div>
          {chartData.length > 0 && (
            <GlassCard className="p-6">
              <h3 className="font-bold text-slate-900 mb-4">Cost by Category</h3>
              <div className="h-56">
                <ResponsiveContainer><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="cost" fill="#f59e0b" name="Cost (₹)" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
              </div>
            </GlassCard>
          )}
        </>
      )}

      <DataTable title="Repair Reports" columns={cols} data={list} loading={isLoading} onAction={() => {}} actions={['view', 'pdf', 'print']} />
    </motion.div>
  )
}
