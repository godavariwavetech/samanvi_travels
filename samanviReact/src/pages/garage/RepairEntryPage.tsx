import { useState } from 'react'
import { motion } from 'motion/react'
import { Wrench, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, TopNavTabs, PageHeader, DynamicRows, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { fuelService } from '@/services/fuel.service'

const tabs = ['Repair Entry', 'Repair Tracking', 'Reports']

const repairColumns: Column[] = [
  { label: 'Job Card', key: 'job_card_no', render: (v, r: any) => <div><div className="font-bold">{String(v)}</div><div className="text-xs text-blue-600">{r.bus_no}</div></div> },
  { label: 'Category', key: 'category' },
  { label: 'Issue', key: 'description', render: (v) => <div className="text-xs max-w-xs truncate">{String(v)}</div> },
  { label: 'Priority', key: 'priority', render: (v) => <Badge variant={v === 'High' ? 'danger' : 'warning'}>{String(v)}</Badge> },
  { label: 'Amount', key: 'total_amount', render: (v) => <span className="font-bold">₹{v}</span> },
  { label: 'Status', key: 'status', render: (v) => <span className="text-sm font-medium text-slate-700">{String(v)}</span> },
]

interface PartRow { part: string; qty: string; rate: string }

export default function RepairEntryPage() {
  const [tab, setTab] = useState('Repair Entry')
  const qc = useQueryClient()
  const [form, setForm] = useState({ bus_no: '', odometer: '', category: '', priority: 'Medium', driver: '', technician: '', description: '', repeat: false, repeat_date: '' })
  const [parts, setParts] = useState<PartRow[]>([{ part: '', qty: '1', rate: '' }])

  const { data: entries, isLoading } = useQuery({ queryKey: ['repair-entries'], queryFn: () => garageService.getRepairEntries({}) })
  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })
  const { data: categories, refetch: reloadCats, isFetching: loadingCats } = useQuery({ queryKey: ['repair-cats'], queryFn: () => garageService.getCategories() })
  const { data: partsData, refetch: reloadParts, isFetching: loadingParts } = useQuery({ queryKey: ['repair-parts'], queryFn: () => garageService.getParts() })
  const { data: staffData, refetch: reloadStaff, isFetching: loadingStaff } = useQuery({ queryKey: ['garage-staff'], queryFn: () => garageService.getStaff() })
  const { data: driversData, refetch: reloadDrivers, isFetching: loadingDrivers } = useQuery({ queryKey: ['garage-drivers'], queryFn: () => garageService.getDriversList() })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })
  const setField = (k: string) => (v: string) => setForm((s) => ({ ...s, [k]: v }))

  const { mutate: addRepair, isPending } = useMutation({
    mutationFn: () => garageService.addRepairEntry({
      vehicle_number: form.bus_no,
      odometer_reading: form.odometer,
      repair_category_id: form.category,
      priority: form.priority,
      reported_driver_id: form.driver,
      remarks: form.description,
      assigned_to: form.technician,
      is_repeated_job: form.repeat ? 1 : 0,
      next_job_date: form.repeat_date || null,
      parts,
      user_id: localStorage.getItem('user_id'),
      usr_nm: localStorage.getItem('usr_nm'),
    }),
    onSuccess: (res) => { if (res.status === 200) { toast.success('Job card created!'); qc.invalidateQueries({ queryKey: ['repair-entries'] }) } else toast.error('Failed') },
    onError: () => toast.error('Server error'),
  })

  const busList: any[] = buses?.data ?? []
  const catList: any[] = categories?.data ?? []
  const partsList: any[] = partsData?.data ?? []
  const staffList: any[] = staffData?.data ?? []
  const driverList: any[] = driversData?.data ?? []
  const entryList: any[] = entries?.data ?? []

  const total = parts.reduce((s, p) => s + (parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0), 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Garage & Maintenance" subtitle="Manage vehicle repairs, parts and job cards" />
      <TopNavTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === 'Repair Entry' && (
        <>
          <GlassCard className="p-6" colorBar="bg-gradient-to-r from-orange-500 to-amber-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Wrench className="w-5 h-5 text-amber-500" /> Log Vehicle Repair</h2>
              <Button onClick={() => addRepair()} disabled={isPending}><Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Generate Job Card'}</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
              <div><Label>Vehicle Number</Label>
                <SearchableSelect
                  value={form.bus_no}
                  onChange={setField('bus_no')}
                  options={busList.map((b) => ({ value: b.bus_no, label: b.bus_no }))}
                  placeholder="Select Bus"
                  onReload={() => reloadBuses()}
                  reloading={loadingBuses}
                /></div>
              <div><Label>Odometer</Label><Input type="number" value={form.odometer} onChange={f('odometer')} /></div>
              <div><Label>Repair Category</Label>
                <SearchableSelect
                  value={form.category}
                  onChange={setField('category')}
                  options={catList.map((c) => ({ value: String(c.id), label: c.name }))}
                  placeholder="Select Category"
                  onReload={() => reloadCats()}
                  reloading={loadingCats}
                /></div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onChange={f('priority')}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </Select></div>
              <div><Label>Reported By (Driver)</Label>
                <SearchableSelect
                  value={form.driver}
                  onChange={setField('driver')}
                  options={driverList.map((d) => ({ value: String(d.id), label: d.driver_name || d.nickname || '' }))}
                  placeholder="Select Driver"
                  onReload={() => reloadDrivers()}
                  reloading={loadingDrivers}
                /></div>
              <div><Label>Assigned Technician</Label>
                <SearchableSelect
                  value={form.technician}
                  onChange={setField('technician')}
                  options={staffList.map((s) => ({ value: String(s.id), label: s.fullName || s.nickName || '' }))}
                  placeholder="Select Technician"
                  onReload={() => reloadStaff()}
                  reloading={loadingStaff}
                /></div>
              <div className="md:col-span-2"><Label>Issue Description</Label><Input placeholder="Describe the problem..." value={form.description} onChange={f('description')} /></div>
              <div className="flex flex-col justify-center gap-2">
                <Label>&nbsp;</Label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-amber-500"
                    checked={form.repeat}
                    onChange={(e) => setForm((s) => ({ ...s, repeat: e.target.checked, repeat_date: e.target.checked ? s.repeat_date : '' }))}
                  />
                  <span className="text-sm font-medium text-slate-700">Repeat Job</span>
                </label>
              </div>
              {form.repeat && (
                <div>
                  <Label>Repeat On Date</Label>
                  <Input type="date" value={form.repeat_date} onChange={f('repeat_date')} min={new Date().toISOString().split('T')[0]} />
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Spare Parts Consumed</h3>
                <span className="text-sm font-bold text-slate-700">Total: ₹{total.toLocaleString('en-IN')}</span>
              </div>
              <DynamicRows
                columns={['Part Name', 'Qty', 'Rate (₹)', 'Total']}
                rows={parts}
                onAdd={() => setParts([...parts, { part: '', qty: '1', rate: '' }])}
                onRemove={(i) => setParts(parts.filter((_, idx) => idx !== i))}
                renderRow={(r, i) => (
                  <>
                    <SearchableSelect
                      className="flex-[2]"
                      value={r.part}
                      onChange={(v) => setParts(parts.map((p, idx) => idx === i ? { ...p, part: v } : p))}
                      options={partsList.map((p) => ({ value: p.part_name, label: p.part_name }))}
                      placeholder="Select Part"
                      onReload={() => reloadParts()}
                      reloading={loadingParts}
                    />
                    <Input className="flex-1 text-center" type="number" value={r.qty} onChange={(e) => setParts(parts.map((p, idx) => idx === i ? { ...p, qty: e.target.value } : p))} />
                    <Input className="flex-1 text-right" type="number" value={r.rate} onChange={(e) => setParts(parts.map((p, idx) => idx === i ? { ...p, rate: e.target.value } : p))} />
                    <Input className="flex-1 text-right bg-slate-100 font-bold" disabled value={((parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0)).toLocaleString('en-IN')} />
                  </>
                )}
              />
            </div>
          </GlassCard>
          <DataTable title="Active Job Cards" columns={repairColumns} data={entryList} loading={isLoading} onAction={() => {}} />
        </>
      )}
    </motion.div>
  )
}
