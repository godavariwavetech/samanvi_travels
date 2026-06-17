import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { FileText, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { laundryService } from '@/services/laundry.service'
import { formatCurrency } from '@/lib/utils'

const cols: Column[] = [
  { label: 'Date', key: 'date', render: (v) => <span className="font-bold">{String(v)}</span> },
  { label: 'Vendor', key: 'vendor_name' },
  { label: 'Item', key: 'item_type', render: (v) => <Badge variant="info">{String(v)}</Badge> },
  { label: 'Dispatched', key: 'dispatched_qty', render: (v) => <span className="text-amber-600 font-bold">{v}</span> },
  { label: 'Received', key: 'received_qty', render: (v) => <span className="text-emerald-600 font-bold">{v}</span> },
  { label: 'Pending', key: 'pending_qty', render: (v) => <span className={`font-bold ${Number(v) > 0 ? 'text-red-500' : 'text-slate-400'}`}>{v}</span> },
  { label: 'Amount', key: 'amount', render: (v) => <span className="font-bold">₹{v}</span> },
]

const today = new Date().toISOString().split('T')[0]

export default function LaundryStatementPage() {
  const [filter, setFilter] = useState({ vendor_id: '', from_date: '', to_date: '' })
  const [applied, setApplied] = useState(filter)

  const { data, isLoading } = useQuery({ queryKey: ['laundry-report'], queryFn: () => laundryService.getLaundryReport() })
  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: () => laundryService.getVendorDropdown() })

  // Client-side filter (API is GET with no params)
  const list: any[] = useMemo(() => {
    const all: any[] = data?.data ?? []
    return all.filter((r) => {
      if (applied.vendor_id && String(r.vendor_id) !== applied.vendor_id) return false
      const d = String(r.date ?? r.voucherdate ?? r.i_ts ?? '').split('T')[0]
      if (applied.from_date && d < applied.from_date) return false
      if (applied.to_date && d > applied.to_date) return false
      return true
    })
  }, [data, applied])

  const totalDispatch = list.reduce((s, r) => s + (Number(r.dispatched_qty) || 0), 0)
  const totalReceived = list.reduce((s, r) => s + (Number(r.received_qty) || 0), 0)
  const totalPending = list.reduce((s, r) => s + (Number(r.pending_qty) || 0), 0)
  const totalAmount = list.reduce((s, r) => s + (Number(r.amount) || 0), 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Laundry Statement" subtitle="Laundry dispatch and receipt reconciliation" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-teal-500 to-emerald-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div><Label>Vendor</Label>
            <Select value={filter.vendor_id} onChange={(e) => setFilter({ ...filter, vendor_id: e.target.value })}>
              <option value="">All Vendors</option>
              {(vendors?.data ?? []).map((v: any) => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
            </Select></div>
          <div><Label>From</Label><Input type="date" max={today} value={filter.from_date} onChange={(e) => setFilter({ ...filter, from_date: e.target.value })} /></div>
          <div><Label>To</Label><Input type="date" max={today} value={filter.to_date} onChange={(e) => setFilter({ ...filter, to_date: e.target.value })} /></div>
          <Button onClick={() => setApplied(filter)}><Search className="w-4 h-4" /> Generate</Button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Dispatched', value: totalDispatch, color: 'text-amber-600' },
          { label: 'Received', value: totalReceived, color: 'text-emerald-600' },
          { label: 'Pending', value: totalPending, color: 'text-red-600' },
          { label: 'Total Amount', value: formatCurrency(totalAmount), color: 'text-blue-600' },
        ].map((s) => (
          <GlassCard key={s.label} className="p-5">
            <p className="text-xs font-bold text-slate-500 uppercase">{s.label}</p>
            <h3 className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</h3>
          </GlassCard>
        ))}
      </div>

      <DataTable title="Laundry Statement" columns={cols} data={list} loading={isLoading} onAction={() => {}} actions={['view', 'print']} />
    </motion.div>
  )
}
