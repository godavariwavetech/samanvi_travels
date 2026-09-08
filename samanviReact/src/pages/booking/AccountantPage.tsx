import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { CreditCard, CheckCircle, Send, TrendingUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Select, Label, Badge, PageHeader, DualScrollTable } from '@/components/shared'
import { bookingService } from '@/services/booking.service'
import { formatCurrency } from '@/lib/utils'

export default function AccountantPage() {
  const qc = useQueryClient()
  const userId = localStorage.getItem('user_id') ?? ''
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [targetAccountant, setTargetAccountant] = useState('')

  const { data: records, isLoading } = useQuery({
    queryKey: ['accountant-data', userId],
    queryFn: () => bookingService.getCollectionAgent({ accountant_id: userId }),
  })

  const { data: accountants } = useQuery({
    queryKey: ['accountants-names'],
    queryFn: () => bookingService.getAccountantsNames(),
  })

  const { mutate: assignForward, isPending: forwarding } = useMutation({
    mutationFn: () => bookingService.assignToAgent({
      selected_ids: Array.from(selected),
      accountant_id: targetAccountant,
      user_id: userId,
    }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Records forwarded successfully!')
        setSelected(new Set())
        qc.invalidateQueries({ queryKey: ['accountant-data'] })
      } else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: clearSelected, isPending: clearing } = useMutation({
    mutationFn: () => bookingService.assignToAgent({
      selected_ids: Array.from(selected),
      action: 'clear',
      user_id: userId,
    }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Records cleared/settled!')
        setSelected(new Set())
        qc.invalidateQueries({ queryKey: ['accountant-data'] })
      } else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const recordList: any[] = records?.data ?? []
  const accountantList: any[] = accountants?.data ?? []

  const toggleAll = () => {
    if (selected.size === recordList.length) setSelected(new Set())
    else setSelected(new Set(recordList.map((r) => r.id)))
  }
  const toggleRow = (id: number) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const selectedTotal = useMemo(() =>
    recordList.filter((r) => selected.has(r.id)).reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [selected, recordList]
  )

  const totalAmount = recordList.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Accountant Dashboard" subtitle="Review collections and settle or forward records" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Records', value: recordList.length, color: 'text-blue-600' },
          { label: 'Selected', value: selected.size, color: 'text-purple-600' },
          { label: 'Selected Amount', value: formatCurrency(selectedTotal), color: 'text-emerald-600' },
          { label: 'Total Amount', value: formatCurrency(totalAmount), color: 'text-amber-600' },
        ].map((s) => (
          <GlassCard key={s.label} className="p-5">
            <p className="text-xs font-bold text-slate-500 uppercase">{s.label}</p>
            <h3 className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</h3>
          </GlassCard>
        ))}
      </div>

      {/* Action bar */}
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-teal-500 to-blue-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 max-w-xs">
            <Label>Forward to Accountant</Label>
            <Select value={targetAccountant} onChange={(e) => setTargetAccountant(e.target.value)}>
              <option value="">— Select Accountant —</option>
              {accountantList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </div>
          <Button onClick={() => assignForward()} disabled={forwarding || selected.size === 0 || !targetAccountant}>
            <Send className="w-4 h-4" />{forwarding ? 'Forwarding…' : `Forward ${selected.size} records`}
          </Button>
          <Button
            variant="success"
            onClick={() => clearSelected()}
            disabled={clearing || selected.size === 0}
          >
            <CheckCircle className="w-4 h-4" />{clearing ? 'Settling…' : 'Settle Selected (Yes)'}
          </Button>
          {selected.size > 0 && (
            <Button variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          )}
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-white/40 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-lg">Collection Records</h3>
          <p className="text-xs text-slate-500">{isLoading ? 'Loading…' : `${recordList.length} records`}</p>
        </div>
        <DualScrollTable tableClassName="overflow-auto max-h-[70vh]">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/50">
                <th className="p-4 pl-6 w-12">
                  <input type="checkbox" checked={selected.size === recordList.length && recordList.length > 0}
                    onChange={toggleAll} className="w-4 h-4 accent-blue-600 rounded" />
                </th>
                {['#', 'Passenger', 'Fare', 'Remarks', 'Agent', 'Status'].map((h) => (
                  <th key={h} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">Loading…</td></tr>
              ) : recordList.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400">No records assigned to you</td></tr>
              ) : recordList.map((row, i) => (
                <tr
                  key={row.id}
                  onClick={() => toggleRow(row.id)}
                  className={`cursor-pointer transition-colors ${selected.has(row.id) ? 'bg-teal-50/60' : 'hover:bg-slate-50/50'}`}
                >
                  <td className="p-4 pl-6">
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)}
                      onClick={(e) => e.stopPropagation()} className="w-4 h-4 accent-teal-600 rounded" />
                  </td>
                  <td className="p-4 text-slate-500 text-sm">{i + 1}</td>
                  <td className="p-4 font-medium">{row.name ?? row.accontant_id}</td>
                  <td className="p-4 font-bold text-emerald-600">₹{row.amount}</td>
                  <td className="p-4 text-xs text-slate-500">{row.ramrks}</td>
                  <td className="p-4 text-xs">{row.assigned_name}</td>
                  <td className="p-4">
                    <Badge variant={row.status == 2 ? 'success' : row.status == 1 ? 'danger' : 'warning'}>
                      {row.status == 2 ? 'Accepted' : row.status == 1 ? 'Rejected' : 'Pending'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DualScrollTable>
      </GlassCard>
    </motion.div>
  )
}
