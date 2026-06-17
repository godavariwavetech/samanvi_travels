import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle, XCircle, Clock, Search, X, User, FileText } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, TopNavTabs, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { tripsService } from '@/services/trips.service'

const today = new Date().toISOString().split('T')[0]
const firstOfMonth = today.slice(0, 8) + '01'

const tabs = ['Pending', 'Approved', 'Rejected']

function TripViewModal({ trip, onClose }: { trip: any; onClose: () => void }) {
  const statusVariant = trip.admin_status === 1 ? 'success' : trip.admin_status === 2 ? 'danger' : 'warning'
  const statusLabel = trip.admin_status === 1 ? 'Approved' : trip.admin_status === 2 ? 'Rejected' : 'Pending'

  const field = (label: string, value: any) => (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value || <span className="text-slate-300">—</span>}</p>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <span className="font-bold text-blue-600 text-lg">{trip.c_number ?? `#${trip.id}`}</span>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-200 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Trip info */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-2xl">
            {field('Trip Date', String(trip.trip_date ?? '').split('T')[0])}
            {field('Trip For', trip.trip_for)}
            {field('Bus No', trip.bus_no)}
            {field('Service No', trip.service_no)}
            {field('Phone', trip.phone_number)}
            {field('Total Amount', trip.total_amount ? `₹${trip.total_amount}` : null)}
          </div>

          {/* Crew */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Crew
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-blue-50/40 rounded-2xl">
              {field('Driver 1', trip.driver1_name)}
              {field('Driver 2', trip.driver2_name)}
              {field('Helper', trip.helper_name)}
              {field('Conductor', trip.conductor_name)}
              {field('Paid To', trip.paid_to_name)}
            </div>
          </div>

          {/* Description / Remarks */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Description / Remarks
            </p>
            <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl min-h-[64px]">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {trip.remarks || <span className="text-slate-300 italic">No remarks entered</span>}
              </p>
            </div>
          </div>

          {/* Admin info */}
          {(trip.admin_status_by_name || trip.status_date) && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl">
              {field('Action By', trip.admin_status_by_name)}
              {field('Action Date', String(trip.status_date ?? '').split('T')[0])}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function AdminApprovalsPage() {
  const [tab, setTab] = useState('Pending')
  const [viewTrip, setViewTrip] = useState<any>(null)
  const [fromDate, setFromDate] = useState(firstOfMonth)
  const [toDate, setToDate] = useState(today)
  const [applied, setApplied] = useState({ from: firstOfMonth, to: today })
  const qc = useQueryClient()

  // All trips from trip_created table (same source as TripCreationPage)
  const { data: tripData, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => tripsService.getTrips1(),
  })

  const { mutate: updateStatus, isPending: updating } = useMutation({
    mutationFn: (payload: { id: number; status: number }) =>
      tripsService.updateTripAdminStatus({
        id: payload.id,
        admin_status: payload.status,
        user_id: localStorage.getItem('user_id'),
        usr_nm: localStorage.getItem('usr_nm'),
      }),
    onSuccess: (res) => {
      if (res?.status === 200) {
        toast.success('Status updated!')
        qc.invalidateQueries({ queryKey: ['trips'] })
      } else {
        toast.error('Failed to update status')
      }
    },
    onError: () => toast.error('Server error'),
  })

  const allTrips: any[] = tripData?.data ?? []

  // Date-range filter + status filter
  const filtered = useMemo(() => {
    const statusMap: Record<string, number> = { Pending: 0, Approved: 1, Rejected: 2 }
    const targetStatus = statusMap[tab]
    return allTrips.filter((t) => {
      if (t.admin_status !== targetStatus) return false
      const d = String(t.trip_date ?? t.cts ?? '').split('T')[0]
      if (!d) return true
      if (applied.from && d < applied.from) return false
      if (applied.to && d > applied.to) return false
      return true
    })
  }, [allTrips, tab, applied])

  const pendingCount = allTrips.filter((t) => t.admin_status === 0).length
  const approvedCount = allTrips.filter((t) => t.admin_status === 1).length
  const rejectedCount = allTrips.filter((t) => t.admin_status === 2).length

  const buildCols = (): Column[] => [
    {
      label: 'Trip ID / Date', key: 'c_number',
      render: (v, r: any) => (
        <div>
          <div className="font-bold text-blue-600">{String(v ?? `#${r.id}`)}</div>
          <div className="text-xs text-slate-400">{String(r.trip_date ?? '').split('T')[0]}</div>
        </div>
      ),
    },
    {
      label: 'Bus / Service', key: 'bus_no',
      render: (v, r: any) => (
        <div>
          <div className="font-semibold">{String(v ?? '—')}</div>
          <div className="text-xs text-slate-500">{r.service_no} · {r.trip_for}</div>
        </div>
      ),
    },
    {
      label: 'Crew', key: 'driver1_name',
      render: (v, r: any) => (
        <div className="text-xs space-y-0.5">
          {v && <div>D1: <span className="font-medium">{String(v)}</span></div>}
          {r.driver2_name && <div>D2: <span className="font-medium">{r.driver2_name}</span></div>}
          {r.helper_name && <div>H: <span className="font-medium">{r.helper_name}</span></div>}
        </div>
      ),
    },
    { label: 'Paid To', key: 'paid_to_name', render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
    {
      label: 'Description', key: 'remarks',
      render: (v) => v
        ? <span className="text-sm text-slate-600 line-clamp-2 max-w-[180px]">{String(v)}</span>
        : <span className="text-slate-300 text-sm">—</span>,
    },
    {
      label: 'Status', key: 'admin_status',
      render: (v) => (
        <Badge variant={v == 1 ? 'success' : v == 2 ? 'danger' : 'warning'}>
          {v == 1 ? 'Approved' : v == 2 ? 'Rejected' : 'Pending'}
        </Badge>
      ),
    },
    {
      label: 'Action', key: 'id',
      render: (_, row: any) => (
        <div className="flex gap-2">
          {row.admin_status !== 1 && (
            <Button
              variant="success"
              size="sm"
              disabled={updating}
              onClick={() => updateStatus({ id: row.id, status: 1 })}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Approve
            </Button>
          )}
          {row.admin_status !== 2 && (
            <Button
              variant="danger"
              size="sm"
              disabled={updating}
              onClick={() => updateStatus({ id: row.id, status: 2 })}
            >
              <XCircle className="w-3.5 h-3.5" /> Reject
            </Button>
          )}
        </div>
      ),
    },
  ]

  const tabLabels = [
    { label: 'Pending', count: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
    { label: 'Approved', count: approvedCount, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle },
    { label: 'Rejected', count: rejectedCount, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Trip Approvals" subtitle="Review pending trips and approve or reject them" />

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {tabLabels.map((s) => (
          <GlassCard
            key={s.label}
            className={`p-5 cursor-pointer transition-all ${s.bg} ${tab === s.label ? 'ring-2 ring-offset-1 ring-current' : 'opacity-80 hover:opacity-100'}`}
            onClick={() => setTab(s.label)}
          >
            <div className="flex items-center justify-between">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className={`text-3xl font-extrabold ${s.color}`}>{s.count}</span>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-2">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Date filter */}
      <GlassCard className="p-4" colorBar="bg-gradient-to-r from-slate-400 to-slate-500">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label>From Date</Label>
            <Input type="date" max={today} value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-36" />
          </div>
          <div>
            <Label>To Date</Label>
            <Input type="date" max={today} value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-36" />
          </div>
          <Button onClick={() => setApplied({ from: fromDate, to: toDate })}>
            <Search className="w-4 h-4" /> Apply Filter
          </Button>
          <button
            onClick={() => { setFromDate(''); setToDate(''); setApplied({ from: '', to: '' }) }}
            className="text-xs text-slate-500 hover:text-red-500 font-medium underline"
          >
            Clear
          </button>
        </div>
      </GlassCard>

      {/* Tabs */}
      <TopNavTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {/* Table */}
      <DataTable
        title={`${tab} Trips (${filtered.length})`}
        columns={buildCols()}
        data={filtered}
        loading={isLoading}
        onAction={(action, row) => { if (action === 'view') setViewTrip(row) }}
        actions={['view']}
        icon={
          tab === 'Pending' ? <Clock className="w-5 h-5 text-amber-500" />
          : tab === 'Approved' ? <CheckCircle className="w-5 h-5 text-emerald-500" />
          : <XCircle className="w-5 h-5 text-red-500" />
        }
      />

      {/* View modal */}
      <AnimatePresence>
        {viewTrip && <TripViewModal trip={viewTrip} onClose={() => setViewTrip(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}
