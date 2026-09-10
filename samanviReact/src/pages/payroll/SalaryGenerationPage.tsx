import { useState } from 'react'
import { motion } from 'motion/react'
import { Calculator, Search, Users, TrendingUp, Wallet } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { payrollService } from '@/services/payroll.service'
import { mastersService } from '@/services/masters.service'
import { formatDate } from '@/lib/utils'

const today = new Date().toISOString().split('T')[0]
const firstOfMonth = today.slice(0, 8) + '01'

const cols: Column[] = [
  { label: 'Employee', key: 'name', render: (v) => <span className="font-bold text-slate-800">{String(v ?? '—')}</span> },
  { label: 'Driver Duties', key: 'driver1_count', render: (v) => <Badge variant="info">{String(v ?? 0)}</Badge> },
  { label: 'Co-Driver', key: 'driver2_count', render: (v) => <Badge variant="purple">{String(v ?? 0)}</Badge> },
  { label: 'Total Duties', key: 'totalduties', render: (v) => <span className="font-bold">{String(v ?? 0)}</span> },
  { label: 'Duty Amount (₹)', key: 'amount', render: (v) => <span className="font-medium">₹{Number(v ?? 0).toLocaleString('en-IN')}</span> },
  { label: 'Old Balance (₹)', key: 'oldbalance', render: (v) => <span className={Number(v) > 0 ? 'text-amber-600 font-medium' : 'text-slate-400'}>₹{Number(v ?? 0).toLocaleString('en-IN')}</span> },
  { label: 'Incentive (₹)', key: 'incentive', render: (v) => <span className="text-emerald-600 font-medium">+₹{Number(v ?? 0).toLocaleString('en-IN')}</span> },
  { label: 'Total (₹)', key: 'total', render: (v) => <span className="font-bold">₹{Number(v ?? 0).toLocaleString('en-IN')}</span> },
  { label: 'Advance (₹)', key: 'advance', render: (v) => <span className="text-red-500 font-medium">-₹{Number(v ?? 0).toLocaleString('en-IN')}</span> },
  {
    label: 'Net Pay (₹)',
    key: 'balance2',
    render: (v) => {
      const val = Number(v ?? 0)
      return <span className={`font-extrabold text-base ${val >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>₹{val.toLocaleString('en-IN')}</span>
    },
  },
  { label: 'Status', key: 'check_payment', render: (v) => <Badge variant={v === '1' ? 'success' : 'warning'}>{v === '1' ? 'Paid' : 'Pending'}</Badge> },
]

export default function SalaryGenerationPage() {
  const [filter, setFilter] = useState({ fromdate: firstOfMonth, todate: today, role_type: '', c_number: '' })
  const [applied, setApplied] = useState<typeof filter | null>(null)

  const { data: staff } = useQuery({ queryKey: ['all-staff'], queryFn: () => mastersService.getStaff({}) })

  const { data, isLoading } = useQuery({
    queryKey: ['salary-gen', applied],
    queryFn: () => payrollService.getSalaryReport(applied),
    enabled: !!applied,
  })

  const list: any[] = data?.data ?? []

  const totalNet = list.reduce((s, r) => s + (Number(r.balance2) || 0), 0)
  const totalDuties = list.reduce((s, r) => s + (Number(r.totalduties) || 0), 0)
  const paidCount = list.filter((r) => r.check_payment === '1').length

  const handleGenerate = () => {
    if (!filter.fromdate || !filter.todate) { toast.error('Select date range'); return }
    setApplied({ ...filter })
  }

  const staffList: any[] = staff?.data ?? []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Salary Generation" subtitle="Generate salary sheets based on duty performance and advances" />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-emerald-400 to-teal-500">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
          <Calculator className="w-4 h-4 text-emerald-500" /> Generate Salary Sheet
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>From Date *</Label>
            <Input type="date" max={today} value={filter.fromdate} onChange={(e) => setFilter({ ...filter, fromdate: e.target.value })} />
          </div>
          <div>
            <Label>To Date *</Label>
            <Input type="date" max={today} value={filter.todate} onChange={(e) => setFilter({ ...filter, todate: e.target.value })} />
          </div>
          <div>
            <Label>Role Type</Label>
            <Select value={filter.role_type} onChange={(e) => setFilter({ ...filter, role_type: e.target.value })}>
              <option value="">All Roles</option>
              <option value="1">Driver (Role 1)</option>
              <option value="2">Helper (Role 2)</option>
              <option value="3">Conductor (Role 3)</option>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={handleGenerate} disabled={isLoading}>
              <Search className="w-4 h-4" /> {isLoading ? 'Generating…' : 'Generate'}
            </Button>
          </div>
        </div>
      </GlassCard>

      {applied && list.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: list.length, icon: Users, color: 'from-blue-500 to-indigo-500' },
            { label: 'Total Duties', value: totalDuties, icon: TrendingUp, color: 'from-amber-400 to-orange-500' },
            { label: 'Net Payable (₹)', value: `₹${totalNet.toLocaleString('en-IN')}`, icon: Wallet, color: 'from-emerald-400 to-teal-500' },
            { label: 'Paid / Total', value: `${paidCount} / ${list.length}`, icon: Calculator, color: paidCount === list.length ? 'from-green-400 to-emerald-500' : 'from-amber-400 to-yellow-500' },
          ].map((s) => (
            <GlassCard key={s.label} className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center flex-shrink-0`}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-800">{s.value}</div>
                <div className="text-xs text-slate-500 font-semibold">{s.label}</div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {applied && (
        <DataTable
          title={`Salary Sheet — ${formatDate(applied.fromdate)} to ${formatDate(applied.todate)}`}
          columns={cols}
          data={list}
          loading={isLoading}
          onAction={() => {}}
          actions={[]}
          icon={<Calculator className="w-5 h-5 text-emerald-500" />}
        />
      )}

      {!applied && (
        <GlassCard className="p-12 text-center">
          <Calculator className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Select a date range and click <strong>Generate</strong> to produce the salary sheet.</p>
        </GlassCard>
      )}
    </motion.div>
  )
}
