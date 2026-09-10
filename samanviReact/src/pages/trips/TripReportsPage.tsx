import { useState } from 'react'
import { motion } from 'motion/react'
import { FileText, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { tripsService } from '@/services/trips.service'
import { mastersService } from '@/services/masters.service'
import { formatCurrency, formatDate } from '@/lib/utils'

const cols: Column[] = [
  { label: 'Trip No', key: 'c_number', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
  { label: 'Date', key: 'date', render: (v) => formatDate(v) },
  { label: 'Bus / Route', key: 'bus_no', render: (v, r: any) => <div><div className="font-bold">{String(v)}</div><div className="text-xs text-slate-500">{r.service_no}</div></div> },
  { label: 'Driver', key: 'driver_name' },
  { label: 'Total Exp', key: 'total_amount', render: (v) => <span className="font-bold text-red-600">{formatCurrency(Number(v))}</span> },
  { label: 'Income', key: 'income', render: (v) => <span className="font-bold text-green-600">{formatCurrency(Number(v))}</span> },
  { label: 'Status', key: 'admin_status', render: (v) => <Badge variant={v == 1 ? 'success' : 'warning'}>{v == 1 ? 'Approved' : 'Pending'}</Badge> },
]

const today = new Date().toISOString().split('T')[0]

export default function TripReportsPage() {
  const [filter, setFilter] = useState({ bus_no: '', service_no: '', from_date: '', to_date: '' })
  const [applied, setApplied] = useState(filter)

  const { data, isLoading } = useQuery({
    queryKey: ['trip-reports', applied],
    queryFn: () => tripsService.getExpensesReport(applied),
  })
  const { data: buses } = useQuery({ queryKey: ['buses'], queryFn: () => mastersService.getBuses() })
  const { data: routes } = useQuery({ queryKey: ['routes'], queryFn: () => mastersService.getServiceRoutes() })

  const reportList: any[] = data?.data ?? []
  const totalExp = reportList.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  const totalInc = reportList.reduce((s, r) => s + (Number(r.income) || 0), 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Trip Related Reports" subtitle="Analyse trip expenses and income by route" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-blue-500 to-indigo-500">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Search className="w-4 h-4 text-blue-500" /> Filter Reports</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div><Label>Bus No</Label>
            <Select value={filter.bus_no} onChange={(e) => setFilter({ ...filter, bus_no: e.target.value })}>
              <option value="">All Buses</option>
              {(buses?.data ?? []).map((b: any) => <option key={b.id} value={b.bus_no}>{b.bus_no}</option>)}
            </Select></div>
          <div><Label>Service No</Label>
            <Select value={filter.service_no} onChange={(e) => setFilter({ ...filter, service_no: e.target.value })}>
              <option value="">All Routes</option>
              {(routes?.data ?? []).map((r: any) => <option key={r.id} value={r.serviceNo}>{r.serviceNo}</option>)}
            </Select></div>
          <div><Label>From Date</Label><Input type="date" max={today} value={filter.from_date} onChange={(e) => setFilter({ ...filter, from_date: e.target.value })} /></div>
          <div><Label>To Date</Label><Input type="date" max={today} value={filter.to_date} onChange={(e) => setFilter({ ...filter, to_date: e.target.value })} /></div>
        </div>
        <Button onClick={() => setApplied(filter)}><Search className="w-4 h-4" /> Generate Report</Button>
      </GlassCard>

      {reportList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Trips', value: reportList.length, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Total Expenses', value: formatCurrency(totalExp), color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Total Income', value: formatCurrency(totalInc), color: 'text-green-600', bg: 'bg-green-50' },
          ].map((s) => (
            <GlassCard key={s.label} className={`p-5 ${s.bg}`}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
              <h3 className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</h3>
            </GlassCard>
          ))}
        </div>
      )}

      <DataTable title="Trip Reports" columns={cols} data={reportList} loading={isLoading} onAction={() => {}} actions={['view', 'pdf', 'print']} />
    </motion.div>
  )
}
