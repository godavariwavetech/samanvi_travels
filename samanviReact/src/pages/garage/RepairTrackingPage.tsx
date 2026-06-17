import { useState } from 'react'
import { motion } from 'motion/react'
import { Wrench, CheckCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'

const JOB_STATUSES = ['Open', 'In Progress', 'Waiting Parts', 'Completed', 'Cancelled']

const cols: Column[] = [
  { label: 'Job Card', key: 'job_card_no', render: (v, r: any) => <div><div className="font-bold text-blue-600">{String(v)}</div><div className="text-xs">{r.bus_no}</div></div> },
  { label: 'Category', key: 'category' },
  { label: 'Issue', key: 'description', render: (v) => <div className="text-xs max-w-xs truncate">{String(v)}</div> },
  { label: 'Technician', key: 'technician' },
  { label: 'Priority', key: 'priority', render: (v) => <Badge variant={v === 'High' ? 'danger' : v === 'Medium' ? 'warning' : 'success'}>{String(v)}</Badge> },
  { label: 'Amount', key: 'total_amount', render: (v) => <span className="font-bold">₹{v}</span> },
  { label: 'Status', key: 'status', render: (v) => (
    <Badge variant={v === 'Completed' ? 'success' : v === 'In Progress' ? 'info' : v === 'Waiting Parts' ? 'warning' : v === 'Cancelled' ? 'danger' : 'default'}>
      {String(v)}
    </Badge>
  )},
]

export default function RepairTrackingPage() {
  const qc = useQueryClient()
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [newStatus, setNewStatus] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['repair-tracking'], queryFn: () => garageService.getRepairEntries({}) })

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: () => garageService.changeJobStatus({ id: selectedJob?.id, status: newStatus, user_id: localStorage.getItem('user_id') }),
    onSuccess: (res) => { if (res.status === 200) { toast.success('Status updated!'); qc.invalidateQueries({ queryKey: ['repair-tracking'] }); setSelectedJob(null) } else toast.error('Failed') },
    onError: () => toast.error('Server error'),
  })

  const list: any[] = data?.data ?? []

  const handleAction = (action: string, row: any) => {
    if (action === 'edit') { setSelectedJob(row); setNewStatus(row.status ?? 'Open') }
  }

  const statCounts = JOB_STATUSES.map(s => ({ label: s, count: list.filter(r => r.status === s).length }))

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Repair Tracking" subtitle="Monitor and update the status of all active job cards" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCounts.map((s) => (
          <GlassCard key={s.label} className="p-4 text-center">
            <div className="text-2xl font-extrabold text-slate-900">{s.count}</div>
            <div className="text-xs font-bold text-slate-500 mt-0.5">{s.label}</div>
          </GlassCard>
        ))}
      </div>

      {selectedJob && (
        <GlassCard className="p-6" colorBar="bg-gradient-to-r from-amber-400 to-orange-500">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Wrench className="w-4 h-4 text-amber-500" /> Update Job Card: <span className="text-blue-600">{selectedJob.job_card_no}</span></h3>
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs"><Label>New Status</Label>
              <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                {JOB_STATUSES.map(s => <option key={s}>{s}</option>)}
              </Select></div>
            <Button onClick={() => updateStatus()} disabled={isPending}><CheckCircle className="w-4 h-4" />{isPending ? 'Updating…' : 'Update Status'}</Button>
            <Button variant="ghost" onClick={() => setSelectedJob(null)}>Cancel</Button>
          </div>
        </GlassCard>
      )}

      <DataTable title="Job Cards — Tracking View" columns={cols} data={list} loading={isLoading} onAction={handleAction} actions={['view', 'edit']} />
    </motion.div>
  )
}
