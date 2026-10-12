import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Users, Send, TrendingUp } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Select, Label, Badge, PageHeader, DualScrollTable, ExportMenu } from '@/components/shared'
import { exportRows } from '@/lib/tableExport'
import { bookingService } from '@/services/booking.service'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function CollectionAgentPage() {
  const qc = useQueryClient()
  const userId = localStorage.getItem('user_id') ?? ''
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [targetAccountant, setTargetAccountant] = useState('')

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['agent-bookings', userId],
    queryFn: () => bookingService.getCollectionAgent({ user_id: userId }),
  })

  const { data: accountants } = useQuery({
    queryKey: ['accountants-names'],
    queryFn: () => bookingService.getAccountantsNames(),
  })

  const { data: analysis } = useQuery({
    queryKey: ['agent-analysis', userId],
    queryFn: () => bookingService.getBookings(),
  })

  const { mutate: assign, isPending } = useMutation({
    mutationFn: () => bookingService.assignToAgent({
      selected_ids: Array.from(selected),
      accountant_id: targetAccountant,
      user_id: userId,
      usr_nm: localStorage.getItem('usr_nm'),
    }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success(`${selected.size} records assigned successfully!`)
        setSelected(new Set())
        qc.invalidateQueries({ queryKey: ['agent-bookings'] })
      } else toast.error('Failed to assign')
    },
    onError: () => toast.error('Server error'),
  })

  const bookingList: any[] = bookings?.data ?? []
  const accountantList: any[] = accountants?.data ?? []

  const toggleAll = () => {
    if (selected.size === bookingList.length) setSelected(new Set())
    else setSelected(new Set(bookingList.map((b) => b.id)))
  }

  const toggleRow = (id: number) => {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const selectedTotal = useMemo(() =>
    bookingList.filter((b) => selected.has(b.id)).reduce((s, r) => s + (Number(r.finalamount) || 0), 0),
    [selected, bookingList]
  )

  const statCards = [
    { label: 'Total Records', value: bookingList.length, color: 'text-blue-600' },
    { label: 'Selected', value: selected.size, color: 'text-purple-600' },
    { label: 'Selected Amount', value: formatCurrency(selectedTotal), color: 'text-emerald-600' },
    { label: 'Total Collected', value: formatCurrency(bookingList.reduce((s, r) => s + (Number(r.finalamount) || 0), 0)), color: 'text-amber-600' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Collection Agent" subtitle="Select booking records and assign to accountant" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <GlassCard key={s.label} className="p-5">
            <p className="text-xs font-bold text-slate-500 uppercase">{s.label}</p>
            <h3 className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</h3>
          </GlassCard>
        ))}
      </div>

      {/* Assignment bar */}
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-blue-500 to-violet-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="flex-1 max-w-xs">
            <Label>Assign to Accountant</Label>
            <Select value={targetAccountant} onChange={(e) => setTargetAccountant(e.target.value)}>
              <option value="">— Select Accountant —</option>
              {accountantList.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
          </div>
          <Button
            onClick={() => assign()}
            disabled={isPending || selected.size === 0 || !targetAccountant}
          >
            <Send className="w-4 h-4" />
            {isPending ? 'Assigning…' : `Assign ${selected.size} record${selected.size !== 1 ? 's' : ''}`}
          </Button>
          {selected.size > 0 && (
            <Button variant="ghost" onClick={() => setSelected(new Set())}>Clear Selection</Button>
          )}
        </div>
      </GlassCard>

      {/* Table with checkboxes */}
      <GlassCard className="overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-white/40 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-lg">Booking Records</h3>
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-500">{isLoading ? 'Loading…' : `${bookingList.length} records`}</p>
            <ExportMenu
              disabled={isLoading || bookingList.length === 0}
              onExport={(format) => exportRows({
                title: 'Booking Records',
                headers: ['Sl No', 'Date', 'PNR', 'Service', 'Seat', 'Passenger', 'Fare', 'Commission', 'Amount', 'Booked By', 'Status'],
                rows: bookingList.map((r, i) => [
                  i + 1, formatDate(r.date), r.pnr_no ?? '', r.servicenumber ?? '', r.seatnumber ?? '', r.name ?? '',
                  Number(r.fare) || 0, Number(r.agentcommission) || 0, Number(r.finalamount) || 0, r.bookedby ?? '',
                  r.agentstatus == 1 ? 'Assigned' : 'Pending',
                ]),
                format,
              })}
            />
          </div>
        </div>
        <DualScrollTable tableClassName="overflow-auto max-h-[70vh]">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/50">
                <th className="p-4 pl-6 w-12">
                  <input type="checkbox" checked={selected.size === bookingList.length && bookingList.length > 0}
                    onChange={toggleAll} className="w-4 h-4 accent-blue-600 rounded" />
                </th>
                {['Date', 'PNR', 'Service / Seat', 'Passenger', 'Fare', 'Commission', 'Amount', 'Booked By', 'Status'].map((h) => (
                  <th key={h} className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-400">Loading…</td></tr>
              ) : bookingList.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-slate-400">No records found</td></tr>
              ) : bookingList.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => toggleRow(row.id)}
                  className={`cursor-pointer transition-colors ${selected.has(row.id) ? 'bg-blue-50/60' : 'hover:bg-slate-50/50'}`}
                >
                  <td className="p-4 pl-6">
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)}
                      onClick={(e) => e.stopPropagation()} className="w-4 h-4 accent-blue-600 rounded" />
                  </td>
                  <td className="p-4 text-sm text-slate-600">{formatDate(row.date)}</td>
                  <td className="p-4 font-bold text-blue-600">{row.pnr_no}</td>
                  <td className="p-4 text-sm"><div className="font-medium">{row.servicenumber}</div><div className="text-xs text-slate-400">{row.seatnumber}</div></td>
                  <td className="p-4 font-medium">{row.name}</td>
                  <td className="p-4 text-sm">₹{row.fare}</td>
                  <td className="p-4 text-sm text-red-500">₹{row.agentcommission}</td>
                  <td className="p-4 font-bold text-emerald-600">₹{row.finalamount}</td>
                  <td className="p-4 text-xs">{row.bookedby}</td>
                  <td className="p-4"><Badge variant={row.agentstatus == 1 ? 'success' : 'warning'}>{row.agentstatus == 1 ? 'Assigned' : 'Pending'}</Badge></td>
                </tr>
              ))}
            </tbody>
            {selected.size > 0 && (
              <tfoot>
                <tr className="bg-blue-50 border-t-2 border-blue-200">
                  <td colSpan={6} className="p-4 pl-6 font-bold text-blue-800">{selected.size} records selected</td>
                  <td className="p-4 font-extrabold text-emerald-700 text-lg">{formatCurrency(selectedTotal)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </DualScrollTable>
      </GlassCard>
    </motion.div>
  )
}
