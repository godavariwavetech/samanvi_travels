import { useState } from 'react'
import { motion } from 'motion/react'
import { Save, Pencil, X, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader, TopNavTabs } from '@/components/shared'
import { mainmastersService } from '@/services/mainmasters.service'
import { garageService } from '@/services/garage.service'

const tabs = ['Service Reminder Types', 'Tyre Positions', 'Repair Categories', 'Spare Parts']

interface NameListMasterProps {
  label: string
  placeholder: string
  fieldKey: string
  queryKey: string
  getAll: () => Promise<any>
  add: (data: unknown) => Promise<any>
  edit: (data: unknown) => Promise<any>
  remove: (data: unknown) => Promise<any>
}

function NameListMaster({ label, placeholder, fieldKey, queryKey, getAll, add, edit, remove }: NameListMasterProps) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data, isLoading } = useQuery({ queryKey: [queryKey], queryFn: getAll })
  const list: any[] = data?.data ?? []

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => add({ [fieldKey]: name.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success(`${label} added!`); qc.invalidateQueries({ queryKey: [queryKey] }); setName('') }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: editSave } = useMutation({
    mutationFn: () => edit({ id: editId, [fieldKey]: editValue.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Updated!'); qc.invalidateQueries({ queryKey: [queryKey] }); setEditId(null); setEditValue('') }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => remove({ id }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Deleted'); qc.invalidateQueries({ queryKey: [queryKey] }) }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <>
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-sm">
            <Label>{label} <span className="text-red-500">*</span></Label>
            <Input
              placeholder={placeholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && submit()}
            />
          </div>
          <Button onClick={() => submit()} disabled={isPending || !name.trim()}>
            <Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Submit'}
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden mt-6">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-5 py-3 text-sm font-bold w-20 text-center">S.No</th>
              <th className="px-5 py-3 text-sm font-bold">{label}</th>
              <th className="px-5 py-3 text-sm font-bold text-center w-32">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {!isLoading && list.length === 0 && <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">No entries yet.</td></tr>}
            {list.map((row, idx) => (
              <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-sm text-center text-slate-500">{idx + 1}</td>
                <td className="px-5 py-3 text-sm">
                  {editId === row.id ? (
                    <Input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && editValue.trim()) editSave(); if (e.key === 'Escape') setEditId(null) }}
                      className="h-9 max-w-xs"
                    />
                  ) : (
                    <span className="font-medium text-slate-800">{row[fieldKey]}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  {editId === row.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => editValue.trim() && editSave()} className="text-emerald-500 hover:text-emerald-700 transition-colors" title="Save"><Check className="w-4 h-4" /></button>
                      <button onClick={() => { setEditId(null); setEditValue('') }} className="text-slate-400 hover:text-red-500 transition-colors" title="Cancel"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => { setEditId(row.id); setEditValue(row[fieldKey]) }} className="text-blue-500 hover:text-blue-700 transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => del(row.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete"><X className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </>
  )
}

const EMPTY_PART = { part_number: '', part_name: '', price: '' }

function SparePartsMaster() {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_PART)
  const [editId, setEditId] = useState<number | null>(null)

  const { data, isLoading } = useQuery({ queryKey: ['repair-parts'], queryFn: () => garageService.getParts() })
  const list: any[] = data?.data ?? []

  const f = (k: keyof typeof EMPTY_PART) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, [k]: e.target.value }))

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => (editId ? garageService.editPart({ ...form, id: editId }) : garageService.addPart(form)),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success(editId ? 'Part updated!' : 'Part added!'); qc.invalidateQueries({ queryKey: ['repair-parts'] }); reset() }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => garageService.deletePart({ id }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['repair-parts'] }) }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const startEdit = (row: any) => { setForm({ part_number: row.part_number ?? '', part_name: row.part_name ?? '', price: row.price ?? '' }); setEditId(row.part_id) }
  const reset = () => { setForm(EMPTY_PART); setEditId(null) }
  const canSave = !!form.part_name.trim()

  return (
    <>
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div><Label>Number</Label><Input placeholder="e.g. PRT-001" value={form.part_number} onChange={f('part_number')} className="w-40" /></div>
          <div className="flex-1 min-w-[200px]"><Label>Name <span className="text-red-500">*</span></Label><Input placeholder="e.g. Engine Oil" value={form.part_name} onChange={f('part_name')} /></div>
          <div><Label>Cost (₹)</Label><Input type="number" placeholder="0" value={form.price} onChange={f('price')} className="w-32" /></div>
          <Button onClick={() => save()} disabled={isPending || !canSave}>
            <Save className="w-4 h-4" />{isPending ? 'Saving…' : editId ? 'Update' : 'Submit'}
          </Button>
          {editId && <Button variant="ghost" onClick={reset}><X className="w-4 h-4" /> Cancel</Button>}
        </div>
      </GlassCard>

      <GlassCard className="overflow-hidden mt-6">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="px-5 py-3 text-sm font-bold w-32">Number</th>
              <th className="px-5 py-3 text-sm font-bold">Name</th>
              <th className="px-5 py-3 text-sm font-bold w-32 text-right">Cost</th>
              <th className="px-5 py-3 text-sm font-bold text-center w-32">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>}
            {!isLoading && list.length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No parts yet.</td></tr>}
            {list.map((row) => (
              <tr key={row.part_id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-sm text-slate-600">{row.part_number || '—'}</td>
                <td className="px-5 py-3 text-sm font-medium text-slate-800">{row.part_name}</td>
                <td className="px-5 py-3 text-sm text-right font-semibold">₹{row.price}</td>
                <td className="px-5 py-3 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => startEdit(row)} className="text-blue-500 hover:text-blue-700 transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => del(row.part_id)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete"><X className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </>
  )
}

export default function GarageMastersPage() {
  const [tab, setTab] = useState(tabs[0])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Garage Masters" subtitle="Manage the type and inventory lists used across the Garage module" />
      <TopNavTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === 'Service Reminder Types' && (
        <NameListMaster
          label="Reminder Type"
          placeholder="e.g. Oil Change, Insurance Renewal…"
          fieldKey="type_name"
          queryKey="reminder-types"
          getAll={mainmastersService.getReminderTypes}
          add={mainmastersService.addReminderType}
          edit={mainmastersService.editReminderType}
          remove={mainmastersService.deleteReminderType}
        />
      )}

      {tab === 'Tyre Positions' && (
        <NameListMaster
          label="Tyre Position"
          placeholder="e.g. Front Left, Spare 1…"
          fieldKey="position_name"
          queryKey="tyre-positions-master"
          getAll={mainmastersService.getTyrePositionsMaster}
          add={mainmastersService.addTyrePositionMaster}
          edit={mainmastersService.editTyrePositionMaster}
          remove={mainmastersService.deleteTyrePositionMaster}
        />
      )}

      {tab === 'Repair Categories' && (
        <NameListMaster
          label="Repair Category"
          placeholder="e.g. Engine Repair, Brakes…"
          fieldKey="name"
          queryKey="repair-cats"
          getAll={garageService.getCategories}
          add={garageService.addCategory}
          edit={garageService.editCategory}
          remove={garageService.deleteCategory}
        />
      )}

      {tab === 'Spare Parts' && <SparePartsMaster />}
    </motion.div>
  )
}
