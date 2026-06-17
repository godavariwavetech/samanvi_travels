import { useState } from 'react'
import { motion } from 'motion/react'
import { Building2, Save, Pencil, Check, X, Trash2, Plus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader } from '@/components/shared'
import { mainmastersService } from '@/services/mainmasters.service'

export default function StaticEntryPage() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['districts'],
    queryFn: () => mainmastersService.getDistricts(),
  })

  const list: any[] = (data?.data ?? []).map((r: any, i: number) => ({ ...r, i: i + 1 }))

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: () => mainmastersService.addDistrict({ districtnm: name.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Entry added!')
        setName('')
        qc.invalidateQueries({ queryKey: ['districts'] })
      } else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: edit, isPending: editing } = useMutation({
    mutationFn: () => mainmastersService.editDistrict({ id: editId, districtnm: editValue.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Updated!')
        setEditId(null)
        qc.invalidateQueries({ queryKey: ['districts'] })
      } else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mainmastersService.deleteDistrict({ id }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Deleted')
        qc.invalidateQueries({ queryKey: ['districts'] })
      } else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader
        title="Static Entry"
        subtitle="Top-level master categories used across the accounting hierarchy"
      />

      {/* Add form */}
      <GlassCard className="p-5 sm:p-6" colorBar="bg-gradient-to-r from-blue-500 to-indigo-500">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
          <Plus className="w-4 h-4 text-blue-500" /> Add Entry
        </h2>
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
          <div className="w-full sm:flex-1 sm:max-w-sm">
            <Label>Entry Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Assets, Income, Expenses…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && name.trim() && add()}
            />
          </div>
          <Button
            variant="primary"
            onClick={() => add()}
            disabled={adding || !name.trim()}
            className="w-full sm:w-auto"
          >
            <Save className="w-4 h-4" />
            {adding ? 'Saving…' : 'Submit'}
          </Button>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <div className="p-4 sm:p-5 bg-white/40 border-b border-slate-100 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-500" />
          <h3 className="font-bold text-slate-900 text-base sm:text-lg">Static Entries</h3>
          <span className="text-xs text-slate-500 font-medium ml-1">
            {isLoading ? 'Loading…' : `${list.length} record${list.length !== 1 ? 's' : ''}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-5 py-3 text-sm font-bold w-20 text-center">S.No</th>
                <th className="px-5 py-3 text-sm font-bold">Entry Name</th>
                <th className="px-5 py-3 text-sm font-bold text-center w-32">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-slate-400">Loading…</td>
                </tr>
              )}
              {!isLoading && list.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-slate-400">No entries yet.</td>
                </tr>
              )}
              {list.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3 text-sm text-center text-slate-500">{row.i}</td>
                  <td className="px-5 py-3 text-sm font-medium text-slate-800">
                    {editId === row.id ? (
                      <Input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editValue.trim()) edit()
                          if (e.key === 'Escape') setEditId(null)
                        }}
                        className="h-8 max-w-xs text-sm"
                      />
                    ) : (
                      row.districtnm
                    )}
                  </td>
                  <td className="px-5 py-3 text-center">
                    {editId === row.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => editValue.trim() && edit()}
                          disabled={editing}
                          className="text-emerald-500 hover:text-emerald-700 transition-colors disabled:opacity-50"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditId(null)}
                          className="text-slate-400 hover:text-red-500 transition-colors"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => { setEditId(row.id); setEditValue(row.districtnm) }}
                          className="text-amber-500 hover:text-amber-700 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => del(row.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </motion.div>
  )
}
