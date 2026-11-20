import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DatabaseBackup, Download, Loader2 } from 'lucide-react'
import { GlassCard, DataTable, Badge, PageHeader, Button } from '@/components/shared'
import type { Column } from '@/components/shared'
import { backupService, type DbBackup } from '@/services/backup.service'
import { useCanReviseApproved } from '@/lib/approvedEditors'
import { formatDateTime } from '@/lib/utils'

// Database backups saved on the server: every day at 6:00 AM (Morning) and
// 11:30 PM (End of Day) IST, plus any taken here with "Backup now". Each file
// is a gzipped SQL dump of the whole database; Super Admins only.

const KIND_LABEL: Record<DbBackup['kind'], string> = { morning: 'Morning', evening: 'End of Day', manual: 'Manual' }
const KIND_VARIANT: Record<DbBackup['kind'], 'info' | 'warning' | 'slate'> = { morning: 'info', evening: 'warning', manual: 'slate' }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export default function DbBackupsPage() {
  const allowed = useCanReviseApproved()
  const qc = useQueryClient()
  const [downloading, setDownloading] = useState<string | null>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['db-backups'],
    queryFn: () => backupService.list(),
    enabled: allowed,
    staleTime: 0,
  })
  const rows: (DbBackup & { kind_label: string })[] = (data?.status === 200 ? data.data : [])
    .map((r: DbBackup) => ({ ...r, kind_label: KIND_LABEL[r.kind] }))
  const retention = data?.retention_days ?? 30

  const run = useMutation({
    mutationFn: () => backupService.runNow(),
    onSuccess: (res) => {
      if (res?.status !== 200) return toast.error(res?.msg ?? 'Backup failed')
      toast.success(`Backup saved: ${res.data.name} (${formatSize(res.data.size)})`)
      qc.invalidateQueries({ queryKey: ['db-backups'] })
    },
    onError: () => toast.error('Backup failed'),
  })

  const download = async (name: string) => {
    setDownloading(name)
    try { await backupService.download(name) } catch { toast.error('Could not download the backup') }
    finally { setDownloading(null) }
  }

  const columns: Column[] = useMemo(() => [
    { label: 'Sl No', key: '_sl', align: 'center', render: (_v, _r, i) => i + 1 },
    { label: 'Taken At', key: 'created_at', render: (v) => formatDateTime(v as string) },
    { label: 'Type', key: 'kind_label', filterable: true, filterType: 'select',
      filterOptions: Object.values(KIND_LABEL).map((v) => ({ label: v, value: v })),
      render: (v, r: any) => <Badge variant={KIND_VARIANT[r.kind as DbBackup['kind']]}>{String(v)}</Badge> },
    { label: 'File', key: 'name', render: (v) => <span className="font-mono text-xs text-slate-700">{String(v)}</span> },
    { label: 'Size', key: 'size', align: 'right', render: (v) => formatSize(Number(v)) },
    { label: 'Download', key: '_dl', align: 'center', render: (_v, r: any) => (
      <button type="button" onClick={() => download(r.name)} disabled={downloading === r.name} title="Download this backup"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-50">
        {downloading === r.name ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Download
      </button>
    ) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [downloading])

  if (!allowed) {
    return (
      <div className="space-y-6">
        <PageHeader title="DB Backups" subtitle="Daily database backups" />
        <GlassCard className="p-6"><p className="text-sm text-slate-600">Only a Super Admin can view and download database backups.</p></GlassCard>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="DB Backups" subtitle="Full database backups, taken every day at 6:00 AM and 11:30 PM (IST)" />
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-blue-500 to-indigo-500">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><DatabaseBackup className="w-5 h-5 text-blue-600" /></div>
          <div>
            <h3 className="font-bold text-slate-900">Automatic backups</h3>
            <p className="text-xs text-slate-500">
              Morning at 6:00 AM and End of Day at 11:30 PM. Backups older than {retention} days are removed. Download them regularly
              so a copy is kept off the server too.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="info">{rows.length} backups</Badge>
            <Button onClick={() => run.mutate()} disabled={run.isPending}>
              {run.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Backing up…</> : <><DatabaseBackup className="w-4 h-4 mr-2" />Backup now</>}
            </Button>
          </div>
        </div>
      </GlassCard>
      <DataTable title="DB Backups" columns={columns} data={rows as any[]} loading={isLoading}
        actions={[]} onAction={() => {}}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))} />
    </motion.div>
  )
}
