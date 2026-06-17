import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Target, Save, Plus, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'

const cols: Column[] = [
  { label: 'Service No', key: 'service_no', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
  { label: 'Target (km/L)', key: 'target_kmpl', render: (v) => <span className="font-bold text-emerald-600">{String(v)} km/L</span> },
  { label: 'Min Target', key: 'min_target' },
  { label: 'Max Target', key: 'max_target' },
  { label: 'Period', key: 'period', render: (v) => <Badge variant="info">{String(v)}</Badge> },
  { label: 'Set By', key: 'usr_nm' },
  { label: 'Updated', key: 'i_ts' },
]

const PERIODS = ['Daily', 'Weekly', 'Monthly']

export default function FuelTargetPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ service_no: '', target_kmpl: '', min_target: '', max_target: '', period: 'Monthly' })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })

  const { data, isLoading } = useQuery({ queryKey: ['fuel-targets'], queryFn: () => fuelService.getFuelTarget({}) })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => fuelService.submitTarget({ ...form, user_id: localStorage.getItem('user_id'), usr_nm: localStorage.getItem('usr_nm') }),
    onSuccess: (res) => { if (res.status === 200) { toast.success('Target set!'); qc.invalidateQueries({ queryKey: ['fuel-targets'] }); setForm({ service_no: '', target_kmpl: '', min_target: '', max_target: '', period: 'Monthly' }); setShowForm(false) } else toast.error('Failed') },
    onError: () => toast.error('Server error'),
  })

  const [showForm, setShowForm] = useState(false)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-end">
        <PageHeader title="Fuel Target" subtitle="Set and manage fuel efficiency targets per service" />
        {!showForm && <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Set Target</Button>}
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div key="target-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <GlassCard className="p-6" colorBar="bg-gradient-to-r from-green-500 to-emerald-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Target className="w-5 h-5 text-green-500" /> Set Fuel Target</h2>
                <div className="flex gap-2">
                  <Button onClick={() => save()} disabled={isPending}><Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Save Target'}</Button>
                  <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
                <div><Label>Service No *</Label><Input placeholder="e.g. ST-11" value={form.service_no} onChange={f('service_no')} /></div>
                <div><Label>Target (km/L) *</Label><Input type="number" step="0.1" placeholder="e.g. 4.5" value={form.target_kmpl} onChange={f('target_kmpl')} /></div>
                <div><Label>Min Target</Label><Input type="number" step="0.1" placeholder="e.g. 4.0" value={form.min_target} onChange={f('min_target')} /></div>
                <div><Label>Max Target</Label><Input type="number" step="0.1" placeholder="e.g. 5.0" value={form.max_target} onChange={f('max_target')} /></div>
                <div><Label>Period</Label>
                  <Select value={form.period} onChange={f('period')}>
                    {PERIODS.map(p => <option key={p}>{p}</option>)}
                  </Select></div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
      <DataTable title="Fuel Targets" columns={cols} data={data?.data ?? []} loading={isLoading} onAction={() => {}} actions={['edit', 'delete']} />
    </motion.div>
  )
}
