import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, X, Save, Edit2, Search, Route } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mastersService } from '@/services/masters.service'

const EMPTY: Record<string, string> = {
  serviceFor: '', service_for_id: '', serviceNo: '', fromCity: '', toCity: '',
  viaPlaces: '', parkingAmount: '0', driverOneBeta: '', driverTwoBeta: '',
  helperBeta: '', conductorBeta: '', distance: '', optDriver: '', optHelper: '',
  remarks: '',
}

const amt = (v: any) => <span className="font-medium text-slate-800">{v != null && v !== '' ? `₹${v}` : '—'}</span>

const cols: Column[] = [
  { label: 'Service For', key: 'serviceFor', render: (v) => <Badge variant="info">{String(v ?? '—')}</Badge> },
  { label: 'Service No',  key: 'serviceNo',  render: (v) => <span className="font-bold text-blue-600">{String(v ?? '—')}</span> },
  { label: 'From City',   key: 'fromCity',   render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'To City',     key: 'toCity',     render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'Via Places',  key: 'viaPlaces',  render: (v) => <span className="text-sm text-slate-500">{String(v ?? '—')}</span> },
  { label: 'Parking Amt', key: 'parkingAmount', render: amt },
  { label: 'Driver 1 Beta', key: 'driverOneBeta', render: amt },
  { label: 'Driver 2 Beta', key: 'driverTwoBeta', render: amt },
  { label: 'Helper Beta',   key: 'helperBeta',    render: amt },
  { label: 'Conductor Beta',key: 'conductorBeta', render: amt },
  { label: 'Distance',      key: 'distance', render: (v) => <span className="font-medium">{v != null && v !== '' ? `${v} km` : '—'}</span> },
  { label: 'OPT Driver',    key: 'optDriver', render: amt },
  { label: 'OPT Helper',    key: 'optHelper', render: amt },
]

const R = (label: string, key: string, placeholder: string, required = true) => ({ label, key, placeholder, required })

export default function ServiceNoPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...EMPTY })

  // Filter state
  const [search, setSearch] = useState('')
  const [filterFor, setFilterFor] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedFor, setAppliedFor] = useState('')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const { data: routes, isLoading } = useQuery({ queryKey: ['routes'], queryFn: () => mastersService.getServiceRoutes() })
  const { data: serviceNames } = useQuery({ queryKey: ['service-names'], queryFn: () => mastersService.getServiceNumbers() })

  const serviceNameList: any[] = serviceNames?.data ?? []
  const routeList: any[] = routes?.data ?? []
  const serviceForOptions = [...new Set(routeList.map((r) => r.serviceFor).filter(Boolean))]

  // Client-side filter
  const filtered = useMemo(() => routeList.filter((r) => {
    if (appliedSearch && !String(r.serviceNo ?? '').toLowerCase().includes(appliedSearch.toLowerCase())) return false
    if (appliedFor && r.serviceFor !== appliedFor) return false
    return true
  }), [routeList, appliedSearch, appliedFor])

  const buildPayload = () => ({
    ...form,
    id: editId,
    userid: localStorage.getItem('user_id'),
    usrnm: localStorage.getItem('usr_nm'),
  })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const payload = buildPayload()
      return isEdit
        ? mastersService.updateServiceRoute(payload)   // POST /updateserviceno — plain JSON
        : mastersService.addServiceRoute(payload)      // POST /driverone — encrypted
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success(isEdit ? 'Route updated!' : 'Route added!')
        qc.invalidateQueries({ queryKey: ['routes'] })
        closeForm()
      } else {
        toast.error(res.message ?? 'Failed to save')
      }
    },
    onError: () => toast.error('Server error'),
  })

  const handleEdit = (row: any) => {
    setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, row[k] ?? ''])))
    setIsEdit(true); setEditId(row.id); setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mastersService.deleteServiceRoute({ id }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Route deleted'); qc.invalidateQueries({ queryKey: ['routes'] }) }
      else toast.error('Failed to delete')
    },
    onError: () => toast.error('Server error'),
  })

  const openAdd = () => { setForm({ ...EMPTY }); setIsEdit(false); setEditId(null); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setForm({ ...EMPTY }); setIsEdit(false); setEditId(null) }

  const canSave = form.serviceFor && form.serviceNo && form.fromCity && form.toCity

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex justify-between items-end">
        <PageHeader title="Service Routes" subtitle="Manage service routes, beta amounts and city details" />
        {!showForm && <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Service Number</Button>}
      </div>

      {/* ── Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div key="svc-form" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <GlassCard className="p-6" colorBar={isEdit ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-blue-500'}>

              {/* Header */}
              <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {isEdit
                    ? <><Edit2 className="w-5 h-5 text-amber-500" /> Edit Route: <span className="text-amber-600">{form.serviceNo}</span></>
                    : <><Route className="w-5 h-5 text-indigo-500" /> Add Service Number</>
                  }
                </h2>
                <button onClick={closeForm} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 3-column flat grid — matches screenshot exactly */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                {/* Row 1: Service For | Service No | From */}
                <div>
                  <Label>Service For <span className="text-red-500">*</span></Label>
                  <Select value={form.serviceFor} onChange={(e) => {
                    const found = serviceNameList.find((s) => s.name === e.target.value)
                    setForm((f) => ({ ...f, serviceFor: e.target.value, service_for_id: String(found?.id ?? '') }))
                  }}>
                    <option value="">Select service</option>
                    {serviceNameList.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Service No <span className="text-red-500">*</span></Label>
                  <Input placeholder="Enter service number" value={form.serviceNo} onChange={set('serviceNo')} />
                </div>
                <div>
                  <Label>From <span className="text-red-500">*</span></Label>
                  <Input placeholder="Enter start city" value={form.fromCity} onChange={set('fromCity')} />
                </div>

                {/* Row 2: To | Via | Parking Amount */}
                <div>
                  <Label>To <span className="text-red-500">*</span></Label>
                  <Input placeholder="Enter end city" value={form.toCity} onChange={set('toCity')} />
                </div>
                <div>
                  <Label>Via <span className="text-red-500">*</span></Label>
                  <Input placeholder="Enter via places" value={form.viaPlaces} onChange={set('viaPlaces')} />
                </div>
                <div>
                  <Label>Parking Amount <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="Enter parking amount" value={form.parkingAmount} onChange={set('parkingAmount')} />
                </div>

                {/* Row 3: Driver One Beta | Driver Two Beta | Helper Beta */}
                <div>
                  <Label>Driver One Beta <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="Enter driver one beta" value={form.driverOneBeta} onChange={set('driverOneBeta')} />
                </div>
                <div>
                  <Label>Driver Two Beta <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="Enter driver two beta" value={form.driverTwoBeta} onChange={set('driverTwoBeta')} />
                </div>
                <div>
                  <Label>Helper Beta <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="Enter helper beta" value={form.helperBeta} onChange={set('helperBeta')} />
                </div>

                {/* Row 4: Conductor Beta | Distance | OPT-Driver */}
                <div>
                  <Label>Conductor Beta <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="Enter conductor beta" value={form.conductorBeta} onChange={set('conductorBeta')} />
                </div>
                <div>
                  <Label>Distance <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="Enter distance" value={form.distance} onChange={set('distance')} />
                </div>
                <div>
                  <Label>OPT-Driver <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="Enter opting driver amount" value={form.optDriver} onChange={set('optDriver')} />
                </div>

                {/* Row 5: OPT-Helper | Remarks (textarea, 2 cols) */}
                <div>
                  <Label>OPT-Helper <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="Enter opting helper amount" value={form.optHelper} onChange={set('optHelper')} />
                </div>
                <div className="md:col-span-2">
                  <Label>Remarks <span className="text-red-500">*</span></Label>
                  <textarea
                    rows={3}
                    placeholder="Enter Remarks"
                    value={form.remarks}
                    onChange={set('remarks')}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none"
                  />
                </div>
              </div>

              {/* Action buttons at bottom */}
              <div className="flex gap-3 mt-6">
                <Button onClick={() => save()} disabled={isPending || !canSave}>
                  <Save className="w-4 h-4" />
                  {isPending ? 'Saving…' : isEdit ? 'Update Route' : 'Submit'}
                </Button>
                <Button variant="ghost" onClick={closeForm}>
                  <X className="w-4 h-4" /> Cancel
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter bar ── */}
      <GlassCard className="p-4" colorBar="bg-gradient-to-r from-slate-400 to-slate-500">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label>Search Service No</Label>
            <Input placeholder="e.g. ST-11, F-BHM" value={search} onChange={(e) => setSearch(e.target.value)} className="w-44" />
          </div>
          <div>
            <Label>Service For</Label>
            <Select value={filterFor} onChange={(e) => setFilterFor(e.target.value)} className="w-36">
              <option value="">All</option>
              {serviceForOptions.map((s) => <option key={s as string} value={s as string}>{s as string}</option>)}
            </Select>
          </div>
          <Button onClick={() => { setAppliedSearch(search); setAppliedFor(filterFor) }}>
            <Search className="w-4 h-4" /> Apply Filter
          </Button>
          <button
            onClick={() => { setSearch(''); setFilterFor(''); setAppliedSearch(''); setAppliedFor('') }}
            className="text-xs text-slate-500 hover:text-red-500 font-medium underline"
          >
            Clear
          </button>
          {(appliedSearch || appliedFor) && (
            <span className="text-xs font-semibold text-blue-600">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </GlassCard>

      {/* ── Routes table ── */}
      <DataTable
        title={`Service Routes (${filtered.length})`}
        columns={cols}
        data={filtered}
        loading={isLoading}
        onAction={(action, row) => {
          if (action === 'edit') handleEdit(row)
          if (action === 'delete') del(row.id as number)
        }}
        actions={['edit', 'delete']}
        icon={<Route className="w-5 h-5 text-indigo-500" />}
      />
    </motion.div>
  )
}
