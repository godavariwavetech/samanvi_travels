import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Save, X, Plus, Edit2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader } from '@/components/shared'
import { mastersService } from '@/services/masters.service'

export default function ServiceForPage() {
  const qc = useQueryClient()

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editRow, setEditRow] = useState<{ id: number; name: string } | null>(null)
  const [name, setName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['service-numbers'],
    queryFn: () => mastersService.getServiceNumbers(),
  })

  const list: any[] = (data?.data ?? []).map((r: any, i: number) => ({ ...r, sno: i + 1 }))

  const openAdd = () => { setEditRow(null); setName(''); setShowModal(true) }
  const openEdit = (row: any) => { setEditRow({ id: row.id, name: row.name }); setName(row.name); setShowModal(true) }
  const closeModal = () => { setShowModal(false); setName(''); setEditRow(null) }

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const uid = localStorage.getItem('user_id') ?? ''
      const unm = localStorage.getItem('usr_nm') ?? ''
      if (editRow) {
        return mastersService.updateServiceNumber({ serviceno: name.trim(), id: editRow.id, userid: uid, usrnm: unm })
      }
      return mastersService.addServiceNumber({ serviceno: name.trim(), userid: uid, usrnm: unm })
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success(editRow ? 'Updated!' : 'Service For added!')
        qc.invalidateQueries({ queryKey: ['service-numbers'] })
        closeModal()
      } else toast.error('Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mastersService.deleteServiceNumber({ index: id }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['service-numbers'] }) }
      else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex justify-between items-end">
        <PageHeader title="Service For" subtitle="Manage service provider types (Samanvi, Flix, Zing, HALT…)" />
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4" /> Add Service For
        </Button>
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-white/40 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-lg">Service For List</h3>
          <span className="text-xs text-slate-500 font-medium">{isLoading ? 'Loading…' : `${list.length} record${list.length !== 1 ? 's' : ''}`}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/60">
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-24 text-center">S.NO</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Service For</th>
                <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400">Loading…</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400">No service types added yet.</td></tr>
              ) : list.map((row) => (
                <tr key={row.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4 text-center text-slate-500 font-medium">{row.sno}</td>
                  <td className="px-6 py-4 font-semibold text-slate-800">{row.name}</td>
                  <td className="px-6 py-4 text-right pr-8">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(row)}
                        className="p-1.5 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 hover:bg-amber-100 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => del(row.id)}
                        className="p-1.5 rounded-lg bg-red-50 border border-red-100 text-red-600 hover:bg-red-100 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7"
            >
              {/* Modal header */}
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-900">
                  {editRow ? 'Edit Service For' : 'Add Service For'}
                </h3>
                <button onClick={closeModal} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Field */}
              <div className="mb-6">
                <Label>Service For <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Enter Service For"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && name.trim() && save()}
                  autoFocus
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => save()}
                  disabled={isPending || !name.trim()}
                  className="flex-1"
                >
                  <Save className="w-4 h-4" />
                  {isPending ? 'Saving…' : 'Submit'}
                </Button>
                <Button variant="ghost" onClick={closeModal} className="flex-1">
                  <X className="w-4 h-4" /> Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
