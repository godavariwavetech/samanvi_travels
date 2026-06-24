import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BatteryCharging, Save, Plus, X, Edit2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { fuelService } from '@/services/fuel.service'

const STATUSES = ['Active', 'Replaced', 'Scrapped']

const EMPTY_FORM = { battery_code: '', brand: '', capacity_ah: '', vehicle_number: '', install_date: '', warranty_months: '', cost: '', status: 'Active', remarks: '' }

const today = new Date().toISOString().split('T')[0]

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  Active: 'success', Replaced: 'warning', Scrapped: 'danger',
}

export default function BatteryManagementPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading } = useQuery({ queryKey: ['batteries'], queryFn: () => garageService.getBatteries() })
  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })

  const list: any[] = data?.data ?? []
  const busList: any[] = buses?.data ?? []

  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }))
  const setField = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm((s) => ({ ...s, [k]: v }))

  const buildPayload = () => ({
    ...form,
    id: editId,
    user_id: localStorage.getItem('user_id'),
    usr_nm: localStorage.getItem('usr_nm'),
  })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => (isEdit ? garageService.editBattery(buildPayload()) : garageService.addBattery(buildPayload())),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success(isEdit ? 'Battery updated!' : 'Battery added!'); qc.invalidateQueries({ queryKey: ['batteries'] }); closeForm() }
      else toast.error('Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const handleEdit = (row: any) => {
    setForm({
      battery_code: row.battery_code ?? '', brand: row.brand ?? '', capacity_ah: row.capacity_ah ?? '',
      vehicle_number: row.vehicle_number ?? '', install_date: row.install_date ?? '',
      warranty_months: row.warranty_months ?? '', cost: row.cost ?? '', status: row.status ?? 'Active',
      remarks: row.remarks ?? '',
    })
    setIsEdit(true); setEditId(row.id); setShowForm(true)
  }

  const handleDelete = (row: any) => {
    garageService.deleteBattery({ id: row.id }).then((res) => {
      if (res.status === 200) { toast.success('Battery removed'); qc.invalidateQueries({ queryKey: ['batteries'] }) }
      else toast.error('Failed')
    })
  }

  const openAdd = () => { setForm(EMPTY_FORM); setIsEdit(false); setEditId(null); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setForm(EMPTY_FORM); setIsEdit(false); setEditId(null) }

  const cols: Column[] = [
    { label: 'Battery Code', key: 'battery_code', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Brand', key: 'brand' },
    { label: 'Capacity', key: 'capacity_ah' },
    { label: 'Vehicle', key: 'vehicle_number', render: (v) => v ? <span className="font-medium">{String(v)}</span> : <span className="text-slate-300">—</span> },
    { label: 'Installed', key: 'install_date', render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
    { label: 'Warranty (mo)', key: 'warranty_months', render: (v) => <span className="text-sm">{v ?? '—'}</span> },
    { label: 'Status', key: 'status', render: (v) => <Badge variant={statusVariant[String(v)] ?? 'default'}>{String(v)}</Badge> },
    { label: 'Cost', key: 'cost', render: (v) => <span className="font-medium">₹{v}</span> },
  ]

  const canSave = !!form.battery_code

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-end">
        <PageHeader title="Battery Management" subtitle="Track battery installs, warranty and lifecycle status" />
        {!showForm && <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Battery</Button>}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <GlassCard className="p-6" colorBar={isEdit ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {isEdit ? <><Edit2 className="w-5 h-5 text-amber-500" /> Edit Battery</> : <><BatteryCharging className="w-5 h-5 text-blue-500" /> Add Battery</>}
                </h2>
                <button onClick={closeForm} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div><Label>Battery Code *</Label><Input placeholder="e.g. BAT-1001" value={form.battery_code} onChange={f('battery_code')} /></div>
                <div><Label>Brand</Label><Input placeholder="e.g. Exide, Amaron" value={form.brand} onChange={f('brand')} /></div>
                <div><Label>Capacity (Ah)</Label><Input placeholder="e.g. 150Ah" value={form.capacity_ah} onChange={f('capacity_ah')} /></div>
                <div><Label>Vehicle Number</Label>
                  <SearchableSelect
                    value={form.vehicle_number}
                    onChange={setField('vehicle_number')}
                    options={busList.map((b) => ({ value: b.bus_no, label: b.bus_no }))}
                    placeholder="Unassigned"
                    onReload={() => reloadBuses()}
                    reloading={loadingBuses}
                  /></div>
                <div><Label>Install Date</Label><Input type="date" max={today} value={form.install_date} onChange={f('install_date')} /></div>
                <div><Label>Warranty (months)</Label><Input type="number" value={form.warranty_months} onChange={f('warranty_months')} /></div>
                <div><Label>Cost (₹)</Label><Input type="number" value={form.cost} onChange={f('cost')} /></div>
                <div><Label>Status</Label>
                  <Select value={form.status} onChange={f('status')}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </Select></div>
                <div><Label>Remarks</Label><Input value={form.remarks} onChange={f('remarks')} /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={() => save()} disabled={isPending || !canSave}>
                  <Save className="w-4 h-4" />{isPending ? 'Saving…' : isEdit ? 'Update Battery' : 'Save Battery'}
                </Button>
                <Button variant="ghost" onClick={closeForm}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable
        title="Battery Records"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={(action, row) => { if (action === 'edit') handleEdit(row); if (action === 'delete') handleDelete(row) }}
        actions={['edit', 'delete']}
        icon={<BatteryCharging className="w-5 h-5 text-blue-500" />}
      />
    </motion.div>
  )
}
