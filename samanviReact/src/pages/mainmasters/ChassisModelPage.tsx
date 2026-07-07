import { useState } from 'react'
import { motion } from 'motion/react'
import { Cog, Plus, X, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader } from '@/components/shared'
import { mastersService } from '@/services/masters.service'

export default function ChassisModelPage() {
  const qc = useQueryClient()
  const [newModel, setNewModel] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['chassis-models'],
    queryFn: () => mastersService.getChassisModels(),
  })

  const models: any[] = data?.data ?? []

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: () => mastersService.addChassisModel({ model_name: newModel.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Chassis model added!')
        setNewModel('')
        qc.invalidateQueries({ queryKey: ['chassis-models'] })
      } else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mastersService.deleteChassisModel({ id }),
    onSuccess: () => {
      toast.success('Chassis model removed')
      qc.invalidateQueries({ queryKey: ['chassis-models'] })
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Chassis Model Master" subtitle="Manage chassis model names used across the bus fleet" />

      {/* Add new model */}
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Cog className="w-4 h-4 text-blue-500" /> Add Chassis Model
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-sm">
            <Label>Model Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Viking, Skyline, Starbus…"
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && newModel.trim() && add()}
            />
          </div>
          <Button onClick={() => add()} disabled={adding || !newModel.trim()}>
            <Plus className="w-4 h-4" /> Add Model
          </Button>
        </div>
      </GlassCard>

      {/* Existing models */}
      <GlassCard className="p-6">
        <h3 className="font-bold text-slate-700 mb-4">
          Current Chassis Models ({models.length})
        </h3>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : models.length === 0 ? (
          <p className="text-sm text-slate-400">No chassis models yet. Add one above.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {models.map((m) => (
              <div key={m.id}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 group hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <Cog className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 truncate">{m.model_name}</span>
                </div>
                <button
                  onClick={() => del(m.id)}
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
