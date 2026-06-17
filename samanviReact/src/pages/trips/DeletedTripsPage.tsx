import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { GlassCard, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { tripsService } from '@/services/trips.service'

const cols: Column[] = [
  { label: 'Trip No / Date', key: 'c_number', render: (v, r: any) => <div><div className="font-bold text-red-600">{String(v ?? r.id)}</div><div className="text-xs text-slate-500">{r.trip_date ?? r.i_ts}</div></div> },
  { label: 'Bus', key: 'bus_no' },
  { label: 'Route', key: 'service_no', render: (v, r: any) => <div><div className="font-medium">{String(v ?? '—')}</div><div className="text-xs text-slate-500">{r.trip_for}</div></div> },
  { label: 'Driver', key: 'driver1_name' },
  { label: 'Deleted By', key: 'deleted_by' },
  { label: 'Deleted At', key: 'deleted_at' },
  { label: 'Status', key: 'd_in', render: () => <Badge variant="danger">Deleted</Badge> },
]

export default function DeletedTripsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['deleted-trips'],
    queryFn: () => tripsService.getTripDeletedModal({}),
  })

  const list: any[] = data?.data ?? []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Deleted Trips" subtitle="Audit log of all soft-deleted trip records" />
      <GlassCard className="p-5 bg-red-50/30" colorBar="bg-gradient-to-r from-red-400 to-rose-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-500" /></div>
          <div>
            <h3 className="font-bold text-slate-900">Deleted Trip Records</h3>
            <p className="text-xs text-slate-500">These records have been removed. Contact admin for restoration.</p>
          </div>
          <div className="ml-auto"><Badge variant="danger">{list.length} records</Badge></div>
        </div>
      </GlassCard>
      <DataTable title="Deleted Trips Log" columns={cols} data={list} loading={isLoading} onAction={() => {}} actions={['view']} />
    </motion.div>
  )
}
