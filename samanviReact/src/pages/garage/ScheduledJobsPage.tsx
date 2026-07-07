import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Clock, Wrench, CalendarDays, BellRing } from 'lucide-react'
import { GlassCard, PageHeader, DataTable } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'

function fmtDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`
}

function daysBadge(days: number | null) {
  if (days === null || isNaN(Number(days))) return <span className="text-slate-400 text-xs">—</span>
  const n = Number(days)
  if (n < 0)
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">{Math.abs(n)}d overdue</span>
  if (n === 0)
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">Due today</span>
  if (n <= 7)
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">In {n}d</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">In {n}d</span>
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

export default function ScheduledJobsPage() {
  const [upcomingFilters, setUpcomingFilters] = useState<Record<string, string[]>>({})
  const [autoFilters, setAutoFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['scheduled-jobs'],
    queryFn: () => garageService.getScheduledJobs(),
  })

  const list: any[] = data?.data ?? []

  const { upcoming, autojobs } = useMemo(() => ({
    upcoming: list.filter(r => r.insertion_type !== 'Automatic' && r.next_job_date).map(r => ({ ...r, display_state: stateLabel(r.state) })),
    autojobs: list.filter(r => r.insertion_type === 'Automatic').map(r => ({ ...r, display_state: stateLabel(r.state) })),
  }), [list])

  const upcomingCols: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-slate-500">{i + 1}</span> },
    { label: 'Job Card', key: 'job_card_number', filterable: true, render: (v) => (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-orange-100 text-orange-600 text-[10px] font-bold">
          <Wrench className="w-2.5 h-2.5" /> JOB
        </span>
        <span className="font-semibold text-blue-700">{String(v)}</span>
      </div>
    ) },
    { label: 'Vehicle', key: 'vehicle_number', filterable: true, render: (v) => <span className="text-slate-700">{String(v ?? '—')}</span> },
    { label: 'Category', key: 'all_categories', filterable: true, render: (_v, row: any) => <span className="text-slate-700">{row.all_categories || row.repair_category_name || '—'}</span> },
    { label: 'Assigned To', key: 'staff_name', filterable: true, render: (v) => <span className="text-slate-600">{String(v ?? '—')}</span> },
    { label: 'Job Status', key: 'display_state', filterable: true, render: (v) => stateBadge(String(v)) },
    { label: 'Next Service Date', key: 'next_job_date', align: 'center', render: (v) => <span className="text-slate-700 font-medium">{fmtDate(v)}</span> },
    { label: 'Days Until', key: 'days_until', align: 'center', render: (v) => daysBadge(v) },
    { label: 'Reminder', key: 'generated_reminder_ref', filterable: true, render: (v) => (
      v ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs"><BellRing className="w-3 h-3" /> {String(v)}</span>
        : <span className="text-slate-400 text-xs">—</span>
    ) },
  ]

  const autoCols: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-slate-500">{i + 1}</span> },
    { label: 'Job Card', key: 'job_card_number', filterable: true, render: (v) => (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">
          <RefreshCw className="w-2.5 h-2.5" /> AUTO
        </span>
        <span className="font-semibold text-violet-700">{String(v)}</span>
      </div>
    ) },
    { label: 'Parent Job Card', key: 'parent_job_card_number', filterable: true, render: (v) => (
      v ? <span className="font-mono text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{String(v)}</span> : <span className="text-slate-400">—</span>
    ) },
    { label: 'Vehicle', key: 'vehicle_number', filterable: true, render: (v) => <span className="text-slate-700">{String(v ?? '—')}</span> },
    { label: 'Category', key: 'all_categories', filterable: true, render: (_v, row: any) => <span className="text-slate-700">{row.all_categories || row.repair_category_name || '—'}</span> },
    { label: 'Assigned To', key: 'staff_name', filterable: true, render: (v) => <span className="text-slate-600">{String(v ?? '—')}</span> },
    { label: 'Status', key: 'display_state', filterable: true, render: (v) => stateBadge(String(v)) },
    { label: 'Created Date', key: 'job_date', align: 'center', render: (_v, row: any) => <span className="text-slate-600">{fmtDate(row.job_date || row.created_at)}</span> },
    { label: 'Next Service', key: 'next_job_date', align: 'center', render: (v, row: any) => v ? daysBadge(row.days_until) : <span className="text-slate-400 text-xs">—</span> },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Scheduled Jobs" subtitle="Upcoming repeated services and auto-created job cards" />
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Upcoming Services', value: upcoming.length, icon: <CalendarDays className="w-5 h-5" />, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: 'Auto-Created Jobs', value: autojobs.length, icon: <RefreshCw className="w-5 h-5" />, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
          { label: 'Overdue',           value: list.filter(r => Number(r.days_until) < 0).length, icon: <Clock className="w-5 h-5" />, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
        ].map(c => (
          <GlassCard key={c.label} className={`${c.bg} border ${c.border} flex items-center gap-4 p-4`}>
            <div className={`${c.color}`}>{c.icon}</div>
            <div>
              <div className={`text-2xl font-extrabold ${c.color}`}>{c.value}</div>
              <div className="text-xs text-slate-500 font-medium">{c.label}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      <DataTable
        title="Upcoming Scheduled Services"
        columns={upcomingCols}
        data={upcoming}
        loading={isLoading}
        icon={<CalendarDays className="w-5 h-5 text-blue-500" />}
        columnFilters={upcomingFilters}
        onColumnFilterChange={(k, v) => setUpcomingFilters((prev) => ({ ...prev, [k]: v }))}
        className="border-2 border-slate-200"
      />

      <DataTable
        title="Auto-Created Jobs"
        columns={autoCols}
        data={autojobs}
        loading={isLoading}
        icon={<RefreshCw className="w-5 h-5 text-violet-500" />}
        columnFilters={autoFilters}
        onColumnFilterChange={(k, v) => setAutoFilters((prev) => ({ ...prev, [k]: v }))}
        className="border-2 border-slate-200"
      />
    </motion.div>
  )
}
