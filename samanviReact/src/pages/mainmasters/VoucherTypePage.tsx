import { useState } from 'react'
import { motion } from 'motion/react'
import { Save, Pencil, X, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader, ExportMenu } from '@/components/shared'
import { exportRows } from '@/lib/tableExport'
import { accountingService } from '@/services/accounting.service'

export default function VoucherTypePage() {
  const qc = useQueryClient()
  const [typeName, setTypeName] = useState('')
  const [editId, setEditId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['voucher-types'],
    queryFn: () => accountingService.getVoucherTypes({}),
  })

  const types: any[] = data?.data ?? []

  const isDuplicate = (value: string, excludeId?: number | null) =>
    types.some((t: any) => t.id !== excludeId && String(t.voucher_type ?? '').trim().toLowerCase() === value.trim().toLowerCase())

  const handleSubmit = () => {
    const trimmed = typeName.trim()
    if (!trimmed) return
    if (isDuplicate(trimmed)) { toast.error(`Voucher type "${trimmed}" already exists`); return }
    submit()
  }

  const handleEditSave = () => {
    const trimmed = editValue.trim()
    if (!trimmed) return
    if (isDuplicate(trimmed, editId)) { toast.error(`Voucher type "${trimmed}" already exists`); return }
    editSave()
  }

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => accountingService.submitVoucherType({
      vouchertype: typeName.trim(),
      user_id: localStorage.getItem('user_id'),
      usr_nm: localStorage.getItem('usr_nm'),
    }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Voucher type added!')
        qc.invalidateQueries({ queryKey: ['voucher-types'] })
        setTypeName('')
      } else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: editSave } = useMutation({
    mutationFn: () => accountingService.editVoucherType({
      id: editId,
      vouchertype: editValue.trim(),
    }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Updated!')
        qc.invalidateQueries({ queryKey: ['voucher-types'] })
        setEditId(null)
        setEditValue('')
      } else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => accountingService.deleteVoucherType({ id }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Deleted')
        qc.invalidateQueries({ queryKey: ['voucher-types'] })
      } else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Voucher Types" subtitle="Configure voucher types for the accounting system" />

      {/* Add form */}
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-purple-500 to-violet-500">
        <div className="flex items-end gap-4">
          <div className="flex-1 max-w-sm">
            <Label>Voucher Type <span className="text-red-500">*</span></Label>
            <Input
              placeholder="Enter Voucher Type"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            />
            {!typeName.trim() && typeName !== '' && (
              <p className="text-xs text-red-500 mt-1">Voucher Type is required</p>
            )}
          </div>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isPending || !typeName.trim()}
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Saving…' : 'Submit'}
          </Button>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <div className="p-4 sm:p-5 bg-white/40 border-b border-slate-100 flex items-center gap-2">
          <h3 className="font-bold text-slate-900 text-base sm:text-lg">Voucher Types</h3>
          <span className="text-xs text-slate-500 font-medium ml-1">
            {isLoading ? 'Loading…' : `${types.length} record${types.length !== 1 ? 's' : ''}`}
          </span>
          <ExportMenu
            className="ml-auto"
            disabled={isLoading || types.length === 0}
            onExport={(format) => exportRows({ title: 'Voucher Types', headers: ['Sl No', 'Voucher Type'], rows: types.map((t, i) => [i + 1, t.voucher_type ?? '']), format })}
          />
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="sticky top-0 z-10 bg-blue-600 text-white">
              <th className="px-5 py-3 text-sm font-bold w-20 text-center">S.No</th>
              <th className="px-5 py-3 text-sm font-bold">Voucher Type</th>
              <th className="px-5 py-3 text-sm font-bold text-center w-32">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading && (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">Loading…</td></tr>
            )}
            {!isLoading && types.length === 0 && (
              <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">No voucher types yet.</td></tr>
            )}
            {types.map((t, idx) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3 text-sm text-center text-slate-500">{idx + 1}</td>
                <td className="px-5 py-3 text-sm">
                  {editId === t.id ? (
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEditSave()}
                      className="h-9 max-w-xs"
                      autoFocus
                    />
                  ) : (
                    <span className="font-medium text-slate-800">{t.voucher_type}</span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  {editId === t.id ? (
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={handleEditSave}
                        className="text-emerald-500 hover:text-emerald-700 transition-colors"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditId(null); setEditValue('') }}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => { setEditId(t.id); setEditValue(t.voucher_type) }}
                        className="text-blue-500 hover:text-blue-700 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => del(t.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </motion.div>
  )
}
