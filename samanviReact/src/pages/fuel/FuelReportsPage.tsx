import { useState } from 'react'
import { motion } from 'motion/react'
import { BarChart2, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, TopNavTabs, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'

const tabs = ['Day Wise', 'Station Wise']

const dayCols: Column[] = [
  { label: 'Date', key: 'date', render: (v) => <span className="font-bold">{String(v)}</span> },
  { label: 'Bus', key: 'vehicle_number', render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'Service', key: 'service_number' },
  { label: 'Litres', key: 'quantity_filled', render: (v) => <span className="font-bold text-blue-600">{v} L</span> },
  { label: 'Amount', key: 'total_bill', render: (v) => <span className="font-bold">₹{v}</span> },
  { label: 'KM Reading', key: 'present_odometer' },
  { label: 'Mileage', key: 'avg_kmpl', render: (v) => v ? <Badge variant={Number(v) >= 4 ? 'success' : 'warning'}>{String(v)} km/L</Badge> : <span className="text-slate-400">—</span> },
]

const stationCols: Column[] = [
  { label: 'Station', key: 'petrolbunk', render: (v) => <span className="font-bold">{String(v ?? '—')}</span> },
  { label: 'Total Fills', key: 'total_fills' },
  { label: 'Total Litres', key: 'total_litres', render: (v) => <span className="font-bold text-blue-600">{v} L</span> },
  { label: 'Total Amount', key: 'total_amount', render: (v) => <span className="font-bold">₹{v}</span> },
]

const today = new Date().toISOString().split('T')[0]

export default function FuelReportsPage() {
  const [tab, setTab] = useState('Day Wise')
  const [filter, setFilter] = useState({ from_date: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0], to_date: new Date().toISOString().split('T')[0], bus_no: '' })
  const [applied, setApplied] = useState(filter)

  const { data: dayData, isLoading: loadDay } = useQuery({
    queryKey: ['fuel-day-reports', applied],
    queryFn: () => fuelService.getDayWiseReports(applied),
    enabled: tab === 'Day Wise',
  })
  const { data: stationData, isLoading: loadStation } = useQuery({
    queryKey: ['fuel-station-reports', applied],
    queryFn: () => fuelService.getStationWiseReports(applied),
    enabled: tab === 'Station Wise',
  })

  const dayList: any[] = dayData?.data ?? []
  const stationList: any[] = stationData?.data ?? []

  const chartData = dayList.slice(0, 14).map((d: any) => ({ name: d.date, litres: Number(d.litres) || 0, amount: Number(d.amount) || 0 }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Fuel Reports" subtitle="Analyse fuel consumption day-wise and station-wise" />
      <TopNavTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-amber-400 to-orange-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div><Label>From Date</Label><Input type="date" max={today} value={filter.from_date} onChange={(e) => setFilter({ ...filter, from_date: e.target.value })} /></div>
          <div><Label>To Date</Label><Input type="date" max={today} value={filter.to_date} onChange={(e) => setFilter({ ...filter, to_date: e.target.value })} /></div>
          <div><Label>Bus No (optional)</Label><Input placeholder="All buses" value={filter.bus_no} onChange={(e) => setFilter({ ...filter, bus_no: e.target.value })} /></div>
          <Button onClick={() => setApplied(filter)}><Search className="w-4 h-4" /> Apply</Button>
        </div>
      </GlassCard>

      {tab === 'Day Wise' && (
        <>
          {chartData.length > 0 && (
            <GlassCard className="p-6">
              <h3 className="font-bold text-slate-900 mb-4">Fuel Consumption Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="litres" fill="#2563EB" name="Litres" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          )}
          <DataTable title="Day-wise Fuel Report" columns={dayCols} data={dayList} loading={loadDay} onAction={() => {}} actions={['view', 'print']} />
        </>
      )}
      {tab === 'Station Wise' && (
        <DataTable title="Station-wise Summary" columns={stationCols} data={stationList} loading={loadStation} onAction={() => {}} actions={['view']} />
      )}
    </motion.div>
  )
}
