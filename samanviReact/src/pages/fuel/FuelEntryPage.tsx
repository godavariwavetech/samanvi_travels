import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Fuel, Save, Plus, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, TopNavTabs, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'
import { mastersService } from '@/services/masters.service'

const tabs = ['Fuel Entry', 'Fuel Target', 'Approved Reports']

const entryColumns: Column[] = [
  {
    label: 'Bus / Date', key: 'vehicle_number',
    render: (v, r: any) => <div><div className="font-bold">{String(v ?? '—')}</div><div className="text-xs text-slate-500">{r.date}</div></div>,
  },
  { label: 'Driver', key: 'driver1' },
  { label: 'Service', key: 'service_number' },
  { label: 'Litres', key: 'quantity_filled', render: (v) => <span className="font-bold text-blue-600">{v} L</span> },
  { label: 'Amount (₹)', key: 'total_bill', render: (v) => <span className="font-bold">₹{v}</span> },
  { label: 'KM Reading', key: 'present_odometer' },
  { label: 'Avg km/L', key: 'avg_kmpl', render: (v) => v ? <span className="font-medium text-emerald-600">{String(v)} km/L</span> : <span className="text-slate-400">—</span> },
  {
    label: 'Status', key: 'admin_status',
    render: (v) => <Badge variant={v == 1 ? 'success' : v == 2 ? 'danger' : 'warning'}>
      {v == 1 ? 'Approved' : v == 2 ? 'Rejected' : 'Pending'}
    </Badge>,
  },
]

const today = new Date().toISOString().split('T')[0]

export default function FuelEntryPage() {
  const [tab, setTab] = useState('Fuel Entry')
  const qc = useQueryClient()

  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    vehicleNumber: '', qtyFilled: '', pricePerLitre: '', totalBill: '',
    presentOdometer: '', driver1: '', serviceNumber: '', named: '',
    patientsTstdts: [{ d_test_name: 'Fuel Expense', d_test_amount: '0' }],
    creditaddrowdts: [{ creditname: 'Cash', creditamount: '0' }],
  })

  const { data: entries, isLoading } = useQuery({
    queryKey: ['fuel-entries'],
    queryFn: () => fuelService.getFuelEntries(),
  })

  const { data: buses } = useQuery({
    queryKey: ['buses'],
    queryFn: () => mastersService.getBuses(),
  })

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () =>
      fuelService.submitFuelEntry({
        ...form,
        patientsTstdts: [{ d_test_name: 'Fuel Expense', d_test_amount: form.totalBill || '0' }],
        creditaddrowdts: [{ creditname: 'Cash', creditamount: form.totalBill || '0' }],
        named: localStorage.getItem('usr_nm') ?? '',
        user_id: localStorage.getItem('user_id'),
      }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Fuel entry saved!')
        qc.invalidateQueries({ queryKey: ['fuel-entries'] })
        setForm({ date: new Date().toISOString().split('T')[0], vehicleNumber: '', qtyFilled: '', pricePerLitre: '', totalBill: '', presentOdometer: '', driver1: '', serviceNumber: '', named: '', patientsTstdts: [{ d_test_name: 'Fuel Expense', d_test_amount: '0' }], creditaddrowdts: [{ creditname: 'Cash', creditamount: '0' }] })
      } else toast.error(res.message ?? 'Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const handleAction = (action: string, row: any) => {
    if (action === 'delete') {
      fuelService.deleteFuelEntry({ id: row.id }).then(() => {
        toast.success('Entry deleted')
        qc.invalidateQueries({ queryKey: ['fuel-entries'] })
      })
    }
  }

  const [showForm, setShowForm] = useState(false)
  const busList: any[] = buses?.data ?? []
  const entryList: any[] = entries?.data ?? []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Fuel Management" subtitle="Track daily fuel consumption across the fleet" />
      <TopNavTabs tabs={tabs} activeTab={tab} onChange={(t) => { setTab(t); setShowForm(false) }} />

      {tab === 'Fuel Entry' && (
        <>
          <div className="flex justify-end">
            {!showForm && <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Log Fuel</Button>}
          </div>

          <AnimatePresence>
            {showForm && (
              <motion.div key="fuel-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
          <GlassCard className="p-6" colorBar="bg-gradient-to-r from-amber-400 to-orange-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-500" /> Log Fuel Fill
              </h2>
              <div className="flex gap-2">
              <Button onClick={() => submit()} disabled={isPending}>
                <Save className="w-4 h-4" />
                {isPending ? 'Saving…' : 'Save Entry'}
              </Button>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div><Label>Date</Label>
                <Input type="date" max={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
              <div><Label>Bus Number</Label>
                <Select value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}>
                  <option value="">Select Bus</option>
                  {busList.map((b) => <option key={b.id} value={b.bus_no}>{b.bus_no}</option>)}
                </Select></div>
              <div><Label>Service Number</Label>
                <Input placeholder="e.g. ST-11" value={form.serviceNumber} onChange={(e) => setForm({ ...form, serviceNumber: e.target.value })} /></div>
              <div><Label>Driver Name</Label>
                <Input placeholder="Driver name" value={form.driver1} onChange={(e) => setForm({ ...form, driver1: e.target.value })} /></div>
              <div><Label>Qty Filled (L)</Label>
                <Input type="number" placeholder="e.g. 120" value={form.qtyFilled} onChange={(e) => setForm({ ...form, qtyFilled: e.target.value })} /></div>
              <div><Label>Price / Litre (₹)</Label>
                <Input type="number" placeholder="e.g. 98.50" value={form.pricePerLitre} onChange={(e) => setForm({ ...form, pricePerLitre: e.target.value })} /></div>
              <div><Label>Total Bill (₹)</Label>
                <Input type="number" placeholder="e.g. 11820" value={form.totalBill} onChange={(e) => setForm({ ...form, totalBill: e.target.value })} /></div>
              <div><Label>Present Odometer (km)</Label>
                <Input type="number" placeholder="Current KM reading" value={form.presentOdometer} onChange={(e) => setForm({ ...form, presentOdometer: e.target.value })} /></div>
            </div>
          </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          <DataTable
            title="Fuel Entry Records"
            columns={entryColumns}
            data={entryList}
            loading={isLoading}
            onAction={handleAction}
          />
        </>
      )}
    </motion.div>
  )
}
