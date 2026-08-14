import { useState } from 'react'
import { Save, Pencil, X, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard } from './GlassCard'
import { Button } from './Button'
import { Input } from './Input'
import { Label } from './Label'
import { DataTable } from './DataTable'

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

export function NameListMaster({ label, placeholder, fieldKey, queryKey, getAll, add, edit, remove }: NameListMasterProps) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({ queryKey: [queryKey], queryFn: getAll })
  const list: any[] = data?.data ?? []

  // Case-insensitive, trimmed — "Hyderabad" and "hyderabad " are the same
  // entry as far as every picker that reads this list is concerned.
  const isDuplicate = (value: string, excludeId?: number | null) =>
    list.some((item) => item.id !== excludeId && String(item[fieldKey] ?? '').trim().toLowerCase() === value.trim().toLowerCase())

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (isDuplicate(trimmed)) { toast.error(`${label} "${trimmed}" already exists`); return }
    submit()
  }

  const handleEditSave = () => {
    const trimmed = editValue.trim()
    if (!trimmed) return
    if (isDuplicate(trimmed, editId)) { toast.error(`${label} "${trimmed}" already exists`); return }
    editSave()
  }

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
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <Button onClick={handleSubmit} disabled={isPending || !name.trim()}>
            <Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Submit'}
          </Button>
        </div>
      </GlassCard>

      <DataTable
        title={`${label} List`}
        columns={[
          { label: 'S.No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-slate-500">{i + 1}</span> },
          { label, key: fieldKey, filterable: true, render: (v, row: any) => (
            editId === row.id ? (
              <Input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditId(null) }}
                className="h-9 max-w-xs"
              />
            ) : (
              <span className="font-medium text-slate-800">{String(v)}</span>
            )
          ) },
          { label: 'Action', key: 'id', align: 'center', render: (_v, row: any) => (
            editId === row.id ? (
              <div className="flex items-center justify-center gap-2">
                <button onClick={handleEditSave} className="text-emerald-500 hover:text-emerald-700 transition-colors" title="Save"><Check className="w-4 h-4" /></button>
                <button onClick={() => { setEditId(null); setEditValue('') }} className="text-slate-400 hover:text-red-500 transition-colors" title="Cancel"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => { setEditId(row.id); setEditValue(row[fieldKey]) }} className="text-blue-500 hover:text-blue-700 transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => del(row.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Delete"><X className="w-4 h-4" /></button>
              </div>
            )
          ) },
        ]}
        data={list}
        loading={isLoading}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </>
  )
}
