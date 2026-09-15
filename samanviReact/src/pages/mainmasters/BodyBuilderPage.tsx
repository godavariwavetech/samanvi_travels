import { useState } from 'react'
import { motion } from 'motion/react'
import { Hammer, Plus, X, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader, ExportMenu } from '@/components/shared'
import { exportRows } from '@/lib/tableExport'
import { mastersService } from '@/services/masters.service'

export default function BodyBuilderPage() {
  const qc = useQueryClient()
  const [newBuilder, setNewBuilder] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['body-builders'],
    queryFn: () => mastersService.getBodyBuilders(),
  })

  const builders: any[] = data?.data ?? []

  const isDuplicate = (value: string) =>
    builders.some((b: any) => String(b.builder_name ?? '').trim().toLowerCase() === value.trim().toLowerCase())
  const handleAdd = () => {
    const trimmed = newBuilder.trim()
    if (!trimmed) return
    if (isDuplicate(trimmed)) { toast.error(`Body builder "${trimmed}" already exists`); return }
    add()
  }

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: () => mastersService.addBodyBuilder({ builder_name: newBuilder.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Body builder added!')
        setNewBuilder('')
        qc.invalidateQueries({ queryKey: ['body-builders'] })
      } else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mastersService.deleteBodyBuilder({ id }),
    onSuccess: () => {
      toast.success('Body builder removed')
      qc.invalidateQueries({ queryKey: ['body-builders'] })
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Body Builder Master" subtitle="Manage body-building company names used across the bus fleet" />

      {/* Add new builder */}
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Hammer className="w-4 h-4 text-blue-500" /> Add Body Builder
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-sm">
            <Label>Builder Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. MG Veera…"
              value={newBuilder}
              onChange={(e) => setNewBuilder(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} disabled={adding || !newBuilder.trim()}>
            <Plus className="w-4 h-4" /> Add Builder
          </Button>
        </div>
      </GlassCard>

      {/* Existing builders */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-700">
            Current Body Builders ({builders.length})
          </h3>
          <ExportMenu
            disabled={builders.length === 0}
            onExport={(format) => exportRows({ title: 'Body Builders', headers: ['Sl No', 'Builder Name'], rows: builders.map((b, i) => [i + 1, b.builder_name ?? '']), format })}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : builders.length === 0 ? (
          <p className="text-sm text-slate-400">No body builders yet. Add one above.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {builders.map((b) => (
              <div key={b.id}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 group hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <Hammer className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 truncate">{b.builder_name}</span>
                </div>
                <button
                  onClick={() => del(b.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </motion.div>
  )
}
