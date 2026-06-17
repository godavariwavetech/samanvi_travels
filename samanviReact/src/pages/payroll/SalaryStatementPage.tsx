import { useState } from 'react'
import { motion } from 'motion/react'
import { FileText, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { payrollService } from '@/services/payroll.service'
import { mastersService } from '@/services/masters.service'
import { formatCurrency } from '@/lib/utils'

const cols: Column[] = [
  { label: 'Employee', key: 'name', render: (v, r: any) => <div><div className="font-bold">{String(v)}</div><div className="text-xs text-slate-500">{r.designation}</div></div> },
  { label: 'Month', key: 'month', render: (v) => <Badge variant="info">{String(v)}</Badge> },
  { label: 'Basic', key: 'basic', render: (v) => <span className="font-medium">₹{v}</span> },
  { label: 'Incentive', key: 'incentive', render: (v) => <span className="text-emerald-600 font-medium">+₹{v}</span> },
  { label: 'Advance', key: 'advance', render: (v) => <span className="text-red-500 font-medium">-₹{v}</span> },
  { label: 'Net Pay', key: 'net_pay', render: (v) => <span className="font-extrabold text-emerald-600 text-lg">₹{v}</span> },
  { label: 'Mode', key: 'payment_mode', render: (v) => <Badge variant="teal">{String(v)}</Badge> },
  { label: 'Status', key: 'status', render: (v) => <Badge variant={v === 'Paid' ? 'success' : 'warning'}>{String(v)}</Badge> },
]

export default function SalaryStatementPage() {
  const [filter, setFilter] = useState({ employee_id: '', month: '', year: new Date().getFullYear().toString() })
  const [applied, setApplied] = useState(filter)

  const { data: staff } = useQuery({ queryKey: ['all-staff'], queryFn: () => mastersService.getStaff({}) })
  const { data, isLoading } = useQuery({
    queryKey: ['salary-report', applied],
    queryFn: () => payrollService.getSalaryReport(applied),
  })

  const list: any[] = data?.data ?? []
  const totalPaid = list.reduce((s, r) => s + (Number(r.net_pay) || 0), 0)
  const staffList: any[] = staff?.data ?? []

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Salary Statement" subtitle="Payroll disbursement records and summaries" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-blue-500 to-indigo-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div><Label>Employee</Label>
            <Select value={filter.employee_id} onChange={(e) => setFilter({ ...filter, employee_id: e.target.value })}>
              <option value="">All Employees</option>
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select></div>
          <div><Label>Month</Label>
            <Select value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })}>
              <option value="">All Months</option>
              {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
            </Select></div>
          <div><Label>Year</Label>
            <Select value={filter.year} onChange={(e) => setFilter({ ...filter, year: e.target.value })}>
              {['2024', '2025', '2026'].map(y => <option key={y}>{y}</option>)}
            </Select></div>
          <Button onClick={() => setApplied(filter)}><Search className="w-4 h-4" /> Generate</Button>
        </div>
      </GlassCard>

      {list.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Employees Paid', value: list.length, color: 'text-blue-600' },
            { label: 'Total Disbursed', value: formatCurrency(totalPaid), color: 'text-emerald-600' },
            { label: 'Avg Salary', value: formatCurrency(totalPaid / list.length), color: 'text-purple-600' },
          ].map((s) => (
            <GlassCard key={s.label} className="p-5"><p className="text-xs font-bold text-slate-500 uppercase">{s.label}</p><h3 className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</h3></GlassCard>
          ))}
        </div>
      )}

      <DataTable title="Salary Statement" columns={cols} data={list} loading={isLoading} onAction={() => {}} actions={['view', 'pdf', 'print']} />
    </motion.div>
  )
}
