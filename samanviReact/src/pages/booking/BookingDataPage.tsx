import { useState } from 'react'
import { motion } from 'motion/react'
import { BookOpen, Search, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { bookingService } from '@/services/booking.service'
import { formatCurrency, formatDate } from '@/lib/utils'

const cols: Column[] = [
  { label: 'PNR / Seat', key: 'pnr_no', render: (v, r: any) => <div><div className="font-bold">{String(v)}</div><div className="text-xs text-slate-500">Seat: {r.seatnumber}</div></div> },
  { label: 'Passenger', key: 'name' },
  { label: 'Service', key: 'servicenumber', render: (v, r: any) => <div><div className="font-medium text-blue-600">{String(v)}</div><div className="text-xs text-slate-500">{formatDate(r.date)}</div></div> },
  { label: 'Booked By', key: 'bookedby' },
  { label: 'Fare', key: 'fare', render: (v) => <span className="font-medium">₹{v}</span> },
  { label: 'Amount', key: 'finalamount', render: (v) => <span className="font-bold text-emerald-600">₹{v}</span> },
  { label: 'Source', key: 'booking_source', render: (v) => <Badge variant="teal">{String(v).slice(0, 15)}</Badge> },
  { label: 'Status', key: 'agentstatus', render: (v) => <Badge variant={v == 1 ? 'success' : 'warning'}>{v == 1 ? 'Assigned' : 'Pending'}</Badge> },
]

const today = new Date().toISOString().split('T')[0]

export default function BookingDataPage() {
  const qc = useQueryClient()
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0])
  const [searchDate, setSearchDate] = useState(travelDate)

  const { data, isLoading } = useQuery({
    queryKey: ['bookings', searchDate],
    queryFn: () => bookingService.getBookingsByDates({ date: searchDate }),
  })

  const { data: allBookings } = useQuery({ queryKey: ['all-bookings'], queryFn: () => bookingService.getBookings() })

  const bookingList: any[] = data?.data ?? []
  const totalFare = bookingList.reduce((s, r) => s + (Number(r.fare) || 0), 0)
  const totalCollected = bookingList.reduce((s, r) => s + (Number(r.finalamount) || 0), 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Booking Data" subtitle="View and manage online booking collections" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-blue-500 to-indigo-500">
        <div className="flex items-end gap-4">
          <div className="flex-1"><Label>Travel Date</Label><Input type="date" max={today} value={travelDate} onChange={(e) => setTravelDate(e.target.value)} /></div>
          <Button onClick={() => setSearchDate(travelDate)}><Search className="w-4 h-4" /> Fetch Bookings</Button>
        </div>
      </GlassCard>

      {bookingList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Passengers', value: bookingList.length, color: 'text-blue-600' },
            { label: 'Total Fare', value: formatCurrency(totalFare), color: 'text-amber-600' },
            { label: 'Amount Collected', value: formatCurrency(totalCollected), color: 'text-green-600' },
          ].map((s) => (
            <GlassCard key={s.label} className="p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
              <h3 className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</h3>
            </GlassCard>
          ))}
        </div>
      )}

      <DataTable title={`Bookings — ${searchDate}`} columns={cols} data={bookingList} loading={isLoading} onAction={() => {}} actions={['view', 'edit']} />
    </motion.div>
  )
}
