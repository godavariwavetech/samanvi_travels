import { useState } from 'react'
import { motion } from 'motion/react'
import { Factory, Plus, X, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader, ExportMenu } from '@/components/shared'
import { exportRows } from '@/lib/tableExport'
import { mastersService } from '@/services/masters.service'

export default function VehicleCompanyPage() {
  const qc = useQueryClient()
  const [newCompany, setNewCompany] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-companies'],
    queryFn: () => mastersService.getVehicleCompanies(),
  })

  const companies: any[] = data?.data ?? []

  const isDuplicate = (value: string) =>
    companies.some((c: any) => String(c.company_name ?? '').trim().toLowerCase() === value.trim().toLowerCase())
  const handleAdd = () => {
    const trimmed = newCompany.trim()
    if (!trimmed) return
    if (isDuplicate(trimmed)) { toast.error(`Vehicle company "${trimmed}" already exists`); return }
    add()
  }

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: () => mastersService.addVehicleCompany({ company_name: newCompany.trim() }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Vehicle company added!')
        setNewCompany('')
        qc.invalidateQueries({ queryKey: ['vehicle-companies'] })
      } else toast.error(res.message ?? 'Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mastersService.deleteVehicleCompany({ id }),
    onSuccess: () => {
      toast.success('Vehicle company removed')
      qc.invalidateQueries({ queryKey: ['vehicle-companies'] })
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Vehicle Company Master" subtitle="Manage manufacturer/brand names used across the bus fleet" />

      {/* Add new company */}
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
        <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
          <Factory className="w-4 h-4 text-blue-500" /> Add Vehicle Company
        </h3>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-sm">
            <Label>Company Name <span className="text-red-500">*</span></Label>
            <Input
              placeholder="e.g. Ashok Leyland, Volvo, Tata…"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>
          <Button onClick={handleAdd} disabled={adding || !newCompany.trim()}>
            <Plus className="w-4 h-4" /> Add Company
          </Button>
        </div>
      </GlassCard>

      {/* Existing companies */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-slate-700">
            Current Vehicle Companies ({companies.length})
          </h3>
          <ExportMenu
            disabled={companies.length === 0}
            onExport={(format) => exportRows({ title: 'Vehicle Companies', headers: ['Sl No', 'Company Name'], rows: companies.map((c, i) => [i + 1, c.company_name ?? '']), format })}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <p className="text-sm text-slate-400">No vehicle companies yet. Add one above.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {companies.map((c) => (
              <div key={c.id}
                className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 group hover:border-blue-200 hover:bg-blue-50 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <Factory className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span className="text-sm font-semibold text-slate-700 truncate">{c.company_name}</span>
                </div>
                <button
                  onClick={() => del(c.id)}
                  className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </motion.div>
  )
}
