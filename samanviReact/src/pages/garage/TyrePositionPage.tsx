import { useState } from 'react'
import { motion } from 'motion/react'
import { LayoutGrid, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { fuelService } from '@/services/fuel.service'
import { mainmastersService } from '@/services/mainmasters.service'

const EMPTY_FORM = { vehicle_number: '', position: '', tyre_id: '', odometer_at_fitting: '', fitted_date: '', remarks: '' }

const today = new Date().toISOString().split('T')[0]

export default function TyrePositionPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState(EMPTY_FORM)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({ queryKey: ['tyre-positions'], queryFn: () => garageService.getTyrePositions() })
  const { data: tyres, refetch: reloadTyres, isFetching: loadingTyres } = useQuery({ queryKey: ['tyre-inventory'], queryFn: () => garageService.getTyreInventory() })
  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })
  const { data: positions, refetch: reloadPositions, isFetching: loadingPositions } = useQuery({ queryKey: ['tyre-positions-master'], queryFn: () => mainmastersService.getTyrePositionsMaster() })

  const list: any[] = data?.data ?? []
  const busList: any[] = buses?.data ?? []
  const positionList: any[] = positions?.data ?? []
  const inStockTyres: any[] = (tyres?.data ?? []).filter((t: any) => t.status === 'In Stock')

  const f = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }))
  const setField = (k: keyof typeof EMPTY_FORM) => (v: string) => setForm((s) => ({ ...s, [k]: v }))

  const { mutate: assign, isPending } = useMutation({
    mutationFn: () => garageService.assignTyrePosition({
      ...form,
      user_id: localStorage.getItem('user_id'),
      usr_nm: localStorage.getItem('usr_nm'),
    }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Tyre mounted!')
        qc.invalidateQueries({ queryKey: ['tyre-positions'] })
        qc.invalidateQueries({ queryKey: ['tyre-inventory'] })
        setForm(EMPTY_FORM)
      } else toast.error('Failed to assign')
    },
    onError: () => toast.error('Server error'),
  })

  const handleUnmount = (row: any) => {
    garageService.removeTyrePosition({ id: row.id, tyre_id: row.tyre_id, removed_date: today }).then((res) => {
      if (res.status === 200) {
        toast.success('Tyre unmounted')
        qc.invalidateQueries({ queryKey: ['tyre-positions'] })
        qc.invalidateQueries({ queryKey: ['tyre-inventory'] })
      } else toast.error('Failed')
    })
  }

  const cols: Column[] = [
    { label: 'Vehicle', key: 'vehicle_number', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Position', key: 'position', filterable: true, render: (v) => <Badge variant="purple">{String(v)}</Badge> },
    { label: 'Tyre Code', key: 'tyre_code', filterable: true, render: (v, r: any) => <div><div className="font-semibold">{String(v)}</div><div className="text-xs text-slate-500">{r.brand}</div></div> },
    { label: 'Fitted Date', key: 'fitted_date', align: 'center', render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
    { label: 'Odometer at Fitting', key: 'odometer_at_fitting', align: 'right', render: (v) => <span className="text-sm">{v ? `${v} km` : '—'}</span> },
  ]

  const canAssign = !!form.vehicle_number && !!form.position && !!form.tyre_id

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Tyre Position" subtitle="Mount tyres from inventory onto vehicle wheel positions" />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-blue-500" /> Mount Tyre</h2>
          <Button onClick={() => assign()} disabled={isPending || !canAssign}><Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Mount Tyre'}</Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div><Label>Vehicle Number *</Label>
            <SearchableSelect
              value={form.vehicle_number}
              onChange={setField('vehicle_number')}
              options={busList.map((b) => ({ value: b.bus_no, label: b.bus_no }))}
              placeholder="Select Bus"
              onReload={() => reloadBuses()}
              reloading={loadingBuses}
            /></div>
          <div><Label>Position *</Label>
            <SearchableSelect
              value={form.position}
              onChange={setField('position')}
              options={positionList.map((p) => ({ value: p.position_name, label: p.position_name }))}
              placeholder="Select Position"
              onReload={() => reloadPositions()}
              reloading={loadingPositions}
            /></div>
          <div><Label>Tyre (In Stock) *</Label>
            <SearchableSelect
              value={form.tyre_id}
              onChange={setField('tyre_id')}
              options={inStockTyres.map((t) => ({ value: String(t.id), label: `${t.tyre_code} — ${t.brand}` }))}
              placeholder="Select Tyre"
              onReload={() => reloadTyres()}
              reloading={loadingTyres}
            /></div>
          <div><Label>Odometer at Fitting</Label><Input type="number" placeholder="km" value={form.odometer_at_fitting} onChange={f('odometer_at_fitting')} /></div>
          <div><Label>Fitted Date</Label><Input type="date" max={today} value={form.fitted_date} onChange={f('fitted_date')} /></div>
          <div><Label>Remarks</Label><Input value={form.remarks} onChange={f('remarks')} /></div>
        </div>
      </GlassCard>

      <DataTable
        title="Active Tyre Positions"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={(action, row) => { if (action === 'delete') handleUnmount(row) }}
        actions={['delete']}
        icon={<LayoutGrid className="w-5 h-5 text-blue-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
