import { useState } from 'react'
import { motion } from 'motion/react'
import { Settings, Save, Cpu } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, TopNavTabs, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'

const tabs = ['Repair Categories', 'Spare Parts']

const catCols: Column[] = [
  { label: 'Category Name', key: 'category_name', render: (v) => <span className="font-bold">{String(v)}</span> },
  { label: 'Description', key: 'description' },
  { label: 'Status', key: 'd_in', render: (v) => <Badge variant={v == 0 ? 'success' : 'danger'}>{v == 0 ? 'Active' : 'Inactive'}</Badge> },
]

const partCols: Column[] = [
  { label: 'Part Name', key: 'part_name', render: (v) => <span className="font-bold">{String(v)}</span> },
  { label: 'Unit', key: 'unit' },
  { label: 'Stock', key: 'current_stock', render: (v) => <Badge variant={Number(v) > 5 ? 'success' : 'danger'}>{String(v)} units</Badge> },
  { label: 'Rate', key: 'rate', render: (v) => <span className="font-medium">₹{v}</span> },
]

export default function GarageMastersPage() {
  const [tab, setTab] = useState('Repair Categories')
  const qc = useQueryClient()
  const [catForm, setCatForm] = useState({ category_name: '', description: '' })
  const [partForm, setPartForm] = useState({ part_name: '', unit: '', current_stock: '', rate: '' })

  const { data: cats, isLoading: loadCats } = useQuery({ queryKey: ['repair-cats'], queryFn: () => garageService.getCategories() })
  const { data: parts, isLoading: loadParts } = useQuery({ queryKey: ['repair-parts'], queryFn: () => garageService.getParts() })

  const { mutate: addCat, isPending: addingCat } = useMutation({
    mutationFn: () => garageService.addCategory({ ...catForm, user_id: localStorage.getItem('user_id') }),
    onSuccess: (res) => { if (res.status === 200) { toast.success('Category added!'); qc.invalidateQueries({ queryKey: ['repair-cats'] }); setCatForm({ category_name: '', description: '' }) } else toast.error('Failed') },
    onError: () => toast.error('Server error'),
  })

  const { mutate: addPart, isPending: addingPart } = useMutation({
    mutationFn: () => garageService.addPart({ ...partForm, user_id: localStorage.getItem('user_id') }),
    onSuccess: (res) => { if (res.status === 200) { toast.success('Part added!'); qc.invalidateQueries({ queryKey: ['repair-parts'] }); setPartForm({ part_name: '', unit: '', current_stock: '', rate: '' }) } else toast.error('Failed') },
    onError: () => toast.error('Server error'),
  })

  const handleCatAction = (action: string, row: any) => {
    if (action === 'delete') garageService.deleteCategory({ id: row.id }).then(() => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['repair-cats'] }) })
  }
  const handlePartAction = (action: string, row: any) => {
    if (action === 'delete') garageService.deletePart({ id: row.id }).then(() => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['repair-parts'] }) })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Garage Masters" subtitle="Manage repair categories and spare parts inventory" />
      <TopNavTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === 'Repair Categories' && (
        <>
          <GlassCard className="p-6" colorBar="bg-gradient-to-r from-slate-600 to-slate-800">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-slate-600" /> Add Category</h2>
              <Button onClick={() => addCat()} disabled={addingCat}><Save className="w-4 h-4" />{addingCat ? 'Saving…' : 'Save'}</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div><Label>Category Name *</Label><Input placeholder="e.g. Engine Repair" value={catForm.category_name} onChange={(e) => setCatForm({ ...catForm, category_name: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} /></div>
            </div>
          </GlassCard>
          <DataTable title="Repair Categories" columns={catCols} data={cats?.data ?? []} loading={loadCats} onAction={handleCatAction} actions={['edit', 'delete']} />
        </>
      )}

      {tab === 'Spare Parts' && (
        <>
          <GlassCard className="p-6" colorBar="bg-gradient-to-r from-amber-500 to-orange-500">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Cpu className="w-5 h-5 text-amber-500" /> Add Spare Part</h2>
              <Button onClick={() => addPart()} disabled={addingPart}><Save className="w-4 h-4" />{addingPart ? 'Saving…' : 'Save'}</Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div><Label>Part Name *</Label><Input placeholder="e.g. Oil Filter" value={partForm.part_name} onChange={(e) => setPartForm({ ...partForm, part_name: e.target.value })} /></div>
              <div><Label>Unit</Label><Input placeholder="e.g. Piece, Litre" value={partForm.unit} onChange={(e) => setPartForm({ ...partForm, unit: e.target.value })} /></div>
              <div><Label>Current Stock</Label><Input type="number" value={partForm.current_stock} onChange={(e) => setPartForm({ ...partForm, current_stock: e.target.value })} /></div>
              <div><Label>Rate (₹)</Label><Input type="number" value={partForm.rate} onChange={(e) => setPartForm({ ...partForm, rate: e.target.value })} /></div>
            </div>
          </GlassCard>
          <DataTable title="Spare Parts Inventory" columns={partCols} data={parts?.data ?? []} loading={loadParts} onAction={handlePartAction} actions={['edit', 'delete']} />
        </>
      )}
    </motion.div>
  )
}
