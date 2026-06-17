import { useState } from 'react'
import { motion } from 'motion/react'
import { Wrench, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, TopNavTabs, PageHeader, DynamicRows } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { fuelService } from '@/services/fuel.service'

const tabs = ['Repair Entry', 'Repair Tracking', 'Reports', 'Garage Masters']

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
  const [form, setForm] = useState({ bus_no: '', odometer: '', category: '', priority: 'Medium', driver: '', technician: '', description: '' })
  const [parts, setParts] = useState<PartRow[]>([{ part: '', qty: '1', rate: '' }])

  const { data: entries, isLoading } = useQuery({ queryKey: ['repair-entries'], queryFn: () => garageService.getRepairEntries({}) })
  const { data: buses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })
  const { data: categories } = useQuery({ queryKey: ['repair-cats'], queryFn: () => garageService.getCategories() })
  const { data: partsData } = useQuery({ queryKey: ['repair-parts'], queryFn: () => garageService.getParts() })
  const { data: staffData } = useQuery({ queryKey: ['garage-staff'], queryFn: () => garageService.getStaff() })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })

  const { mutate: addRepair, isPending } = useMutation({
    mutationFn: () => garageService.addRepairEntry({ ...form, parts, user_id: localStorage.getItem('user_id'), usr_nm: localStorage.getItem('usr_nm') }),
    onSuccess: (res) => { if (res.status === 200) { toast.success('Job card created!'); qc.invalidateQueries({ queryKey: ['repair-entries'] }) } else toast.error('Failed') },
    onError: () => toast.error('Server error'),
  })

  const busList: any[] = buses?.data ?? []
  const catList: any[] = categories?.data ?? []
  const partsList: any[] = partsData?.data ?? []
  const staffList: any[] = staffData?.data ?? []
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
                <Select value={form.bus_no} onChange={f('bus_no')}>
                  <option value="">Select Bus</option>
                  {busList.map((b) => <option key={b.id} value={b.bus_no}>{b.bus_no}</option>)}
                </Select></div>
              <div><Label>Odometer</Label><Input type="number" value={form.odometer} onChange={f('odometer')} /></div>
              <div><Label>Repair Category</Label>
                <Select value={form.category} onChange={f('category')}>
                  <option value="">Select Category</option>
                  {catList.map((c) => <option key={c.id} value={c.category_name}>{c.category_name}</option>)}
                </Select></div>
              <div><Label>Priority</Label>
                <Select value={form.priority} onChange={f('priority')}>
                  <option>High</option><option>Medium</option><option>Low</option>
                </Select></div>
              <div><Label>Reported By (Driver)</Label>
                <Select value={form.driver} onChange={f('driver')}>
                  <option value="">Select Driver</option>
                  {staffList.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </Select></div>
              <div><Label>Assigned Technician</Label>
                <Select value={form.technician} onChange={f('technician')}>
                  <option value="">Select Technician</option>
                  {staffList.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                </Select></div>
              <div className="md:col-span-2"><Label>Issue Description</Label><Input placeholder="Describe the problem..." value={form.description} onChange={f('description')} /></div>
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
                    <Select className="flex-[2]" value={r.part} onChange={(e) => setParts(parts.map((p, idx) => idx === i ? { ...p, part: e.target.value } : p))}>
                      <option value="">Select Part</option>
                      {partsList.map((p) => <option key={p.id} value={p.part_name}>{p.part_name}</option>)}
                    </Select>
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
