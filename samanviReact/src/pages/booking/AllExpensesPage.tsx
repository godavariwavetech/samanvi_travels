import { useState } from 'react'
import { motion } from 'motion/react'
import { List, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { tripsService } from '@/services/trips.service'
import { mastersService } from '@/services/masters.service'
import { formatCurrency, formatDate, todayISO } from '@/lib/utils'

const cols: Column[] = [
  { label: 'Trip No', key: 'c_number', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
  { label: 'Date', key: 'date', render: (v) => formatDate(v) },
  { label: 'Expense Type', key: 'expense_type', render: (v) => <Badge variant="info">{String(v)}</Badge> },
  { label: 'Bus', key: 'bus_no' },
  { label: 'Route', key: 'service_no' },
  { label: 'Amount', key: 'amount', render: (v) => <span className="font-bold text-red-600">₹{v}</span> },
  { label: 'Remarks', key: 'remarks' },
  { label: 'By', key: 'usr_nm' },
]

const today = todayISO()

export default function AllExpensesPage() {
  const [filter, setFilter] = useState({ bus_no: '', service_no: '', from_date: '', to_date: '', expense_type: '' })
  const [applied, setApplied] = useState(filter)

  const { data, isLoading } = useQuery({
    queryKey: ['all-expenses-list', applied],
    queryFn: () => tripsService.getExpensesFilter(applied),
  })
  const { data: buses } = useQuery({ queryKey: ['buses'], queryFn: () => mastersService.getBuses() })

  const list: any[] = data?.data ?? []
  const total = list.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  const TYPES = ['Toll', 'Diesel', 'Driver Allowance', 'Repair', 'Parking', 'Police', 'Other']

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="All Expenses List" subtitle="Complete expense ledger across all trips" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-slate-500 to-slate-700">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><List className="w-4 h-4" /> Filter Expenses</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div><Label>Bus</Label>
            <Select value={filter.bus_no} onChange={(e) => setFilter({ ...filter, bus_no: e.target.value })}>
              <option value="">All Buses</option>
              {(buses?.data ?? []).map((b: any) => <option key={b.id} value={b.bus_no}>{b.bus_no}</option>)}
            </Select></div>
          <div><Label>Type</Label>
            <Select value={filter.expense_type} onChange={(e) => setFilter({ ...filter, expense_type: e.target.value })}>
              <option value="">All Types</option>
              {TYPES.map(t => <option key={t}>{t}</option>)}
            </Select></div>
          <div><Label>From</Label><Input type="date" max={today} value={filter.from_date} onChange={(e) => setFilter({ ...filter, from_date: e.target.value })} /></div>
          <div><Label>To</Label><Input type="date" max={today} value={filter.to_date} onChange={(e) => setFilter({ ...filter, to_date: e.target.value })} /></div>
          <div className="flex items-end gap-2">
            <Button onClick={() => setApplied(filter)} className="flex-1"><Search className="w-4 h-4" />Search</Button>
          </div>
        </div>
      </GlassCard>

      {list.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-5"><p className="text-xs font-bold text-slate-500 uppercase">Records Found</p><h3 className="text-2xl font-extrabold text-blue-600">{list.length}</h3></GlassCard>
          <GlassCard className="p-5"><p className="text-xs font-bold text-slate-500 uppercase">Total Amount</p><h3 className="text-2xl font-extrabold text-red-600">{formatCurrency(total)}</h3></GlassCard>
        </div>
      )}

      <DataTable title="All Expenses" columns={cols} data={list} loading={isLoading} onAction={() => {}} actions={['view', 'print']} />
    </motion.div>
  )
}
