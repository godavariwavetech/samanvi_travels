import { useState } from 'react'
import { motion } from 'motion/react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, RepeatIcon, AlertCircle, CalendarDays, Clock, Zap, BellRing } from 'lucide-react'
import { toast } from 'sonner'
import { GlassCard, PageHeader, DataTable } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'

function fmtDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(-2)}`
}

function stateLabel(state: string) {
  const s = (state || 'OPEN').toUpperCase()
  if (s === 'CLOSED' || s === 'COMPLETED') return 'Completed'
  if (s === 'FINISHED') return 'Finished'
  if (s === 'APPROVED') return 'Approved'
  if (s === 'REJECTED') return 'Rejected'
  return 'Open'
}

function stateBadge(label: string) {
  if (label === 'Completed') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Completed</span>
  if (label === 'Finished') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Finished</span>
  if (label === 'Approved') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700">Approved</span>
  if (label === 'Rejected') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">Rejected</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Open</span>
}

function dueBadge(days: any) {
  if (days === null || days === undefined || days === '') return <span className="text-xs text-slate-400">No date set</span>
  const n = Number(days)
  if (isNaN(n)) return <span className="text-xs text-slate-400">—</span>
  if (n < 0)  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{Math.abs(n)}d overdue</span>
  if (n === 0) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Due today</span>
  if (n <= 7)  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">In {n}d</span>
  if (n <= 30) return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">In {n}d</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">In {n}d</span>
}

export default function RepeatJobsPage() {
  const qc = useQueryClient()
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['repeat-jobs'],
    queryFn: () => garageService.getRepeatJobs(),
  })

  const { mutate: triggerGenerate, isPending: isGenerating } = useMutation({
    mutationFn: () => garageService.triggerRepeatJobs(),
    onSuccess: (res: any) => {
      if (res.status === 200) {
        const count = res.data?.created ?? 0
        if (count > 0) {
          toast.success(`${count} new reminder${count !== 1 ? 's' : ''} created in Service Reminders.`)
          qc.invalidateQueries({ queryKey: ['repeat-jobs'] })
          qc.invalidateQueries({ queryKey: ['service-reminders'] })
        } else {
          toast.info('No new reminders to generate right now (all due jobs already have a reminder, or none are due within 2 days).')
        }
      } else {
        toast.error('Failed to generate jobs.')
      }
    },
    onError: () => toast.error('Server error'),
  })

  const list: any[] = data?.data ?? []
  const displayList = list.map((r) => ({ ...r, display_state: stateLabel(r.state) }))

  const overdue   = list.filter(r => r.next_job_date && Number(r.days_until) < 0).length
  const dueToday  = list.filter(r => r.next_job_date && Number(r.days_until) === 0).length
  const dueWeek   = list.filter(r => r.next_job_date && Number(r.days_until) > 0 && Number(r.days_until) <= 7).length
  const noDate    = list.filter(r => !r.next_job_date).length

  const stats = [
    { label: 'Total Repeat Jobs', value: list.length,    color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100',   icon: <RepeatIcon className="w-5 h-5" /> },
    { label: 'Overdue',           value: overdue,         color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100',    icon: <AlertCircle className="w-5 h-5" /> },
    { label: 'Due This Week',     value: dueToday + dueWeek, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: <Clock className="w-5 h-5" /> },
    { label: 'No Date Set',       value: noDate,          color: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200',  icon: <CalendarDays className="w-5 h-5" /> },
  ]

  const cols: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-xs text-slate-500">{i + 1}</span> },
    { label: 'Job Card', key: 'job_card_number', filterable: true, render: (v) => (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold">
          <RepeatIcon className="w-2.5 h-2.5" /> REPEAT
        </span>
        <span className="font-semibold text-blue-700 text-xs">{String(v)}</span>
      </div>
    ) },
    { label: 'Vehicle', key: 'vehicle_number', filterable: true, render: (v) => <span className="font-medium text-slate-700 text-xs">{String(v ?? '—')}</span> },
    { label: 'Category', key: 'all_categories', filterable: true, render: (_v, row: any) => <span className="text-slate-600 text-xs">{row.all_categories || row.repair_category_name || '—'}</span> },
    { label: 'Driver', key: 'driver_name', filterable: true, render: (v) => <span className="text-slate-600 text-xs">{String(v ?? '—')}</span> },
    { label: 'Technician', key: 'staff_name', filterable: true, render: (v) => <span className="text-slate-600 text-xs">{String(v ?? '—')}</span> },
    { label: 'Status', key: 'display_state', filterable: true, render: (v) => stateBadge(String(v)) },
    { label: 'Amount (₹)', key: 'total_amount', align: 'right', render: (v) => (
      Number(v) > 0 ? <span className="text-xs font-bold text-slate-800">₹{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span> : <span className="text-slate-400 text-xs">—</span>
    ) },
    { label: 'Job Date', key: 'job_date', align: 'center', render: (_v, row: any) => <span className="text-slate-500 text-xs">{fmtDate(row.job_date || row.created_at)}</span> },
    { label: 'Next Service Date', key: 'next_job_date', align: 'center', render: (v, row: any) => (
      v ? <span className={`text-xs font-semibold ${Number(row.days_until) < 0 ? 'text-red-700' : 'text-slate-700'}`}>{fmtDate(v)}</span> : <span className="text-slate-400 text-xs">—</span>
    ) },
    { label: 'Due In', key: 'days_until', align: 'center', render: (_v, row: any) => dueBadge(row.next_job_date ? row.days_until : null) },
    { label: 'Reminder', key: 'generated_reminder_ref', filterable: true, render: (v, row: any) => (
      v
        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs"><BellRing className="w-3 h-3" /> {String(v)}</span>
        : (row.next_job_date && Number(row.days_until) <= 2 && Number(row.days_until) >= 0)
          ? <span className="text-amber-600 font-semibold text-xs">Pending…</span>
          : <span className="text-slate-400 text-xs">—</span>
    ) },
    { label: 'Generated Job', key: 'generated_job_number', filterable: true, render: (v) => (
      v
        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs"><Zap className="w-3 h-3" /> {String(v)}</span>
        : <span className="text-slate-400 text-xs">—</span>
    ) },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <PageHeader title="Repeat Job Cards" subtitle="All job cards marked as repeat — a Service Reminder is auto-created 1-2 days before the next service date; convert it to a job card from Service Reminders" />
        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerGenerate()}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
          >
            <Zap className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} />
            {isGenerating ? 'Generating…' : 'Generate Now'}
          </button>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <GlassCard key={s.label} className={`${s.bg} border ${s.border} flex items-center gap-3 p-4`}>
            <div className={s.color}>{s.icon}</div>
            <div>
              <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 font-medium">{s.label}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      <DataTable
        title="All Repeat Jobs"
        columns={cols}
        data={displayList}
        loading={isLoading}
        icon={<RepeatIcon className="w-5 h-5 text-blue-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
        className="border-2 border-slate-200"
      />
    </motion.div>
  )
}
