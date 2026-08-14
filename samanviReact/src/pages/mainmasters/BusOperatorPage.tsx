import { useState } from 'react'
import { motion } from 'motion/react'
import { Building2, Plus, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader } from '@/components/shared'
import { mastersService } from '@/services/masters.service'

export default function BusOperatorPage() {
  const qc = useQueryClient()
  const [newOperator, setNewOperator] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['bus-operators'],
    queryFn: () => mastersService.getBusOperators(),
  })

  const operators: any[] = data?.data ?? []

  const isDuplicate = (value: string) =>
    operators.some((o: any) => String(o.operator_name ?? '').trim().toLowerCase() === value.trim().toLowerCase())
  const handleAdd = () => {
    const trimmed = newOperator.trim()
    if (!trimmed) return
    if (isDuplicate(trimmed)) { toast.error(`Bus operator "${trimmed}" already exists`); return }
    add()
  }

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: () => mastersService.addBusOperator({ operator_name: newOperator.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Bus operator added!')
        setNewOperator('')
        qc.invalidateQueries({ queryKey: ['bus-operators'] })
      } else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mastersService.deleteBusOperator({ id }),
    onSuccess: () => {
      toast.success('Bus operator removed')
      qc.invalidateQueries({ queryKey: ['bus-operators'] })
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Bus Operator Master" subtitle="Manage bus operators used across service routes" />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-blue-500" /> Add Bus Operator
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-sm">
            <Label>Operator Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Samanvi Travels, VRL…"
              value={newOperator}
              onChange={(e) => setNewOperator(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} disabled={adding || !newOperator.trim()}>
            <Plus className="w-4 h-4" /> Add Operator
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h3 className="font-bold text-slate-700 mb-4">
          Current Bus Operators ({operators.length})
        </h3>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : operators.length === 0 ? (
          <p className="text-sm text-slate-400">No bus operators yet. Add one above.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {operators.map((o) => (
              <div key={o.id}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 group hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 truncate">{o.operator_name}</span>
                </div>
                <button
                  onClick={() => del(o.id)}
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
