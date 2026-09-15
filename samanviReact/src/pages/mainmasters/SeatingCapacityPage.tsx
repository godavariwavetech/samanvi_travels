import { useState } from 'react'
import { motion } from 'motion/react'
import { Armchair, Plus, X, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader, ExportMenu } from '@/components/shared'
import { exportRows } from '@/lib/tableExport'
import { mastersService } from '@/services/masters.service'

export default function SeatingCapacityPage() {
  const qc = useQueryClient()
  const [newCapacity, setNewCapacity] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['seating-capacities'],
    queryFn: () => mastersService.getSeatingCapacities(),
  })

  const capacities: any[] = data?.data ?? []

  const isDuplicate = (value: string) =>
    capacities.some((c: any) => String(c.capacity ?? '').trim().toLowerCase() === value.trim().toLowerCase())
  const handleAdd = () => {
    const trimmed = newCapacity.trim()
    if (!trimmed) return
    if (isDuplicate(trimmed)) { toast.error(`Seating capacity "${trimmed}" already exists`); return }
    add()
  }

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: () => mastersService.addSeatingCapacity({ capacity: newCapacity.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Seating capacity added!')
        setNewCapacity('')
        qc.invalidateQueries({ queryKey: ['seating-capacities'] })
      } else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mastersService.deleteSeatingCapacity({ id }),
    onSuccess: () => {
      toast.success('Seating capacity removed')
      qc.invalidateQueries({ queryKey: ['seating-capacities'] })
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Seating Capacity Master" subtitle="Manage predefined seating capacities used across the bus fleet" />

      {/* Add new capacity */}
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Armchair className="w-4 h-4 text-blue-500" /> Add Seating Capacity
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-sm">
            <Label>Seating Capacity <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              placeholder="e.g. 32, 40, 52…"
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} disabled={adding || !newCapacity.trim()}>
            <Plus className="w-4 h-4" /> Add Capacity
          </Button>
        </div>
      </GlassCard>

      {/* Existing capacities */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-700">
            Current Seating Capacities ({capacities.length})
          </h3>
          <ExportMenu
            disabled={capacities.length === 0}
            onExport={(format) => exportRows({ title: 'Seating Capacities', headers: ['Sl No', 'Seating Capacity'], rows: capacities.map((c, i) => [i + 1, `${c.capacity} Seater`]), format })}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : capacities.length === 0 ? (
          <p className="text-sm text-slate-400">No seating capacities yet. Add one above.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {capacities.map((c) => (
              <div key={c.id}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 group hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <Armchair className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 truncate">{c.capacity} Seater</span>
                </div>
                <button
                  onClick={() => del(c.id)}
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
