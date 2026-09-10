import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Target, Save, Plus, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'
import { mastersService } from '@/services/masters.service'

// Only 'monthly' is meaningful today, but the schema keeps the column so we
// can add other rhythms without a migration. The dropdown is shown so the user
// sees this is per-month, not lifetime.
const PERIODS = [{ value: 'monthly', label: 'Monthly' }]

type FormState = {
  id: number | 0
  bus_no: string
  target_liters: string
  period: string
}

const emptyForm = (): FormState => ({ id: 0, bus_no: '', target_liters: '', period: 'monthly' })

export default function FuelTargetPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editForm, setEditForm] = useState<FormState | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: targetsResp, isLoading } = useQuery({
    queryKey: ['fuel-targets'],
    queryFn: () => fuelService.listFuelTargets(),
  })
  const { data: busesResp } = useQuery({
    queryKey: ['buses'],
    queryFn: () => mastersService.getBuses(),
  })

  const buses = (busesResp?.data ?? []) as { id: number; bus_no: string }[]
  const targets = (targetsResp?.data ?? []) as Record<string, unknown>[]

  const named = localStorage.getItem('usr_nm') ?? ''
  const user_id = localStorage.getItem('user_id') ?? '0'

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => fuelService.submitTarget({ ...form, named, user_id }),
    onSuccess: (res) => {
      if (res?.status === 200) {
        toast.success('Target saved')
        qc.invalidateQueries({ queryKey: ['fuel-targets'] })
        setForm(emptyForm())
        setShowForm(false)
      } else toast.error(res?.message || 'Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: () => fuelService.editFuelTarget({ ...(editForm as FormState), named, user_id }),
    onSuccess: (res) => {
      if (res?.status === 200) {
        toast.success('Target updated')
        qc.invalidateQueries({ queryKey: ['fuel-targets'] })
        setEditForm(null)
      } else toast.error(res?.message || 'Failed to update')
    },
    onError: () => toast.error('Server error'),
  })

  const validate = (f: FormState): string | null => {
    if (!f.bus_no) return 'Pick a bus'
    if (!f.target_liters || Number(f.target_liters) <= 0) return 'Target must be greater than 0'
    return null
  }

  const onSaveNew = () => {
    const err = validate(form)
    if (err) return toast.error(err)
    save()
  }

  const onSaveEdit = () => {
    if (!editForm) return
    const err = validate(editForm)
    if (err) return toast.error(err)
    update()
  }

  const onDelete = async (row: Record<string, unknown>) => {
    if (!confirm(`Delete target for bus ${row.bus_no}?`)) return
    const res = await fuelService.deleteFuelTarget({ id: row.id, named, user_id })
    if (res?.status === 200) {
      toast.success('Target deleted')
      qc.invalidateQueries({ queryKey: ['fuel-targets'] })
    } else toast.error(res?.message || 'Failed')
  }

  const onEdit = (row: Record<string, unknown>) => {
    setEditForm({
      id: Number(row.id),
      bus_no: String(row.bus_no || ''),
      target_liters: String(row.target_liters || 0),
      period: String(row.period || 'monthly'),
    })
  }

  const cols: Column[] = useMemo(() => [
    { label: 'Bus No', key: 'bus_no', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Target (L)', key: 'target_liters', render: (v) => <span className="font-bold text-emerald-600">{String(v)} L</span> },
    { label: 'Period', key: 'period', render: (v) => <Badge variant="info">{String(v)}</Badge> },
    { label: 'Set By', key: 'entry_by' },
    { label: 'Created', key: 'i_ts' },
    { label: 'Updated', key: 'updated_at', render: (v) => v ? String(v) : '—' },
  ], [])

  const handleAction = (action: string, row: Record<string, unknown>) => {
    if (action === 'edit') onEdit(row)
    else if (action === 'delete') onDelete(row)
  }

  const renderForm = (f: FormState, set: (f: FormState) => void) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div>
        <Label>Bus No *</Label>
        <Select value={f.bus_no} onChange={(e) => set({ ...f, bus_no: e.target.value })}>
          <option value="">Select Bus</option>
          {buses.map((b) => <option key={b.id} value={b.bus_no}>{b.bus_no}</option>)}
        </Select>
      </div>
      <div>
        <Label>Target (Litres) *</Label>
        <Input type="number" step="0.01" placeholder="e.g. 500"
          value={f.target_liters}
          onChange={(e) => set({ ...f, target_liters: e.target.value })} />
      </div>
      <div>
        <Label>Period</Label>
        <Select value={f.period} onChange={(e) => set({ ...f, period: e.target.value })}>
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
      </div>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-end">
        <PageHeader title="Fuel Target" subtitle="Set monthly fuel consumption targets per bus" />
        {!showForm && <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Set Target</Button>}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div key="target-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <GlassCard className="p-6" colorBar="bg-gradient-to-r from-green-500 to-emerald-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-500" /> Set Fuel Target
                </h2>
                <div className="flex gap-2">
                  <Button onClick={onSaveNew} disabled={isPending}>
                    <Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Save Target'}
                  </Button>
                  <button onClick={() => { setShowForm(false); setForm(emptyForm()) }} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
                </div>
              </div>
              {renderForm(form, setForm)}
              <p className="text-xs text-slate-500 mt-3">Saving a target for a bus that already has one will replace the previous target.</p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable
        title="Active Fuel Targets"
        columns={cols}
        data={targets}
        loading={isLoading}
        onAction={handleAction}
        actions={['edit', 'delete']}
      />

      {/* Edit modal */}
      <AnimatePresence>
        {editForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4 flex justify-between items-center text-white">
                <h3 className="font-bold text-lg">Edit Fuel Target</h3>
                <button onClick={() => setEditForm(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6">
                {renderForm(editForm, setEditForm)}
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="ghost" onClick={() => setEditForm(null)}>Cancel</Button>
                  <Button onClick={onSaveEdit} disabled={updating}>
                    <Save className="w-4 h-4" /> {updating ? 'Updating…' : 'Update Target'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
