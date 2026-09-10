import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { HelpCircle, Save, CheckCircle, AlertCircle, Clock, XCircle } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { helpdeskService } from '@/services/helpdesk.service'

const MODULES = ['Dashboard', 'Trip Management', 'Fuel', 'Laundry', 'Accounting', 'Payroll', 'Garage', 'Masters', 'Reports', 'Other']
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  Open: 'warning', 'In Progress': 'info', Resolved: 'success', Closed: 'success', Rejected: 'danger',
}

const cols: Column[] = [
  { label: '#', key: 'id', render: (v) => <span className="font-bold text-slate-500">#{v}</span> },
  {
    label: 'Issue', key: 'issue_description',
    render: (v, r: any) => (
      <div>
        <div className="font-bold text-slate-900">{String(v).slice(0, 60)}{String(v).length > 60 ? '…' : ''}</div>
        <div className="text-xs text-slate-500">{r.module_name} → {r.sub_module}</div>
      </div>
    ),
  },
  { label: 'Priority', key: 'priority', render: (v) => <Badge variant={v === 'Critical' || v === 'High' ? 'danger' : v === 'Medium' ? 'warning' : 'default'}>{String(v)}</Badge> },
  { label: 'Raised By', key: 'user_name' },
  { label: 'Date', key: 'i_ts', render: (v) => <span className="text-xs text-slate-600">{String(v).slice(0, 16)}</span> },
  { label: 'Resolved By', key: 'resloved_by', render: (v) => v ? <span className="text-xs font-medium text-emerald-600">{String(v)}</span> : <span className="text-slate-400">—</span> },
  {
    label: 'Status', key: 'status',
    render: (v) => <Badge variant={STATUS_COLORS[String(v)] ?? 'default'}>{String(v)}</Badge>,
  },
]

interface ResolveModal { id: number; issue: string }

export default function HelpDeskPage() {
  const qc = useQueryClient()
  const userId = localStorage.getItem('user_id') ?? '1'
  const usrNm = localStorage.getItem('usr_nm') ?? 'Admin'
  const [statusFilter, setStatusFilter] = useState('all')
  const [resolveModal, setResolveModal] = useState<ResolveModal | null>(null)
  const [resolveForm, setResolveForm] = useState({ status: 'Resolved', solved_by: usrNm, remarks: '' })

  const [form, setForm] = useState({
    module: '', submodule: '', priority: 'Medium', issue: '',
    user_id: userId, usr_nm: usrNm,
  })

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['helpdesk-tickets', userId],
    queryFn: () => helpdeskService.getTickets({ user_id: userId }),
  })

  const { data: counts } = useQuery({
    queryKey: ['helpdesk-counts'],
    queryFn: () => helpdeskService.getCount({ user_id: userId }),
  })

  const { mutate: submit, isPending: submitting } = useMutation({
    mutationFn: () => helpdeskService.submitTicket(form),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Ticket raised successfully!')
        qc.invalidateQueries({ queryKey: ['helpdesk-tickets'] })
        qc.invalidateQueries({ queryKey: ['helpdesk-counts'] })
        setForm({ module: '', submodule: '', priority: 'Medium', issue: '', user_id: userId, usr_nm: usrNm })
      } else toast.error('Failed to raise ticket')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: resolve, isPending: resolving } = useMutation({
    mutationFn: () => helpdeskService.resolveTicket({ ...resolveForm, id: resolveModal?.id }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Ticket updated!')
        qc.invalidateQueries({ queryKey: ['helpdesk-tickets'] })
        qc.invalidateQueries({ queryKey: ['helpdesk-counts'] })
        setResolveModal(null)
      } else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm({ ...form, [k]: e.target.value })

  const allTickets: any[] = tickets?.data ?? []
  const countsData: any = counts?.data ?? {}

  const filtered = statusFilter === 'all' ? allTickets
    : allTickets.filter((t) => {
      if (statusFilter === 'open') return t.status === 'Open' || t.status === 'In Progress'
      if (statusFilter === 'closed') return t.status === 'Resolved' || t.status === 'Closed'
      return true
    })

  const handleAction = (action: string, row: any) => {
    if (action === 'edit') setResolveModal({ id: row.id, issue: row.issue_description })
  }

  const statCards = [
    { label: 'Total', value: countsData.total ?? allTickets.length, icon: HelpCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Open', value: countsData.open ?? allTickets.filter((t) => t.status === 'Open').length, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'In Progress', value: countsData.in_progress ?? allTickets.filter((t) => t.status === 'In Progress').length, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Resolved', value: countsData.resolved ?? allTickets.filter((t) => t.status === 'Resolved').length, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Help Desk" subtitle="Raise and track support tickets" />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <GlassCard key={s.label} className={`p-5 ${s.bg}`}>
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className={`text-3xl font-extrabold ${s.color}`}>{s.value}</span>
            </div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {/* Raise Ticket */}
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-violet-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-500" /> Raise New Ticket
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div>
            <Label>Module *</Label>
            <Select value={form.module} onChange={f('module')}>
              <option value="">Select Module</option>
              {MODULES.map((m) => <option key={m}>{m}</option>)}
            </Select>
          </div>
          <div>
            <Label>Sub Module</Label>
            <Input placeholder="e.g. Fuel Entry" value={form.submodule} onChange={f('submodule')} />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={form.priority} onChange={f('priority')}>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </div>
          <div className="md:col-span-4">
            <Label>Issue Description *</Label>
            <textarea
              rows={3}
              placeholder="Describe the issue in detail..."
              value={form.issue}
              onChange={f('issue')}
              className="flex w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:border-[#2563EB] focus-visible:bg-white transition-all shadow-sm resize-none"
            />
          </div>
        </div>
        {/* Submit sits under the fields, as on every other form. */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
          <Button onClick={() => submit()} disabled={submitting || !form.module || !form.issue}>
          <Save className="w-4 h-4" />{submitting ? 'Submitting…' : 'Submit Ticket'}
          </Button>
        </div>
      </GlassCard>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {['all', 'open', 'closed'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${statusFilter === s ? 'bg-white shadow-sm text-blue-600 border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'}`}
          >
            {s === 'all' ? 'All Tickets' : s === 'open' ? 'Open / In Progress' : 'Resolved / Closed'}
          </button>
        ))}
      </div>

      <DataTable
        title="Support Tickets"
        columns={cols}
        data={filtered}
        loading={isLoading}
        onAction={handleAction}
        actions={['view', 'edit']}
      />

      {/* Resolve Modal */}
      <AnimatePresence>
        {resolveModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white p-6 rounded-3xl max-w-md w-full shadow-2xl mx-4"
            >
              <h3 className="text-xl font-bold text-slate-900 mb-1">Update Ticket #{resolveModal.id}</h3>
              <p className="text-sm text-slate-500 mb-6 line-clamp-2">{resolveModal.issue}</p>
              <div className="space-y-4">
                <div>
                  <Label>New Status</Label>
                  <Select value={resolveForm.status} onChange={(e) => setResolveForm({ ...resolveForm, status: e.target.value })}>
                    <option>In Progress</option>
                    <option>Resolved</option>
                    <option>Closed</option>
                    <option>Rejected</option>
                  </Select>
                </div>
                <div>
                  <Label>Resolved / Handled By</Label>
                  <Input value={resolveForm.solved_by} onChange={(e) => setResolveForm({ ...resolveForm, solved_by: e.target.value })} />
                </div>
                <div>
                  <Label>Remarks</Label>
                  <Input placeholder="Resolution notes..." value={resolveForm.remarks} onChange={(e) => setResolveForm({ ...resolveForm, remarks: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setResolveModal(null)}>Cancel</Button>
                <Button onClick={() => resolve()} disabled={resolving}>
                  <CheckCircle className="w-4 h-4" />{resolving ? 'Saving…' : 'Update Ticket'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
