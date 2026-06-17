import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Scale, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { accountingService } from '@/services/accounting.service'
import { formatCurrency } from '@/lib/utils'
import { useFYStore } from '@/store/fy.store'

const cols: Column[] = [
  { label: 'Ledger Name', key: 'ledger_name', render: (v, r: any) => <div><div className="font-bold">{String(v)}</div><div className="text-xs text-slate-500">{r.group_name}</div></div> },
  { label: 'Group', key: 'group_name', render: (v) => <Badge variant="slate">{String(v)}</Badge> },
  { label: 'Debit (₹)', key: 'debit', render: (v) => v && Number(v) > 0 ? <span className="font-bold text-red-600">{formatCurrency(Number(v))}</span> : <span className="text-slate-300">—</span> },
  { label: 'Credit (₹)', key: 'credit', render: (v) => v && Number(v) > 0 ? <span className="font-bold text-emerald-600">{formatCurrency(Number(v))}</span> : <span className="text-slate-300">—</span> },
  {
    label: 'Closing Balance',
    key: 'debit',
    render: (_v, r: any) => {
      const cb = Number(r.debit) - Number(r.credit)
      if (cb === 0) return <span className="text-slate-300">—</span>
      return cb > 0
        ? <span className="font-bold text-red-600">{formatCurrency(cb)} Dr</span>
        : <span className="font-bold text-emerald-600">{formatCurrency(Math.abs(cb))} Cr</span>
    },
  },
]

const today = new Date().toISOString().split('T')[0]

export default function TrialBalancePage() {
  const selectedFY = useFYStore(s => s.selectedFY)
  const [range, setRange] = useState({ fromdate: selectedFY.fromDate, todate: selectedFY.toDate })
  const [applied, setApplied] = useState(range)

  useEffect(() => {
    const next = { fromdate: selectedFY.fromDate, todate: selectedFY.toDate }
    setRange(next)
    setApplied(next)
  }, [selectedFY.fromDate, selectedFY.toDate])

  const { data, isLoading } = useQuery({
    queryKey: ['trial-balance', applied],
    queryFn: () => accountingService.getTrialBalance(applied),
  })

  const raw = data?.data
  const voucherRows: any[] = Array.isArray(raw?.mainVoucherDetails) ? raw.mainVoucherDetails : []

  // Aggregate per-ledger Dr/Cr totals from voucher sub-rows
  const ledgerMap = new Map<string, { ledger_name: string; group_name: string; debit: number; credit: number }>()
  voucherRows.forEach((r: any) => {
    const name = r.expensives || 'Unknown'
    const group = r.child || r.staticname || '—'
    if (!ledgerMap.has(name)) ledgerMap.set(name, { ledger_name: name, group_name: group, debit: 0, credit: 0 })
    const entry = ledgerMap.get(name)!
    if (r.account_type === 'Debit Account') entry.debit += Number(r.amount) || 0
    else if (r.account_type === 'Credit Account') entry.credit += Number(r.amount) || 0
  })
  const list = Array.from(ledgerMap.values())
  const totalDr = list.reduce((s, r) => s + r.debit, 0)
  const totalCr = list.reduce((s, r) => s + r.credit, 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Trial Balance" subtitle="Verify that total debits equal total credits" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-slate-600 to-slate-800">
        <div className="flex items-end gap-4 flex-wrap">
          <div><Label>From Date</Label><Input type="date" max={today} value={range.fromdate} onChange={(e) => setRange({ ...range, fromdate: e.target.value })} /></div>
          <div><Label>As Of Date</Label><Input type="date" max={today} value={range.todate} onChange={(e) => setRange({ ...range, todate: e.target.value })} /></div>
          <Button onClick={() => setApplied(range)}><Search className="w-4 h-4" /> Generate</Button>
        </div>
      </GlassCard>

      {list.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Debit', value: formatCurrency(totalDr), color: 'text-red-600' },
            { label: 'Total Credit', value: formatCurrency(totalCr), color: 'text-emerald-600' },
            { label: 'Difference', value: formatCurrency(Math.abs(totalDr - totalCr)), color: totalDr === totalCr ? 'text-green-600' : 'text-red-600' },
          ].map((s) => (
            <GlassCard key={s.label} className="p-5"><p className="text-xs font-bold text-slate-500 uppercase">{s.label}</p><h3 className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</h3></GlassCard>
          ))}
        </div>
      )}

      {list.length > 0 && totalDr === totalCr && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 font-bold text-sm">
          <Scale className="w-4 h-4" /> Trial balance is balanced — Debits = Credits
        </div>
      )}

      <DataTable title="Trial Balance" columns={cols} data={list} loading={isLoading} onAction={() => {}} actions={['view', 'print']} />
    </motion.div>
  )
}
