import { useState } from 'react'
import { motion } from 'motion/react'
import { Briefcase, CreditCard } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, TopNavTabs, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mastersService } from '@/services/masters.service'

const tabs = ['Salary Payment', 'Salary Statement']

const salaryColumns: Column[] = [
  { label: 'Employee', key: 'name', render: (v, r: any) => <div><div className="font-bold">{String(v)}</div><div className="text-xs text-slate-500">{r.designation}</div></div> },
  { label: 'Basic (₹)', key: 'basic', render: (v) => <span className="font-medium">₹{v}</span> },
  { label: 'Incentive (₹)', key: 'incentive', render: (v) => <span className="text-green-600 font-medium">+₹{v}</span> },
  { label: 'Advance Deduction', key: 'advance', render: (v) => <span className="text-red-500 font-medium">-₹{v}</span> },
  { label: 'Net Pay', key: 'net', render: (v) => <span className="font-extrabold text-emerald-600 text-lg">₹{v}</span> },
  { label: 'Status', key: 'status', render: (v) => <Badge variant="success">{String(v)}</Badge> },
]

export default function SalaryPaymentPage() {
  const [tab, setTab] = useState('Salary Payment')
  const [debit, setDebit] = useState({ employee: '', basic: '', incentive: '', advance: '' })
  const [credit, setCredit] = useState({ mode: 'Bank Transfer', ledger: '', ref: '' })

  const { data: staff } = useQuery({ queryKey: ['all-staff'], queryFn: () => mastersService.getStaff({}) })

  const net = (parseFloat(debit.basic) || 0) + (parseFloat(debit.incentive) || 0) - (parseFloat(debit.advance) || 0)
  const staffList: any[] = staff?.data ?? []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Payroll Management" subtitle="Process salary payments and generate payslips" />
      <TopNavTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === 'Salary Payment' && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Debit Side */}
            <GlassCard className="p-6" colorBar="bg-gradient-to-r from-red-400 to-rose-500">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                <Briefcase className="w-5 h-5 text-red-500" /> Debit Account (Salary Expense)
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Employee</Label>
                    <Select value={debit.employee} onChange={(e) => setDebit({ ...debit, employee: e.target.value })}>
                      <option value="">Select Employee</option>
                      {staffList.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </Select></div>
                  <div><Label>Role / Branch</Label><Input disabled value="Loading…" className="bg-slate-100" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Basic Salary (₹)</Label><Input type="number" value={debit.basic} onChange={(e) => setDebit({ ...debit, basic: e.target.value })} /></div>
                  <div><Label>Incentive (₹)</Label><Input type="number" value={debit.incentive} onChange={(e) => setDebit({ ...debit, incentive: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Advance Deduction (₹)</Label><Input type="number" value={debit.advance} onChange={(e) => setDebit({ ...debit, advance: e.target.value })} /></div>
                  <div><Label>Net Salary</Label>
                    <Input disabled value={`₹ ${net.toLocaleString('en-IN')}`}
                      className={`font-bold text-lg ${net >= 0 ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900'}`} />
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Credit Side */}
            <GlassCard className="p-6 flex flex-col justify-between" colorBar="bg-gradient-to-r from-blue-400 to-indigo-500">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-6">
                  <CreditCard className="w-5 h-5 text-blue-500" /> Credit Account (Payment Source)
                </h2>
                <div className="space-y-4">
                  <div><Label>Payment Mode</Label>
                    <Select value={credit.mode} onChange={(e) => setCredit({ ...credit, mode: e.target.value })}>
                      <option>Bank Transfer (NEFT/RTGS)</option>
                      <option>Cash</option>
                      <option>Cheque</option>
                    </Select></div>
                  <div><Label>Select Ledger</Label>
                    <Select value={credit.ledger} onChange={(e) => setCredit({ ...credit, ledger: e.target.value })}>
                      <option value="">Select bank ledger</option>
                      <option>HDFC Bank Rajahmundry</option>
                      <option>SBI Vijayawada</option>
                      <option>Petty Cash</option>
                    </Select></div>
                  <div><Label>Transaction Reference</Label>
                    <Input placeholder="UTR or Cheque Number" value={credit.ref} onChange={(e) => setCredit({ ...credit, ref: e.target.value })} /></div>
                </div>
              </div>
              <Button
                className="w-full text-base h-12 mt-6"
                onClick={() => toast.success(`Salary of ₹${net.toLocaleString('en-IN')} processed!`)}
                disabled={!debit.employee || net <= 0}
              >
                Process Payment ₹{net.toLocaleString('en-IN')}
              </Button>
            </GlassCard>
          </div>

          <DataTable
            title="Recent Salary Disbursals"
            columns={salaryColumns}
            data={[]}
            onAction={() => {}}
          />
        </>
      )}
    </motion.div>
  )
}
