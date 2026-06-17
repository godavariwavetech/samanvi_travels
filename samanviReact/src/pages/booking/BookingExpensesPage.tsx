import { useState } from 'react'
import { motion } from 'motion/react'
import { DollarSign, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, TopNavTabs, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { bookingService } from '@/services/booking.service'

const tabs = ['Additional Income', 'Additional Expenses']

const incomeCols: Column[] = [
  { label: 'Source', key: 'source_name', render: (v) => <span className="font-bold">{String(v)}</span> },
  { label: 'Amount', key: 'amount', render: (v) => <span className="font-bold text-green-600">₹{v}</span> },
  { label: 'Date', key: 'date' },
  { label: 'Added By', key: 'usr_nm' },
  { label: 'Remarks', key: 'remarks' },
]

const today = new Date().toISOString().split('T')[0]

export default function BookingExpensesPage() {
  const [tab, setTab] = useState('Additional Income')
  const qc = useQueryClient()
  const [form, setForm] = useState({ source_name: '', amount: '', date: new Date().toISOString().split('T')[0], remarks: '' })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value })

  const { data, isLoading } = useQuery({
    queryKey: ['additional-income'],
    queryFn: () => bookingService.getAdditionalIncome({}),
  })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => bookingService.addAdditionalIncome({ ...form, user_id: localStorage.getItem('user_id'), usr_nm: localStorage.getItem('usr_nm') }),
    onSuccess: (res) => { if (res.status === 200) { toast.success('Saved!'); qc.invalidateQueries({ queryKey: ['additional-income'] }); setForm({ source_name: '', amount: '', date: new Date().toISOString().split('T')[0], remarks: '' }) } else toast.error('Failed') },
    onError: () => toast.error('Server error'),
  })

  const handleAction = (action: string, row: any) => {
    if (action === 'delete') bookingService.deleteAdditionalIncome({ id: row.id }).then(() => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['additional-income'] }) })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Booking Expenses" subtitle="Manage additional income sources and expense entries" />
      <TopNavTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === 'Additional Income' && (
        <>
          <GlassCard className="p-6" colorBar="bg-gradient-to-r from-green-400 to-emerald-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-500" /> Add Income Source</h2>
              <Button onClick={() => save()} disabled={isPending}><Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Save'}</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div><Label>Source Name *</Label><Input placeholder="e.g. Charter, Luggage etc." value={form.source_name} onChange={f('source_name')} /></div>
              <div><Label>Amount (₹)</Label><Input type="number" value={form.amount} onChange={f('amount')} /></div>
              <div><Label>Date</Label><Input type="date" max={today} value={form.date} onChange={f('date')} /></div>
              <div><Label>Remarks</Label><Input value={form.remarks} onChange={f('remarks')} /></div>
            </div>
          </GlassCard>
          <DataTable title="Additional Income Sources" columns={incomeCols} data={data?.data ?? []} loading={isLoading} onAction={handleAction} />
        </>
      )}

      {tab === 'Additional Expenses' && (
        <GlassCard className="p-10 text-center">
          <p className="text-slate-500 font-medium">Additional expenses are tracked via Trip Expenses module.</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.href = '/trips/expenses'}>Go to Trip Expenses</Button>
        </GlassCard>
      )}
    </motion.div>
  )
}
