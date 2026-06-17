import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Fuel, Save, Plus, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mastersService } from '@/services/masters.service'

const cols: Column[] = [
  { label: 'Bus No', key: 'bus_no', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
  { label: 'Owner', key: 'ownername' },
  { label: 'Added On', key: 'i_ts' },
  { label: 'Type', key: 'issparetank', render: (v) => <Badge variant={v == 1 ? 'teal' : 'info'}>{v == 1 ? 'Spare Tank' : 'Regular'}</Badge> },
]

export default function SpareTankPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ bus_no: '', ownername: '' })

  const { data, isLoading } = useQuery({ queryKey: ['spare-tanks'], queryFn: () => mastersService.getSpareTanks() })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => mastersService.addSpareTank({ ...form, user_id: localStorage.getItem('user_id'), usr_nm: localStorage.getItem('usr_nm') }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Spare tank added!')
        qc.invalidateQueries({ queryKey: ['spare-tanks'] })
        setShowForm(false); setForm({ bus_no: '', ownername: '' })
      } else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-end">
        <PageHeader title="Spare Tank Master" subtitle="Manage spare fuel tank bus numbers" />
        {!showForm && <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Add Spare Tank</Button>}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div key="spare-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <GlassCard className="p-6" colorBar="bg-gradient-to-r from-teal-500 to-cyan-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Fuel className="w-5 h-5 text-teal-500" /> Add Spare Tank</h2>
                <div className="flex gap-2">
                  <Button onClick={() => save()} disabled={isPending || !form.bus_no}><Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Save'}</Button>
                  <button onClick={() => { setShowForm(false); setForm({ bus_no: '', ownername: '' }) }} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div><Label>Bus Number / Tank Name *</Label><Input placeholder="e.g. 4142-Spare Tank" value={form.bus_no} onChange={(e) => setForm({ ...form, bus_no: e.target.value })} /></div>
                <div><Label>Owner Name</Label><Input placeholder="e.g. Samanvi" value={form.ownername} onChange={(e) => setForm({ ...form, ownername: e.target.value })} /></div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable title="Spare Tank Buses" columns={cols} data={data?.data ?? []} loading={isLoading} onAction={() => {}} actions={['delete']} />
    </motion.div>
  )
}
