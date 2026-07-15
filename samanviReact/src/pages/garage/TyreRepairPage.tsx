import { useState } from 'react'
import { motion } from 'motion/react'
import { Wrench, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { mainmastersService } from '@/services/mainmasters.service'
import { fuelService } from '@/services/fuel.service'

const EMPTY_FORM = { repair_date: '', vehicle_number: '', odometer: '', tyre_id: '', repair_type: '', cost: '', vendor_id: '', remarks: '' }

const today = new Date().toISOString().split('T')[0]

function fmtDate(v: any) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function TyreRepairPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({ queryKey: ['tyre-repairs'], queryFn: () => garageService.getTyreRepairs() })
  const { data: tyres, refetch: reloadTyres, isFetching: loadingTyres } = useQuery({ queryKey: ['tyre-inventory'], queryFn: () => garageService.getTyreInventory() })
  const { data: vendors, refetch: reloadVendors, isFetching: loadingVendors } = useQuery({ queryKey: ['tyre-vendors'], queryFn: () => mainmastersService.getTyreVendors() })
  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })

  const list: any[] = data?.data ?? []
  const tyreList: any[] = tyres?.data ?? []
  const vendorList: any[] = vendors?.data ?? []
  const busList: any[] = buses?.data ?? []

  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((s) => ({ ...s, [k]: e.target.value }))
  const setField = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm((s) => ({ ...s, [k]: v }))

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => garageService.addTyreRepair({
      ...form,
      user_id: localStorage.getItem('user_id'),
      usr_nm: localStorage.getItem('usr_nm'),
    }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Repair entry saved!')
        qc.invalidateQueries({ queryKey: ['tyre-repairs'] })
        setForm(EMPTY_FORM)
      } else toast.error('Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const handleDelete = (row: any) => {
    garageService.deleteTyreRepair({ id: row.id }).then((res) => {
      if (res.status === 200) { toast.success('Entry removed'); qc.invalidateQueries({ queryKey: ['tyre-repairs'] }) }
      else toast.error('Failed')
    })
  }

  const cols: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Tyre Code', key: 'tyre_code', filterable: true, render: (v, r: any) => <div><div className="font-bold text-blue-600">{String(v)}</div><div className="text-xs text-slate-500">{r.brand}</div></div> },
    { label: 'Repair Date', key: 'repair_date', align: 'center', filterable: true, render: (v) => <span className="text-sm">{fmtDate(v)}</span> },
    { label: 'Bus No', key: 'vehicle_number', filterable: true, render: (v) => v ? <span className="font-medium">{String(v)}</span> : <span className="text-slate-300">—</span> },
    { label: 'Kms', key: 'odometer', align: 'right', filterable: true, render: (v) => <span className="text-sm">{v ? `${v} km` : '—'}</span> },
    { label: 'Repair Type', key: 'repair_type', filterable: true, render: (v) => <span className="text-slate-700 font-medium">{v || '—'}</span> },
    { label: 'Vendor', key: 'vendor_name', filterable: true, render: (v) => v ? <span className="text-slate-600">{String(v)}</span> : <span className="text-slate-300">—</span> },
    { label: 'Cost', key: 'cost', align: 'right', filterable: true, render: (v) => <span className="font-medium">₹{v}</span> },
    { label: 'Remarks', key: 'remarks', filterable: true, render: (v) => <span className="text-slate-600">{v || '—'}</span> },
  ]

  const canSave = !!form.tyre_id

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Tyre Repair" subtitle="Log punctures and other tyre repairs" />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-rose-500 to-red-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Wrench className="w-5 h-5 text-rose-500" /> New Repair Entry</h2>
          <Button onClick={() => save()} disabled={isPending || !canSave}><Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Save Entry'}</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div><Label>Repair Date</Label><Input type="date" max={today} value={form.repair_date} onChange={f('repair_date')} /></div>
          <div><Label>Bus No</Label>
            <SearchableSelect
              value={form.vehicle_number}
              onChange={setField('vehicle_number')}
              options={busList.map((b: any) => ({ value: b.bus_no, label: b.bus_no }))}
              placeholder="Select Bus"
              onReload={() => reloadBuses()}
              reloading={loadingBuses}
            /></div>
          <div><Label>Kms</Label><Input type="number" placeholder="km" value={form.odometer} onChange={f('odometer')} /></div>
          <div><Label>Select Tyre Number *</Label>
            <SearchableSelect
              value={form.tyre_id}
              onChange={setField('tyre_id')}
              options={tyreList.map((t: any) => ({ value: String(t.id), label: `${t.tyre_code} — ${t.brand}` }))}
              placeholder="Select Tyre"
              onReload={() => reloadTyres()}
              reloading={loadingTyres}
            /></div>
          <div><Label>Repair Type</Label><Input placeholder="e.g. Puncture" value={form.repair_type} onChange={f('repair_type')} /></div>
          <div><Label>Amount (₹)</Label><Input type="number" value={form.cost} onChange={f('cost')} /></div>
          <div><Label>Vendor</Label>
            <SearchableSelect
              value={form.vendor_id}
              onChange={setField('vendor_id')}
              options={vendorList.map((v: any) => ({ value: String(v.id), label: v.vendor_name }))}
              placeholder="Select vendor"
              onReload={() => reloadVendors()}
              reloading={loadingVendors}
            /></div>
          <div className="md:col-span-3"><Label>Remarks</Label><Input value={form.remarks} onChange={f('remarks')} /></div>
        </div>
      </GlassCard>

      <DataTable
        title="Repair History"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={(action, row) => { if (action === 'delete') handleDelete(row) }}
        actions={['delete']}
        icon={<Wrench className="w-5 h-5 text-rose-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
