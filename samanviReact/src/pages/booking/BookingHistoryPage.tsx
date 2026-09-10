import { useState } from 'react'
import { motion } from 'motion/react'
import { History, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { bookingService } from '@/services/booking.service'
import { formatCurrency, formatDate } from '@/lib/utils'

const cols: Column[] = [
  { label: 'PNR', key: 'pnr_no', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
  { label: 'Passenger', key: 'name' },
  { label: 'Service', key: 'servicenumber' },
  { label: 'Date', key: 'date', render: (v) => formatDate(v) },
  { label: 'Booked By', key: 'bookedby' },
  { label: 'Fare', key: 'fare', render: (v) => <span className="font-medium">₹{v}</span> },
  { label: 'Final', key: 'finalamount', render: (v) => <span className="font-bold text-emerald-600">₹{v}</span> },
  { label: 'Agent', key: 'assigned_name', render: (v) => <Badge variant="info">{String(v)}</Badge> },
]

const today = new Date().toISOString().split('T')[0]

export default function BookingHistoryPage() {
  const [range, setRange] = useState({ from: '', to: '' })
  const [applied, setApplied] = useState<{from:string,to:string}|null>(null)

  const { data: history, isLoading } = useQuery({
    queryKey: ['booking-history', applied],
    queryFn: () => applied
      ? bookingService.getBookingsByDates({ from_date: applied.from, to_date: applied.to })
      : bookingService.getBookingsDateWise(),
  })

  const list: any[] = history?.data ?? []
  const total = list.reduce((s, r) => s + (Number(r.finalamount) || 0), 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Booking History" subtitle="Date-wise booking records and analysis" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-violet-500 to-purple-500">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><History className="w-4 h-4 text-violet-500" /> Filter by Date Range</h3>
        <div className="flex items-end gap-4">
          <div><Label>From Date</Label><Input type="date" max={today} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></div>
          <div><Label>To Date</Label><Input type="date" max={today} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></div>
          <Button onClick={() => setApplied(range)}><Search className="w-4 h-4" /> Apply Filter</Button>
          <Button variant="ghost" onClick={() => { setApplied(null); setRange({ from: '', to: '' }) }}>Clear</Button>
        </div>
      </GlassCard>

      {list.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <GlassCard className="p-5">
            <p className="text-xs font-bold text-slate-500 uppercase">Total Records</p>
            <h3 className="text-2xl font-extrabold text-blue-600">{list.length}</h3>
          </GlassCard>
          <GlassCard className="p-5">
            <p className="text-xs font-bold text-slate-500 uppercase">Total Collected</p>
            <h3 className="text-2xl font-extrabold text-green-600">{formatCurrency(total)}</h3>
          </GlassCard>
        </div>
      )}

      <DataTable title="Booking History" columns={cols} data={list} loading={isLoading} onAction={() => {}} actions={['view', 'print']} />
    </motion.div>
  )
}
