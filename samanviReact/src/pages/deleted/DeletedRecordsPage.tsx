import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { Trash2, X } from 'lucide-react'
import { GlassCard, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { deletedService } from '@/services/deleted.service'
import api from '@/lib/api'
import { ActivityTimeline } from '@/components/shared/ReferenceAuditModal'
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

const HIDDEN = new Set(['password', 'd_in', '_sl', 'source_label', 'encryptedPayload', 'signature'])
const label = (k: string) => k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, (c) => c.toUpperCase())
const show = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  const t = String(v)
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t) ? formatDateTime(t) : t
}

// Every field of one deleted record, from the copy saved when it was deleted.
function DeletedDetails({ row, onClose }: { row: DeletedRow; onClose: () => void }) {
  // The record's whole life: created, edited, authorized, approved... then deleted.
  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ['reference-audit', row.reference],
    queryFn: async () => {
      const { data } = await api.post('/getreferenceaudit', { c_number: row.reference })
      return data?.status === 200 ? data.data : null
    },
    enabled: !!row.reference, staleTime: 0,
  })
  const steps = [
    ...((audit?.steps ?? []) as any[]),
    { label: 'Deleted', who: row.deleted_by_name, when: row.deleted_at, state: 'done' },
  ]
  let parsed: any = {}
  try { parsed = row.snapshot ? JSON.parse(row.snapshot) : {} } catch { parsed = {} }
  const record = parsed?.record && typeof parsed.record === 'object' ? parsed.record
    : parsed?.request && typeof parsed.request === 'object' ? parsed.request : null
  const fields = record ? Object.entries(record).filter(([k]) => !HIDDEN.has(k)) : []
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Deleted {row.module} record — <span className="text-red-600">{row.reference || '—'}</span></h3>
            {row.page && <p className="text-xs text-slate-500">Deleted from {row.page}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 sm:col-span-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-500">Reason</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{row.reason || (row.source === 'legacy' ? 'Deleted before reasons were recorded' : 'No reason given')}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Module</p><p className="text-sm font-semibold">{row.module}</p></div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Deleted By</p><p className="text-sm font-semibold">{row.deleted_by_name || '—'}</p></div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Deleted At</p><p className="text-sm font-semibold">{formatDateTime(row.deleted_at)}</p></div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2">Complete history</h4>
            {auditLoading ? <p className="text-sm text-slate-500">Loading history…</p> : <ActivityTimeline steps={steps} />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2">Record details</h4>
            {fields.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3">
                {fields.map(([k, v]) => (
                  <div key={k} className="border-b border-slate-100 pb-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label(k)}</p>
                    <p className="text-sm text-slate-800 break-words">{show(v)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{parsed?.details || parsed?.subject || 'No copy of this record was saved.'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DeletedRecordsPage() {
  const [selected, setSelected] = useState<DeletedRow | null>(null)
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
        <button type="button" onClick={() => setSelected(r)} title="Show all details"
          className="font-bold text-red-600 hover:underline text-left">{String(v || '—')}</button>
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
      {selected && <DeletedDetails row={selected} onClose={() => setSelected(null)} />}
    </motion.div>
  )
}
