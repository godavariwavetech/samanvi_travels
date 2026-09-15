import { useState } from 'react'
import { motion } from 'motion/react'
import { CalendarDays, Plus, X, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader, ExportMenu } from '@/components/shared'
import { exportRows } from '@/lib/tableExport'
import { mastersService } from '@/services/masters.service'

export default function MfgYearPage() {
  const qc = useQueryClient()
  const [newYear, setNewYear] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['mfg-years'],
    queryFn: () => mastersService.getMfgYears(),
  })

  const years: any[] = data?.data ?? []

  const isDuplicate = (value: string) =>
    years.some((y: any) => String(y.year_value ?? '').trim().toLowerCase() === value.trim().toLowerCase())
  const handleAdd = () => {
    const trimmed = newYear.trim()
    if (!trimmed) return
    if (isDuplicate(trimmed)) { toast.error(`Mfg year "${trimmed}" already exists`); return }
    add()
  }

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: () => mastersService.addMfgYear({ year_value: newYear.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Mfg year added!')
        setNewYear('')
        qc.invalidateQueries({ queryKey: ['mfg-years'] })
      } else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mastersService.deleteMfgYear({ id }),
    onSuccess: () => {
      toast.success('Mfg year removed')
      qc.invalidateQueries({ queryKey: ['mfg-years'] })
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Mfg Year Master" subtitle="Manage manufacturing years used in the bus fleet" />

      {/* Add new year */}
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
          <CalendarDays className="w-4 h-4 text-blue-500" /> Add Mfg Year
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-sm">
            <Label>Year <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              placeholder="e.g. 2022, 2023, 2024…"
              value={newYear}
              onChange={(e) => setNewYear(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} disabled={adding || !newYear.trim()}>
            <Plus className="w-4 h-4" /> Add Year
          </Button>
        </div>
      </GlassCard>

      {/* Existing years */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-700">
            Current Mfg Years ({years.length})
          </h3>
          <ExportMenu
            disabled={years.length === 0}
            onExport={(format) => exportRows({ title: 'Mfg Years', headers: ['Sl No', 'Year'], rows: years.map((y, i) => [i + 1, y.year_value ?? '']), format })}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : years.length === 0 ? (
          <p className="text-sm text-slate-400">No mfg years yet. Add one above.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {years.map((y) => (
              <div key={y.id}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 group hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <CalendarDays className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 truncate">{y.year_value}</span>
                </div>
                <button
                  onClick={() => del(y.id)}
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
