import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { Bus, Save, Plus, X, Edit2, Search, ChevronDown } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mastersService } from '@/services/masters.service'

// ── Vehicle Type picker with inline "add new" ──────────────────────────────
function VehicleTypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [newType, setNewType] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const { data } = useQuery({ queryKey: ['vehicle-types'], queryFn: () => mastersService.getVehicleTypes() })
  const types: any[] = data?.data ?? []

  const openDropdown = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (document.getElementById('vt-panel')?.contains(e.target as Node) ||
          btnRef.current?.contains(e.target as Node)) return
      setOpen(false); setNewType('')
    }
    const onScroll = (e: Event) => {
      if (document.getElementById('vt-panel')?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', onScroll, true) }
  }, [open])

  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUpward = spaceBelow < 320

  const panel = open && rect && createPortal(
    <div id="vt-panel"
      style={{
        position: 'fixed',
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left, width: rect.width, maxHeight: 300, zIndex: 99999,
      }}
      className="rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden"
    >
      <ul className="overflow-y-auto flex-1">
        <li onMouseDown={() => { onChange(''); setOpen(false) }}
          className="px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 cursor-pointer">— None —</li>
        {types.map(t => (
          <li key={t.id}
            onMouseDown={() => { onChange(t.type_name); setOpen(false) }}
            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
              value === t.type_name ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-800 hover:bg-slate-50'
            }`}>
            {t.type_name}
          </li>
        ))}
      </ul>
    </div>,
    document.body
  )

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openDropdown}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm shadow-sm transition-all hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:border-[#2563EB] focus-visible:bg-white"
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {value || 'Select Vehicle Type'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {panel}
    </>
  )
}

const EMPTY_NORMAL = {
  bus_no: '', engine_no: '', chassis_no: '', vehicle_type: '',
  date_of_purchase: '', odometer: '', insurance_validity: '',
  pollution_validity: '', fc_validity: '', base_point_validity: '',
  home_tax_validity: '', atp_validity: '', atp_authentication_validity: '',
  service_out_date: '', remarks: '', ownername: '',
}

const EMPTY_SPARE = { bus_no: '', ownername: '' }

const cols: Column[] = [
  { label: 'Bus No', key: 'bus_no', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
  {
    label: 'Type', key: 'issparetank',
    render: (v) => <Badge variant={v == 1 ? 'warning' : 'teal'}>{v == 1 ? 'Spare Tank' : 'Normal'}</Badge>,
  },
  { label: 'Vehicle Type', key: 'vehicle_type', render: (v) => v ? <Badge variant="info">{String(v)}</Badge> : <span className="text-slate-300">—</span> },
  { label: 'Engine No', key: 'engine_no', render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
  { label: 'Insurance Valid', key: 'insurance_validity', render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
  { label: 'FC Valid', key: 'fc_validity', render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
  { label: 'Odometer', key: 'odometer', render: (v) => <span className="font-semibold">{v ? `${v} km` : '—'}</span> },
  { label: 'Owner', key: 'ownername', render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
]

const today = new Date().toISOString().split('T')[0]

export default function BusNoPage() {
  const qc = useQueryClient()

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [busType, setBusType] = useState<'normal' | 'spare'>('normal')
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [normalForm, setNormalForm] = useState(EMPTY_NORMAL)
  const [spareForm, setSpareForm] = useState(EMPTY_SPARE)

  // Filter state
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [appliedType, setAppliedType] = useState('All')
  const [appliedStatus, setAppliedStatus] = useState('All')

  const setN = (k: keyof typeof EMPTY_NORMAL) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setNormalForm((f) => ({ ...f, [k]: e.target.value }))

  const { data, isLoading } = useQuery({ queryKey: ['buses'], queryFn: () => mastersService.getBuses() })

  // Client-side filtered list
  const busList: any[] = useMemo(() => {
    const all: any[] = data?.data ?? []
    return all.filter((b) => {
      if (appliedSearch && !String(b.bus_no ?? '').toLowerCase().includes(appliedSearch.toLowerCase())) return false
      if (appliedType === 'Normal' && b.issparetank == 1) return false
      if (appliedType === 'Spare Tank' && b.issparetank != 1) return false
      if (appliedStatus === 'Active' && b.d_in != 0) return false
      if (appliedStatus === 'Inactive' && b.d_in == 0) return false
      return true
    })
  }, [data, appliedSearch, appliedType, appliedStatus])

  // Build payload for normal bus
  const buildNormalPayload = () => {
    const uid = localStorage.getItem('user_id') ?? ''
    const unm = localStorage.getItem('usr_nm') ?? ''
    return {
      busno: normalForm.bus_no,
      busnumber: normalForm.bus_no,
      engineno: normalForm.engine_no,
      chassisno: normalForm.chassis_no,
      vehicletype: normalForm.vehicle_type,
      dateofpurchase: normalForm.date_of_purchase,
      odometer: normalForm.odometer,
      insurancevalidity: normalForm.insurance_validity,
      pollutionvalidity: normalForm.pollution_validity,
      fcvalidity: normalForm.fc_validity,
      basepointvalidity: normalForm.base_point_validity,
      hometaxvalidity: normalForm.home_tax_validity,
      atpvalidity: normalForm.atp_validity,
      atpauthenticationvalidity: normalForm.atp_authentication_validity,
      serviceoutdate: normalForm.service_out_date,
      remarks: normalForm.remarks,
      ownername: normalForm.ownername,
      issparetank: 0,
      userid: uid, usrnm: unm, user_id: uid,
      id: editId,
    }
  }

  // Build payload for spare tank bus
  const buildSparePayload = () => {
    const uid = localStorage.getItem('user_id') ?? ''
    const unm = localStorage.getItem('usr_nm') ?? ''
    return {
      busno: spareForm.bus_no,
      busnumber: spareForm.bus_no,
      ownername: spareForm.ownername,
      issparetank: 1,
      engineno: '', chassisno: '', vehicletype: '',
      dateofpurchase: '', odometer: '', insurancevalidity: '',
      pollutionvalidity: '', fcvalidity: '', basepointvalidity: '',
      hometaxvalidity: '', atpvalidity: '', atpauthenticationvalidity: '',
      serviceoutdate: '', remarks: '',
      userid: uid, usrnm: unm, user_id: uid,
      id: editId,
    }
  }

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const payload = busType === 'spare' ? buildSparePayload() : buildNormalPayload()
      return isEdit ? mastersService.updateBus(payload) : mastersService.addBus(payload)
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success(isEdit ? 'Bus updated!' : 'Bus added!')
        qc.invalidateQueries({ queryKey: ['buses'] })
        closeForm()
      } else toast.error('Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const handleEdit = (row: any) => {
    if (row.issparetank == 1) {
      setBusType('spare')
      setSpareForm({ bus_no: row.bus_no ?? '', ownername: row.ownername ?? '' })
    } else {
      setBusType('normal')
      setNormalForm({
        bus_no: row.bus_no ?? '', engine_no: row.engine_no ?? '',
        chassis_no: row.chassis_no ?? '', vehicle_type: row.vehicle_type ?? '',
        date_of_purchase: row.date_of_purchase ?? '', odometer: row.odometer ?? '',
        insurance_validity: row.insurance_validity ?? '', pollution_validity: row.pollution_validity ?? '',
        fc_validity: row.fc_validity ?? '', base_point_validity: row.base_point_validity ?? '',
        home_tax_validity: row.home_tax_validity ?? '', atp_validity: row.atp_validity ?? '',
        atp_authentication_validity: row.atp_authentication_validity ?? '',
        service_out_date: row.service_out_date ?? '', remarks: row.remarks ?? '',
        ownername: row.ownername ?? '',
      })
    }
    setIsEdit(true); setEditId(row.id); setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = (row: any) => {
    mastersService.deleteBus({ id: row.id }).then((res) => {
      if (res.status === 200) { toast.success('Bus removed'); qc.invalidateQueries({ queryKey: ['buses'] }) }
      else toast.error('Failed')
    })
  }

  const openAdd = () => {
    setNormalForm(EMPTY_NORMAL); setSpareForm(EMPTY_SPARE)
    setIsEdit(false); setEditId(null); setBusType('normal'); setShowForm(true)
  }
  const closeForm = () => {
    setShowForm(false); setNormalForm(EMPTY_NORMAL); setSpareForm(EMPTY_SPARE)
    setIsEdit(false); setEditId(null)
  }

  const canSave = busType === 'spare'
    ? !!spareForm.bus_no && !!spareForm.ownername
    : !!normalForm.vehicle_type && !!normalForm.bus_no

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex justify-between items-end">
        <PageHeader title="Bus Number Master" subtitle="Manage the complete bus fleet registry" />
        {!showForm && (
          <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add New Bus</Button>
        )}
      </div>

      {/* ── Add / Edit Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div key="bus-form" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <GlassCard className="p-6" colorBar={isEdit ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}>

              {/* Form header with type toggle */}
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {isEdit
                    ? <><Edit2 className="w-5 h-5 text-amber-500" /> Edit Bus</>
                    : <><Bus className="w-5 h-5 text-blue-500" /> Add New Bus</>
                  }
                </h2>

                <div className="flex items-center gap-3">
                  {/* Type toggle — disabled while editing (type is locked) */}
                  {!isEdit && (
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-semibold">
                      <button
                        onClick={() => setBusType('normal')}
                        className={`px-4 py-2 transition-colors ${busType === 'normal' ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                      >
                        Normal Bus
                      </button>
                      <button
                        onClick={() => setBusType('spare')}
                        className={`px-4 py-2 transition-colors ${busType === 'spare' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}
                      >
                        Spare Tank
                      </button>
                    </div>
                  )}
                  {isEdit && (
                    <Badge variant={busType === 'spare' ? 'warning' : 'teal'}>
                      {busType === 'spare' ? 'Spare Tank' : 'Normal Bus'}
                    </Badge>
                  )}
                  <button onClick={closeForm} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* ── SPARE TANK form (Bus Number + Owner Name only) ── */}
              {busType === 'spare' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label>Bus Number <span className="text-red-500">*</span></Label>
                    <Input placeholder="Enter Bus Number" value={spareForm.bus_no}
                      onChange={(e) => setSpareForm((f) => ({ ...f, bus_no: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Owner Name <span className="text-red-500">*</span></Label>
                    <Input placeholder="Enter Owner Name" value={spareForm.ownername}
                      onChange={(e) => setSpareForm((f) => ({ ...f, ownername: e.target.value }))} />
                  </div>
                </div>
              )}

              {/* ── NORMAL BUS form (full fields) ── */}
              {busType === 'normal' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Row 1 */}
                  <div><Label>Vehicle Type <span className="text-red-500">*</span></Label>
                    <VehicleTypePicker
                      value={normalForm.vehicle_type}
                      onChange={(v) => setNormalForm(f => ({ ...f, vehicle_type: v }))}
                    /></div>
                  <div><Label>Bus Number <span className="text-red-500">*</span></Label>
                    <Input placeholder="Enter Bus Number" value={normalForm.bus_no} onChange={setN('bus_no')} /></div>
                  <div><Label>Engine Number</Label>
                    <Input placeholder="Enter Engine Number" value={normalForm.engine_no} onChange={setN('engine_no')} /></div>

                  {/* Row 2 */}
                  <div><Label>Chassis Number</Label>
                    <Input placeholder="Enter Chassis Number" value={normalForm.chassis_no} onChange={setN('chassis_no')} /></div>
                  <div><Label>Purchase Date</Label>
                    <Input type="date" max={today} value={normalForm.date_of_purchase} onChange={setN('date_of_purchase')} /></div>
                  <div><Label>Odometer <span className="text-red-500">*</span></Label>
                    <Input placeholder="Enter Odometer Reading" type="number" value={normalForm.odometer} onChange={setN('odometer')} /></div>

                  {/* Row 3 */}
                  <div><Label>Insurance Validity <span className="text-red-500">*</span></Label>
                    <Input type="date" value={normalForm.insurance_validity} onChange={setN('insurance_validity')} /></div>
                  <div><Label>Pollution Validity <span className="text-red-500">*</span></Label>
                    <Input type="date" value={normalForm.pollution_validity} onChange={setN('pollution_validity')} /></div>
                  <div><Label>FC Validity <span className="text-red-500">*</span></Label>
                    <Input type="date" value={normalForm.fc_validity} onChange={setN('fc_validity')} /></div>

                  {/* Row 4 */}
                  <div><Label>Base Permit Validity <span className="text-red-500">*</span></Label>
                    <Input type="date" value={normalForm.base_point_validity} onChange={setN('base_point_validity')} /></div>
                  <div><Label>Home Tax Validity <span className="text-red-500">*</span></Label>
                    <Input type="date" value={normalForm.home_tax_validity} onChange={setN('home_tax_validity')} /></div>
                  <div><Label>AITP Validity</Label>
                    <Input type="date" value={normalForm.atp_validity} onChange={setN('atp_validity')} /></div>

                  {/* Row 5 */}
                  <div><Label>AITP Auth. Validity</Label>
                    <Input type="date" value={normalForm.atp_authentication_validity} onChange={setN('atp_authentication_validity')} /></div>
                  <div><Label>Service Out Date</Label>
                    <Input type="date" max={today} value={normalForm.service_out_date} onChange={setN('service_out_date')} /></div>
                  <div><Label>Owner Name</Label>
                    <Input placeholder="Owner name" value={normalForm.ownername} onChange={setN('ownername')} /></div>

                  {/* Row 6 — full-width remarks */}
                  <div className="md:col-span-3">
                    <Label>Remarks</Label>
                    <textarea rows={3} placeholder="Enter Remarks" value={normalForm.remarks}
                      onChange={(e) => setNormalForm((f) => ({ ...f, remarks: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-3 mt-6">
                <Button onClick={() => save()} disabled={isPending || !canSave}>
                  <Save className="w-4 h-4" />
                  {isPending ? 'Saving…' : isEdit ? 'Update Bus' : 'Submit'}
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
            <Label>Search Bus No</Label>
            <Input
              placeholder="e.g. NL02B3154"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-44"
            />
          </div>
          <div>
            <Label>Bus Type</Label>
            <Select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-36">
              <option>All</option>
              <option>Normal</option>
              <option>Spare Tank</option>
            </Select>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-32">
              <option>All</option>
              <option>Active</option>
              <option>Inactive</option>
            </Select>
          </div>
          <Button onClick={() => { setAppliedSearch(search); setAppliedType(filterType); setAppliedStatus(filterStatus) }}>
            <Search className="w-4 h-4" /> Apply Filter
          </Button>
          <button
            onClick={() => {
              setSearch(''); setFilterType('All'); setFilterStatus('All')
              setAppliedSearch(''); setAppliedType('All'); setAppliedStatus('All')
            }}
            className="text-xs text-slate-500 hover:text-red-500 font-medium underline"
          >
            Clear
          </button>
          {(appliedSearch || appliedType !== 'All' || appliedStatus !== 'All') && (
            <span className="text-xs font-semibold text-blue-600 ml-1">
              {busList.length} result{busList.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </GlassCard>

      {/* ── Bus fleet table ── */}
      <DataTable
        title={`Bus Fleet Registry (${busList.length})`}
        columns={cols}
        data={busList}
        loading={isLoading}
        onAction={(action, row) => {
          if (action === 'edit') handleEdit(row)
          if (action === 'delete') handleDelete(row)
        }}
        actions={['edit', 'delete']}
        icon={<Bus className="w-5 h-5 text-blue-500" />}
      />
    </motion.div>
  )
}
