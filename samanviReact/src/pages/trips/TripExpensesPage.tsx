import { useState } from 'react'
import { motion } from 'motion/react'
import { Receipt, Save, Search } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { tripsService } from '@/services/trips.service'
import { mastersService } from '@/services/masters.service'

const cols: Column[] = [
  { label: 'Trip No / Date', key: 'c_number', render: (v, r: any) => <div><div className="font-bold text-blue-600">{String(v)}</div><div className="text-xs text-slate-500">{r.date}</div></div> },
  { label: 'Bus', key: 'bus_no' },
  { label: 'Route', key: 'service_no' },
  { label: 'Expense Type', key: 'expense_type', render: (v) => <Badge variant="info">{String(v)}</Badge> },
  { label: 'Amount', key: 'total_amount', render: (v) => <span className="font-bold text-slate-900">₹{v}</span> },
  { label: 'Status', key: 'status', render: (v) => <Badge variant={v == 1 ? 'success' : 'warning'}>{v == 1 ? 'Approved' : 'Pending'}</Badge> },
]

const today = new Date().toISOString().split('T')[0]

export default function TripExpensesPage() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState({ bus_no: '', service_no: '', from_date: '', to_date: '' })
  const [applied, setApplied] = useState(filter)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], bus_no: '', service_no: '', expense_type: '', amount: '', remarks: '', c_id: '', c_number: '' })

  const { data: expenses, isLoading, refetch } = useQuery({
    queryKey: ['trip-expenses', applied],
    queryFn: () => tripsService.getExpenses(applied),
  })
  const { data: buses } = useQuery({ queryKey: ['buses'], queryFn: () => mastersService.getBuses() })
  const { data: routes } = useQuery({ queryKey: ['routes'], queryFn: () => mastersService.getServiceRoutes() })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => tripsService.addExpenses({ ...form, user_id: localStorage.getItem('user_id'), usr_nm: localStorage.getItem('usr_nm') }),
    onSuccess: (res) => { if (res.status === 200) { toast.success('Expense saved!'); refetch(); setForm({ date: new Date().toISOString().split('T')[0], bus_no: '', service_no: '', expense_type: '', amount: '', remarks: '', c_id: '', c_number: '' }) } else toast.error('Failed') },
    onError: () => toast.error('Server error'),
  })

  const handleAction = (action: string, row: any) => {
    if (action === 'delete') tripsService.deleteExpense({ id: row.id }).then(() => { toast.success('Deleted'); refetch() })
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })
  const busList: any[] = buses?.data ?? []
  const routeList: any[] = routes?.data ?? []
  const expenseList: any[] = expenses?.data ?? []

  const EXPENSE_TYPES = ['Toll', 'Diesel', 'Driver Allowance', 'Repair', 'Parking', 'Police', 'Passenger Expense', 'Other']

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Trip Expenses" subtitle="Record and track all trip-related expenses" />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-red-400 to-rose-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Receipt className="w-5 h-5 text-red-500" /> Add Expense Entry</h2>
          <Button onClick={() => save()} disabled={isPending}><Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Save Expense'}</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div><Label>Date</Label><Input type="date" max={today} value={form.date} onChange={f('date')} /></div>
          <div><Label>Bus Number</Label>
            <Select value={form.bus_no} onChange={f('bus_no')}>
              <option value="">Select Bus</option>
              {busList.map((b) => <option key={b.id} value={b.bus_no}>{b.bus_no}</option>)}
            </Select></div>
          <div><Label>Service No</Label>
            <Select value={form.service_no} onChange={f('service_no')}>
              <option value="">Select Route</option>
              {routeList.map((r) => <option key={r.id} value={r.serviceNo}>{r.serviceNo}</option>)}
            </Select></div>
          <div><Label>Expense Type</Label>
            <Select value={form.expense_type} onChange={f('expense_type')}>
              <option value="">Select Type</option>
              {EXPENSE_TYPES.map(t => <option key={t}>{t}</option>)}
            </Select></div>
          <div><Label>Amount (₹)</Label><Input type="number" placeholder="0" value={form.amount} onChange={f('amount')} /></div>
          <div><Label>Trip No (C Number)</Label><Input placeholder="e.g. TRIP001" value={form.c_number} onChange={f('c_number')} /></div>
          <div className="md:col-span-2"><Label>Remarks</Label><Input placeholder="Additional notes..." value={form.remarks} onChange={f('remarks')} /></div>
        </div>
      </GlassCard>

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-slate-400 to-slate-600">
        <div className="flex items-end gap-4 flex-wrap">
          <div><Label>Bus No</Label><Input placeholder="All buses" value={filter.bus_no} onChange={(e) => setFilter({ ...filter, bus_no: e.target.value })} /></div>
          <div><Label>Service No</Label><Input placeholder="All routes" value={filter.service_no} onChange={(e) => setFilter({ ...filter, service_no: e.target.value })} /></div>
          <div><Label>From Date</Label><Input type="date" max={today} value={filter.from_date} onChange={(e) => setFilter({ ...filter, from_date: e.target.value })} /></div>
          <div><Label>To Date</Label><Input type="date" max={today} value={filter.to_date} onChange={(e) => setFilter({ ...filter, to_date: e.target.value })} /></div>
          <Button onClick={() => setApplied(filter)}><Search className="w-4 h-4" /> Apply Filter</Button>
          <button onClick={() => { const e = { bus_no: '', service_no: '', from_date: '', to_date: '' }; setFilter(e); setApplied(e) }}
            className="text-xs text-slate-500 hover:text-red-500 font-medium underline">Clear</button>
        </div>
      </GlassCard>

      <DataTable title="Expense Records" columns={cols} data={expenseList} loading={isLoading} onAction={handleAction} />
    </motion.div>
  )
}
