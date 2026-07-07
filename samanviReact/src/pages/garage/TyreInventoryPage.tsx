import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CircleDot, Save, Plus, X, Edit2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'

const STATUSES = ['In Stock', 'In Use', 'Retreaded', 'Scrapped']

const EMPTY_FORM = { tyre_code: '', brand: '', size: '', purchase_date: '', cost: '', status: 'In Stock', remarks: '' }

const today = new Date().toISOString().split('T')[0]

const statusVariant: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
  'In Stock': 'success', 'In Use': 'info', Retreaded: 'warning', Scrapped: 'danger',
}

export default function TyreInventoryPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({ queryKey: ['tyre-inventory'], queryFn: () => garageService.getTyreInventory() })
  const list: any[] = data?.data ?? []

  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }))

  const buildPayload = () => ({
    ...form,
    id: editId,
    user_id: localStorage.getItem('user_id'),
    usr_nm: localStorage.getItem('usr_nm'),
  })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => (isEdit ? garageService.editTyre(buildPayload()) : garageService.addTyre(buildPayload())),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success(isEdit ? 'Tyre updated!' : 'Tyre added!'); qc.invalidateQueries({ queryKey: ['tyre-inventory'] }); closeForm() }
      else toast.error('Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const handleEdit = (row: any) => {
    setForm({
      tyre_code: row.tyre_code ?? '', brand: row.brand ?? '', size: row.size ?? '',
      purchase_date: row.purchase_date ?? '', cost: row.cost ?? '', status: row.status ?? 'In Stock',
      remarks: row.remarks ?? '',
    })
    setIsEdit(true); setEditId(row.id); setShowForm(true)
  }

  const handleDelete = (row: any) => {
    garageService.deleteTyre({ id: row.id }).then((res) => {
      if (res.status === 200) { toast.success('Tyre removed'); qc.invalidateQueries({ queryKey: ['tyre-inventory'] }) }
      else toast.error('Failed')
    })
  }

  const openAdd = () => { setForm(EMPTY_FORM); setIsEdit(false); setEditId(null); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setForm(EMPTY_FORM); setIsEdit(false); setEditId(null) }

  const cols: Column[] = [
    { label: 'Tyre Code', key: 'tyre_code', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Brand', key: 'brand', filterable: true },
    { label: 'Size', key: 'size', filterable: true },
    { label: 'Status', key: 'status', filterable: true, render: (v) => <Badge variant={statusVariant[String(v)] ?? 'default'}>{String(v)}</Badge> },
    { label: 'Current Vehicle', key: 'current_vehicle_number', filterable: true, render: (v) => v ? <span className="font-medium">{String(v)}</span> : <span className="text-slate-300">—</span> },
    { label: 'Position', key: 'current_position', filterable: true, render: (v) => v ? <Badge variant="purple">{String(v)}</Badge> : <span className="text-slate-300">—</span> },
    { label: 'Purchased', key: 'purchase_date', render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
    { label: 'Cost', key: 'cost', align: 'right', render: (v) => <span className="font-medium">₹{v}</span> },
  ]

  const canSave = !!form.tyre_code

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-end">
        <PageHeader title="Tyre Inventory" subtitle="Manage the tyre stock and lifecycle status" />
        {!showForm && <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Tyre</Button>}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <GlassCard className="p-6" colorBar={isEdit ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {isEdit ? <><Edit2 className="w-5 h-5 text-amber-500" /> Edit Tyre</> : <><CircleDot className="w-5 h-5 text-blue-500" /> Add Tyre</>}
                </h2>
                <button onClick={closeForm} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div><Label>Tyre Code *</Label><Input placeholder="e.g. TYR-1001" value={form.tyre_code} onChange={f('tyre_code')} /></div>
                <div><Label>Brand</Label><Input placeholder="e.g. MRF, CEAT" value={form.brand} onChange={f('brand')} /></div>
                <div><Label>Size</Label><Input placeholder="e.g. 295/80 R22.5" value={form.size} onChange={f('size')} /></div>
                <div><Label>Purchase Date</Label><Input type="date" max={today} value={form.purchase_date} onChange={f('purchase_date')} /></div>
                <div><Label>Cost (₹)</Label><Input type="number" value={form.cost} onChange={f('cost')} /></div>
                <div><Label>Status</Label>
                  <Select value={form.status} onChange={f('status')}>
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </Select></div>
                <div className="md:col-span-3"><Label>Remarks</Label><Input value={form.remarks} onChange={f('remarks')} /></div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={() => save()} disabled={isPending || !canSave}>
                  <Save className="w-4 h-4" />{isPending ? 'Saving…' : isEdit ? 'Update Tyre' : 'Save Tyre'}
                </Button>
                <Button variant="ghost" onClick={closeForm}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable
        title="Tyre Inventory"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={(action, row) => { if (action === 'edit') handleEdit(row); if (action === 'delete') handleDelete(row) }}
        actions={['edit', 'delete']}
        icon={<CircleDot className="w-5 h-5 text-blue-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
