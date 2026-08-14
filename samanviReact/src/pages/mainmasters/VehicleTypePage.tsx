import { useState } from 'react'
import { motion } from 'motion/react'
import { Bus, Plus, X, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader } from '@/components/shared'
import { mastersService } from '@/services/masters.service'

export default function VehicleTypePage() {
  const qc = useQueryClient()
  const [newType, setNewType] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-types'],
    queryFn: () => mastersService.getVehicleTypes(),
  })

  const types: any[] = data?.data ?? []

  const isDuplicate = (value: string) =>
    types.some((t: any) => String(t.type_name ?? '').trim().toLowerCase() === value.trim().toLowerCase())
  const handleAdd = () => {
    const trimmed = newType.trim()
    if (!trimmed) return
    if (isDuplicate(trimmed)) { toast.error(`Vehicle type "${trimmed}" already exists`); return }
    add()
  }

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: () => mastersService.addVehicleType({ type_name: newType.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Vehicle type added!')
        setNewType('')
        qc.invalidateQueries({ queryKey: ['vehicle-types'] })
      } else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mastersService.deleteVehicleType({ id }),
    onSuccess: () => {
      toast.success('Vehicle type removed')
      qc.invalidateQueries({ queryKey: ['vehicle-types'] })
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Vehicle Type Master" subtitle="Manage vehicle types used in the bus fleet" />

      {/* Add new type */}
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Bus className="w-4 h-4 text-blue-500" /> Add Vehicle Type
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-sm">
            <Label>Type Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. AC Sleeper, Volvo, Mini Bus…"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} disabled={adding || !newType.trim()}>
            <Plus className="w-4 h-4" /> Add Type
          </Button>
        </div>
      </GlassCard>

      {/* Existing types */}
      <GlassCard className="p-6">
        <h3 className="font-bold text-slate-700 mb-4">
          Current Vehicle Types ({types.length})
        </h3>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : types.length === 0 ? (
          <p className="text-sm text-slate-400">No vehicle types yet. Add one above.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {types.map((t) => (
              <div key={t.id}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 group hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <Bus className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 truncate">{t.type_name}</span>
                </div>
                <button
                  onClick={() => del(t.id)}
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
