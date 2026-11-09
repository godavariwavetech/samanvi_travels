import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { GlassCard, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { deletedService } from '@/services/deleted.service'
import { formatDateTime } from '@/lib/utils'

// Everything deleted anywhere in the app, in one list: what it was, why it was
// deleted, who deleted it and when. Rows from before the log existed come from
// the records' own soft-delete marks and carry no reason.

type DeletedRow = {
  id: number | null
  module: string
  page: string
  reference: string
  reason: string
  snapshot: string
  deleted_by_name: string | null
  deleted_at: string | null
  source: 'log' | 'legacy'
}

const SKIP = new Set(['id', 'd_in', 'user_id', 'password', '_sl', 'source_label'])

// A short line describing the deleted record, from what was saved with it.
function describe(snapshot: string): { line: string; full: string } {
  if (!snapshot) return { line: '', full: '' }
  let parsed: any
  try { parsed = JSON.parse(snapshot) } catch { return { line: snapshot.slice(0, 120), full: snapshot } }
  if (parsed?.details) return { line: String(parsed.details), full: '' }
  const record = parsed?.record && typeof parsed.record === 'object' ? parsed.record
    : parsed?.request && typeof parsed.request === 'object' ? parsed.request : null
  const parts: string[] = []
  if (record) {
    for (const [k, v] of Object.entries(record)) {
      if (SKIP.has(k) || v === null || v === undefined || typeof v === 'object') continue
      const t = String(v).trim()
      if (!t || t.length > 60) continue
      parts.push(`${k.replace(/_/g, ' ')}: ${t}`)
      if (parts.length >= 6) break
    }
  }
  const line = parts.join(' · ') || String(parsed?.subject ?? '')
  return { line, full: record ? JSON.stringify(record, null, 2) : '' }
}

export default function DeletedRecordsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['deleted-records'],
    queryFn: () => deletedService.getDeletedRecords(),
    staleTime: 0,
  })
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const rows: DeletedRow[] = data?.data ?? []

  const options = (key: keyof DeletedRow) => Array.from(new Set(rows.map((r) => String(r[key] ?? '')).filter(Boolean))).sort()
    .map((v) => ({ label: v, value: v }))

  const columns: Column[] = useMemo(() => [
    { label: 'Sl No', key: '_sl', align: 'center', render: (_v, _r, i) => i + 1 },
    { label: 'Module', key: 'module', filterable: true, filterType: 'select', filterOptions: options('module'),
      render: (v) => <Badge variant="slate">{String(v || '—')}</Badge> },
    { label: 'Reference', key: 'reference', render: (v, r: any) => (
      <div>
        <div className="font-bold text-red-600">{String(v || '—')}</div>
        {r.page && <div className="text-xs text-slate-400">{String(r.page)}</div>}
      </div>
    ) },
    { label: 'Details', key: 'snapshot', render: (v) => {
      const { line, full } = describe(String(v ?? ''))
      if (!line && !full) return <span className="text-slate-300">—</span>
      return (
        <div className="max-w-[360px]">
          <div className="text-sm text-slate-700 line-clamp-2">{line || '—'}</div>
          {full && (
            <details className="text-xs mt-1">
              <summary className="cursor-pointer text-blue-600">Full record</summary>
              <pre className="whitespace-pre-wrap break-all bg-slate-50 rounded-lg p-2 mt-1 max-h-60 overflow-auto">{full}</pre>
            </details>
          )}
        </div>
      )
    } },
    { label: 'Reason', key: 'reason', render: (v, r: any) => v
      ? <span className="text-sm text-slate-700 whitespace-pre-wrap">{String(v)}</span>
      : <span className="text-xs text-slate-400">{r.source === 'legacy' ? 'Deleted before reasons were recorded' : 'No reason given'}</span> },
    { label: 'Deleted By', key: 'deleted_by_name', filterable: true, filterType: 'select', filterOptions: options('deleted_by_name'),
      render: (v) => v ? String(v) : <span className="text-slate-300">—</span> },
    { label: 'Deleted At', key: 'deleted_at', render: (v) => formatDateTime(v as string) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [rows])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Deleted Records" subtitle="Everything deleted across all modules, with the reason, who deleted it and when" />
      <GlassCard className="p-5 bg-red-50/30" colorBar="bg-gradient-to-r from-red-400 to-rose-500">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center"><Trash2 className="w-5 h-5 text-red-500" /></div>
          <div>
            <h3 className="font-bold text-slate-900">Deleted Records</h3>
            <p className="text-xs text-slate-500">Trips, fuel, laundry, vouchers, garage, masters and every other module.</p>
          </div>
          <div className="ml-auto"><Badge variant="danger">{rows.length} records</Badge></div>
        </div>
      </GlassCard>
      <DataTable title="Deleted Records" columns={columns} data={rows as any[]} loading={isLoading}
        actions={[]} onAction={() => {}}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))} />
    </motion.div>
  )
}
