import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Bus, Save, Plus, X, Edit2, Upload, Download, FileSpreadsheet, History, Clock, LogOut } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, ExcelImportPreviewModal, MasterListPicker, SearchableSelect } from '@/components/shared'
import type { ExcelPreviewRow } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mastersService } from '@/services/masters.service'
import { accountingService } from '@/services/accounting.service'
import ChangeNote from '@/components/shared/ChangeNote'
import { excelCellToISODate, headerRowMismatch, isVanVehicleType } from '@/lib/utils'
import * as XLSX from 'xlsx'

// ── Sold Out / Service Out modal ───────────────────────────────────────────
function ServiceOutModal({ bus, onConfirm, onClose, isPending }: {
  bus: any
  onConfirm: (date: string, reason: string) => void
  onClose: () => void; isPending: boolean
}) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg">Mark Sold / Out of Service</h3>
            <p className="text-sm text-slate-500">Bus <span className="font-semibold text-red-600">{bus?.bus_no}</span> will move out of the active fleet</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Date <span className="text-red-500">*</span></Label>
            <Input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Description <span className="text-red-500">*</span></Label>
            <textarea rows={4} placeholder="Sold to…, Accident total loss, Scrapped…" value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button variant="danger" onClick={() => onConfirm(date, reason)} disabled={isPending || !reason.trim() || !date} className="flex-1">
            <LogOut className="w-4 h-4" />{isPending ? 'Saving…' : 'Confirm'}
          </Button>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </motion.div>
    </div>
  )
}

const EMPTY_NORMAL = {
  bus_no: '', engine_no: '', chassis_no: '', vehicle_type: '',
  luxury_type: '', seating_capacity: '', chassis_make: '', body_made: '', chassis_model: '', mfg_year: '',
  date_of_purchase: '', reg_date: '', odometer: '', insurance_validity: '',
  pollution_validity: '', fc_validity: '', base_point_validity: '',
  home_tax_validity: '', atp_validity: '', atp_authentication_validity: '',
  service_out_date: '', remarks: '', ownername: '',
}

const EMPTY_SPARE = { bus_no: '', ownername: '' }
// A hired vehicle is a bus or a van like any other: Trip Creation's Van tab
// lists only vehicles marked VAN, so the Hire form has to say which it is or a
// hired van never appears there.
const EMPTY_HIRE = { bus_no: '', owner_ledger_id: '', ownername: '', vehicle_type: 'BUS' }
// The hire-bus group: owner ledgers live under EQUITIES AND LIABILITIES >
// 3) CURRENT LIABILITIES > Payables > Hire Vehicles, which already holds the
// real owners on the live chart of accounts.
const HIRE_GROUP = 'Hire Vehicles'

function fmtDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return String(d)
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Kolkata' })
}

function fmtDateTime(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return String(d)
  return dt.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })
}

const dateCol = (label: string, key: string): Column => ({
  label, key, filterable: true, render: (v) => <span className="text-sm whitespace-nowrap">{fmtDate(v)}</span>,
})

function buildCols(onServiceOut: (row: any) => void): Column[] {
  return [
  { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
  {
    label: 'Bus No', key: 'bus_no', filterable: true,
    render: (v) => <span className="font-bold text-blue-600 whitespace-nowrap">{String(v)}</span>,
  },
  {
    label: 'Type', key: 'typeLabel', filterable: true,
    render: (v) => <Badge variant={v === 'Spare Tank' ? 'warning' : v === 'Hire Bus' ? 'purple' : 'teal'}>{String(v)}</Badge>,
  },
  {
    label: 'Vehicle Type', key: 'vehicle_type', filterable: true,
    render: (v) => v ? <Badge variant="info">{String(v)}</Badge> : <span className="text-slate-300">—</span>,
  },
  {
    label: 'Chassis Make', key: 'chassis_make', filterable: true,
    render: (v) => v ? <Badge variant="purple">{String(v)}</Badge> : <span className="text-slate-300">—</span>,
  },
  {
    label: 'Luxury Type', key: 'luxury_type', filterable: true,
    render: (v) => v ? <Badge variant="slate">{String(v)}</Badge> : <span className="text-slate-300">—</span>,
  },
  {
    label: 'Seats', key: 'seating_capacity', filterable: true,
    render: (v) => v ? <span className="font-semibold">{String(v)}</span> : <span className="text-slate-300">—</span>,
  },
  { label: 'Chassis No', key: 'chassis_no', filterable: true, render: (v) => <span className="text-sm whitespace-nowrap">{String(v ?? '—')}</span> },
  { label: 'Chassis Model', key: 'chassis_model', filterable: true, render: (v) => <span className="text-sm whitespace-nowrap">{String(v ?? '—')}</span> },
  { label: 'Body Made', key: 'body_made', filterable: true, render: (v) => <span className="text-sm whitespace-nowrap">{String(v ?? '—')}</span> },
  { label: 'Mfg Year', key: 'mfg_year', filterable: true, render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
  { label: 'Engine No', key: 'engine_no', filterable: true, render: (v) => <span className="text-sm whitespace-nowrap">{String(v ?? '—')}</span> },
  { label: 'Odometer', key: 'odometer', filterable: true, render: (v) => <span className="font-semibold whitespace-nowrap">{v ? `${v} km` : '—'}</span> },
  dateCol('Purchase Date', 'date_of_purchase'),
  dateCol('Registration Date', 'reg_date'),
  dateCol('Insurance Valid', 'insurance_validity'),
  dateCol('PUCC Valid', 'pollution_validity'),
  dateCol('Fitness Valid', 'fc_validity'),
  dateCol('Permit Valid', 'base_point_validity'),
  dateCol('Home Tax Valid', 'home_tax_validity'),
  dateCol('AITP Valid', 'atp_validity'),
  dateCol('Authorization Valid', 'atp_authentication_validity'),
  dateCol('Service Out Date', 'service_out_date'),
  {
    label: 'Owner', key: 'ownername', filterable: true,
    render: (v) => <span className="text-sm whitespace-nowrap">{String(v ?? '—')}</span>,
  },
  { label: 'Remarks', key: 'remarks', render: (v) => <span className="text-sm max-w-xs truncate block">{String(v ?? '—')}</span> },
  {
    label: 'Fleet Status', key: '_serviceOut', align: 'center',
    render: (_v, row: any) => (
      <button
        onClick={() => onServiceOut(row)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border-red-100 transition-colors whitespace-nowrap"
      >
        <LogOut className="w-3.5 h-3.5" /> Service Out
      </button>
    ),
  },
  ]
}

const today = new Date().toISOString().split('T')[0]

// Column order mirrors the "Add New Vehicle" (Normal Bus) form field order exactly.
const BUS_TEMPLATE_HEADERS = [
  'Vehicle Type*', 'Luxury Type', 'Seating Capacity', 'Chassis Make', 'Chassis Model',
  'Body Made', 'Mfg Year', 'Engine No', 'Chassis No', 'Purchase Date (YYYY-MM-DD)',
  'Bus No*', 'Odometer (km)', 'Registration Date (YYYY-MM-DD)',
  'Fitness Validity (YYYY-MM-DD)', 'Home Tax Validity (YYYY-MM-DD)',
  'Insurance Validity (YYYY-MM-DD)', 'Pollution Validity (YYYY-MM-DD)',
  'Permit Validity (YYYY-MM-DD)', 'AITP Validity (YYYY-MM-DD)',
  'Authorization Validity (YYYY-MM-DD)', 'Service Out Date (YYYY-MM-DD)',
  'Owner Name', 'Remarks', 'Is Spare Tank (0=Normal,1=Spare)',
  // Without these two an imported vehicle was always a plain own one: there was
  // no way to bring in a hired bus or van, or say whose ledger it is paid to.
  'Category (normal/hire)', 'Owner Ledger (hire only)',
]

// Vehicle Type* is what separates a bus from a van across the app, so the Van
// sheet fixes it to VAN rather than leaving it to be typed, and drops the
// bus-shaped body columns nobody fills in for a van.
const VAN_TEMPLATE_HEADERS = [
  'Vehicle Type*', 'Seating Capacity', 'Engine No', 'Chassis No',
  'Purchase Date (YYYY-MM-DD)', 'Van No*', 'Odometer (km)', 'Registration Date (YYYY-MM-DD)',
  'Fitness Validity (YYYY-MM-DD)', 'Insurance Validity (YYYY-MM-DD)', 'Pollution Validity (YYYY-MM-DD)',
  'Owner Name', 'Remarks', 'Category (normal/hire)', 'Owner Ledger (hire only)',
]

function downloadExcel(data: any[][], filename: string) {
  const ws = XLSX.utils.aoa_to_sheet(data)
  ws['!cols'] = data[0].map((_: any, i: number) => ({ wch: Math.max(...data.map(r => String(r[i] ?? '').length)) + 4 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function BusNoPage() {
  const qc = useQueryClient()

  const [showForm, setShowForm] = useState(false)
  const [busType, setBusType] = useState<'normal' | 'spare' | 'hire'>('normal')
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [normalForm, setNormalForm] = useState(EMPTY_NORMAL)
  const [spareForm, setSpareForm] = useState(EMPTY_SPARE)
  const [hireForm, setHireForm] = useState(EMPTY_HIRE)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [historyModal, setHistoryModal] = useState<{ open: boolean; bus: any }>({ open: false, bus: null })
  const [serviceOutBus, setServiceOutBus] = useState<any | null>(null)

  const cols = useMemo(() => buildCols((row) => setServiceOutBus(row)), [])

  const { data: historyData, isLoading: loadingHistory } = useQuery({
    queryKey: ['bus-history', historyModal.bus?.id],
    queryFn: () => mastersService.getBusHistory({ bus_id: historyModal.bus?.id }),
    enabled: historyModal.open && !!historyModal.bus?.id,
  })
  const historyList: any[] = historyData?.data ?? []

  const uploadRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showForm) return
    const raf = requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // Native inputs reliably show a focus ring after a mouse click; the custom
      // dropdown buttons rely on :focus-visible, which browsers suppress post-click.
      const target = formRef.current?.querySelector<HTMLElement>('input, select, textarea')
        ?? formRef.current?.querySelector<HTMLElement>('button[type="button"]')
      target?.focus()
    })
    return () => cancelAnimationFrame(raf)
  }, [showForm, editId, busType])

  const setN = (k: keyof typeof EMPTY_NORMAL) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setNormalForm((f) => ({ ...f, [k]: e.target.value }))

  const { data, isLoading } = useQuery({ queryKey: ['buses'], queryFn: () => mastersService.getBuses() })
  // Owner ledgers for the Hire Bus form, plus the container to create new ones under.
  const { data: ledgerData, refetch: reloadLedgers } = useQuery({
    queryKey: ['expense-trip-ledgers'], queryFn: () => accountingService.getExpenseTripLedger(),
  })
  const { data: subchildData } = useQuery({
    queryKey: ['ledger-subchild-containers'], queryFn: () => accountingService.getMainMastersSubchild(),
  })
  const hireLedgers: any[] = (ledgerData?.data ?? []).filter((l: any) => String(l.subchildtwo ?? '') === HIRE_GROUP)
  const hireLedgerOptions = hireLedgers.map((l: any) => ({ value: String(l.ledger_id), label: String(l.temple_name ?? '') }))
  const hireContainer = (subchildData?.data ?? []).find(
    (c: any) => String(c.temple_name ?? '') === HIRE_GROUP && String(c.child ?? '') === 'Payables')
  const [newOwner, setNewOwner] = useState('')
  const [addingOwner, setAddingOwner] = useState(false)
  // Create an owner ledger straight from the form rather than sending the user
  // to the Ledger master and back; it is selected into the row on success.
  const createOwnerLedger = async () => {
    const name = newOwner.trim()
    if (!name) return
    if (!hireContainer) { toast.error(`No "${HIRE_GROUP}" group found under Payables — it is seeded on server start`); return }
    setAddingOwner(true)
    try {
      const res: any = await accountingService.addLedgerData({
        temple_name: name, amount: 0, parent_level: 4,
        parent_subgroup_id: hireContainer.village_id, parent_subchild_id: hireContainer.id,
        district_id: hireContainer.district_id, staticname: hireContainer.staticentry,
        mandal_id: hireContainer.mandal_id, mandal_name: hireContainer.mandal_name,
        village_id: hireContainer.village_id, child: hireContainer.child,
        subchildtwo: hireContainer.temple_name,
        user_id: localStorage.getItem('user_id'), entry_by: localStorage.getItem('usr_nm'),
      })
      if (res?.status !== 200) { toast.error(res?.message ?? 'Failed to create ledger'); return }
      const fresh = await reloadLedgers()
      const made = (fresh.data?.data ?? []).find((l: any) => String(l.temple_name ?? '') === name)
      setHireForm((f) => ({ ...f, owner_ledger_id: made ? String(made.ledger_id) : '', ownername: name }))
      setNewOwner('')
      toast.success(`Ledger "${name}" created under ${HIRE_GROUP}`)
    } finally { setAddingOwner(false) }
  }

  const busList: any[] = useMemo(() =>
    (data?.data ?? []).map((b: any) => ({
      ...b,
      typeLabel: b.issparetank == 1 ? 'Spare Tank' : b.bus_category === 'hire' ? 'Hire Bus' : 'Normal',
    }))
  , [data])

  const buildNormalPayload = () => {
    const uid = localStorage.getItem('user_id') ?? ''
    const unm = localStorage.getItem('usr_nm') ?? ''
    return {
      // `company` is deliberately absent: this form doesn't show it, and the
      // update only writes the keys it receives.
      busno: normalForm.bus_no, busnumber: normalForm.bus_no,
      engineno: normalForm.engine_no, chassisno: normalForm.chassis_no,
      vehicletype: normalForm.vehicle_type, dateofpurchase: normalForm.date_of_purchase,
      odometer: normalForm.odometer, insurancevalidity: normalForm.insurance_validity,
      pollutionvalidity: normalForm.pollution_validity, fcvalidity: normalForm.fc_validity,
      basepointvalidity: normalForm.base_point_validity, hometaxvalidity: normalForm.home_tax_validity,
      atpvalidity: normalForm.atp_validity, atpauthenticationvalidity: normalForm.atp_authentication_validity,
      serviceoutdate: normalForm.service_out_date, remarks: normalForm.remarks,
      ownername: normalForm.ownername, issparetank: 0, buscategory: 'normal',
      luxurytype: normalForm.luxury_type, seatingcapacity: normalForm.seating_capacity,
      chassismake: normalForm.chassis_make, bodymade: normalForm.body_made,
      chassismodel: normalForm.chassis_model, mfgyear: normalForm.mfg_year, regdate: normalForm.reg_date,
      userid: uid, usrnm: unm, user_id: uid, id: editId,
    }
  }

  // The blank fields below are what a NEW spare tank starts with. On an edit
  // they are dropped (see forUpdate): this form holds two fields, and sending
  // the rest as empty strings wiped columns it never showed.
  const buildSparePayload = () => {
    const uid = localStorage.getItem('user_id') ?? ''
    const unm = localStorage.getItem('usr_nm') ?? ''
    return {
      busno: spareForm.bus_no, busnumber: spareForm.bus_no, ownername: spareForm.ownername,
      issparetank: 1, buscategory: 'spare', engineno: '', chassisno: '', vehicletype: '', dateofpurchase: '',
      odometer: '', insurancevalidity: '', pollutionvalidity: '', fcvalidity: '',
      basepointvalidity: '', hometaxvalidity: '', atpvalidity: '', atpauthenticationvalidity: '',
      luxurytype: '', seatingcapacity: '', chassismake: '', bodymade: '', chassismodel: '', mfgyear: '', regdate: '',
      serviceoutdate: '', remarks: '', userid: uid, usrnm: unm, user_id: uid, id: editId,
    }
  }

  const buildHirePayload = () => {
    const uid = localStorage.getItem('user_id') ?? ''
    const unm = localStorage.getItem('usr_nm') ?? ''
    return {
      busno: hireForm.bus_no, busnumber: hireForm.bus_no, ownername: hireForm.ownername,
      owner_ledger_id: hireForm.owner_ledger_id,
      issparetank: 0, buscategory: 'hire', engineno: '', chassisno: '', vehicletype: hireForm.vehicle_type, company: '',
      dateofpurchase: '', odometer: '', insurancevalidity: '', pollutionvalidity: '', fcvalidity: '',
      basepointvalidity: '', hometaxvalidity: '', atpvalidity: '', atpauthenticationvalidity: '',
      luxurytype: '', seatingcapacity: '', chassismake: '', bodymade: '', chassismodel: '', mfgyear: '', regdate: '',
      serviceoutdate: '', remarks: '', userid: uid, usrnm: unm, user_id: uid, id: editId,
    }
  }

  // Which columns each form actually owns. An update sends only these, so a
  // column the open form never showed keeps whatever the vehicle already had -
  // editing a hire vehicle's owner used to blank its seating capacity, engine
  // and chassis numbers and every validity date.
  const UPDATE_FIELDS: Record<'normal' | 'hire' | 'spare', string[] | null> = {
    normal: null, // the full form - every column is on screen
    hire: ['busno', 'busnumber', 'ownername', 'owner_ledger_id', 'vehicletype', 'buscategory', 'issparetank'],
    spare: ['busno', 'busnumber', 'ownername', 'buscategory', 'issparetank'],
  }
  const forUpdate = (payload: Record<string, any>) => {
    const own = UPDATE_FIELDS[busType]
    if (!own) return payload
    const keep = new Set([...own, 'userid', 'usrnm', 'user_id', 'id'])
    return Object.fromEntries(Object.entries(payload).filter(([k]) => keep.has(k)))
  }

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const payload = busType === 'spare' ? buildSparePayload() : busType === 'hire' ? buildHirePayload() : buildNormalPayload()
      return isEdit ? mastersService.updateBus(forUpdate(payload)) : mastersService.addBus(payload)
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success(isEdit ? 'Bus updated!' : 'Bus added!')
        qc.invalidateQueries({ queryKey: ['buses'] })
        closeForm()
      } else toast.error(res.message ?? 'Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const handleEdit = (row: any) => {
    if (row.issparetank == 1) {
      setBusType('spare')
      setSpareForm({ bus_no: row.bus_no ?? '', ownername: row.ownername ?? '' })
    } else if (row.bus_category === 'hire') {
      setBusType('hire')
      setHireForm({ bus_no: row.bus_no ?? '', owner_ledger_id: String(row.owner_ledger_id ?? ''), ownername: row.ownername ?? '',
        vehicle_type: String(row.vehicle_type ?? '').trim() || 'BUS' })
    } else {
      setBusType('normal')
      setNormalForm({
        bus_no: row.bus_no ?? '', engine_no: row.engine_no ?? '',
        chassis_no: row.chassis_no ?? '', vehicle_type: row.vehicle_type ?? '',
        luxury_type: row.luxury_type ?? '', seating_capacity: row.seating_capacity ?? '',
        chassis_make: row.chassis_make ?? '', body_made: row.body_made ?? '',
        chassis_model: row.chassis_model ?? '', mfg_year: row.mfg_year ?? '',
        date_of_purchase: row.date_of_purchase ?? '', reg_date: row.reg_date ?? '', odometer: row.odometer ?? '',
        insurance_validity: row.insurance_validity ?? '', pollution_validity: row.pollution_validity ?? '',
        fc_validity: row.fc_validity ?? '', base_point_validity: row.base_point_validity ?? '',
        home_tax_validity: row.home_tax_validity ?? '', atp_validity: row.atp_validity ?? '',
        atp_authentication_validity: row.atp_authentication_validity ?? '',
        service_out_date: row.service_out_date ?? '', remarks: row.remarks ?? '',
        ownername: row.ownername ?? '',
      })
    }
    setIsEdit(true); setEditId(row.id); setShowForm(true)
  }

  const { mutate: markServiceOut, isPending: markingServiceOut } = useMutation({
    mutationFn: (vars: { date: string; reason: string }) => {
      const uid = localStorage.getItem('user_id') ?? ''
      const unm = localStorage.getItem('usr_nm') ?? ''
      return mastersService.markBusServiceOut({
        id: serviceOutBus.id, service_out_date: vars.date, service_out_reason: vars.reason,
        userid: uid, usrnm: unm,
      })
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Bus moved to Sold Out / Service Out')
        qc.invalidateQueries({ queryKey: ['buses'] })
        qc.invalidateQueries({ queryKey: ['service-out-buses'] })
        setServiceOutBus(null)
      } else toast.error('Failed to update')
    },
    onError: () => toast.error('Server error'),
  })

  const openAdd = () => {
    setNormalForm(EMPTY_NORMAL); setSpareForm(EMPTY_SPARE); setHireForm(EMPTY_HIRE)
    setIsEdit(false); setEditId(null); setBusType('normal'); setShowForm(true)
  }
  const closeForm = () => {
    setShowForm(false); setNormalForm(EMPTY_NORMAL); setSpareForm(EMPTY_SPARE); setHireForm(EMPTY_HIRE)
    setIsEdit(false); setEditId(null)
  }

  const canSave = busType === 'spare'
    ? !!spareForm.bus_no && !!spareForm.ownername
    : busType === 'hire'
    ? !!hireForm.bus_no && !!hireForm.vehicle_type
    : !!normalForm.vehicle_type && !!normalForm.bus_no

  const downloadTemplate = () => {
    downloadExcel(
      sheetType === 'Van'
        ? [VAN_TEMPLATE_HEADERS, ['VAN', '12', 'ENG777', 'CH888', '2023-04-10', 'TS09UA1234', '40000', '2023-04-20', '2026-12-31', '2026-12-31', '2026-12-31', 'Owner Name', 'Remarks', 'hire', 'Sri Sai Travels(Venkateswararao)']]
        : [BUS_TEMPLATE_HEADERS, ['BUS', 'Sleeper', '', '', '', '', '', 'ENG123', 'CH456', '2022-01-15', 'NL02B3154', '150000', '', '2026-12-31', '2026-12-31', '2026-12-31', '2026-12-31', '2026-12-31', '', '', '', 'Owner Name', 'Remarks', '0', 'normal', '']],
      `${sheetType}_Upload_Template_${Date.now()}.xlsx`
    )
  }

  const isVanVehicle = (b: any) => isVanVehicleType(b.vehicle_type)
  // The vehicle row carries only the ledger id, so the export resolves the name
  // back out of the Hire Vehicles ledgers — that is what the import reads.
  const hireLedgerName = (id: any) => {
    if (!String(id ?? '')) return ''
    const led = hireLedgers.find((l: any) => String(l.ledger_id) === String(id))
    return led ? String(led.temple_name ?? '') : ''
  }
  const downloadData = () => {
    const everything: any[] = data?.data ?? []
    const all = everything.filter(b => (sheetType === 'Van' ? isVanVehicle(b) : !isVanVehicle(b)))
    if (sheetType === 'Van') {
      const vanRows = all.map(b => [
        b.vehicle_type ?? '', b.seating_capacity ?? '', b.engine_no ?? '', b.chassis_no ?? '',
        b.date_of_purchase ?? '', b.bus_no ?? '', b.odometer ?? '', b.reg_date ?? '',
        b.fc_validity ?? '', b.insurance_validity ?? '', b.pollution_validity ?? '',
        b.ownername ?? '', b.remarks ?? '', b.bus_category ?? 'normal', hireLedgerName(b.owner_ledger_id),
      ])
      downloadExcel([VAN_TEMPLATE_HEADERS, ...vanRows], `Vans_${Date.now()}.xlsx`)
      toast.success(`Exported ${vanRows.length} vans`)
      return
    }
    const rows = all.map(b => [
      b.vehicle_type ?? '', b.luxury_type ?? '', b.seating_capacity ?? '', b.chassis_make ?? '',
      b.chassis_model ?? '', b.body_made ?? '', b.mfg_year ?? '', b.engine_no ?? '', b.chassis_no ?? '',
      b.date_of_purchase ?? '', b.bus_no ?? '', b.odometer ?? '', b.reg_date ?? '',
      b.fc_validity ?? '', b.home_tax_validity ?? '', b.insurance_validity ?? '', b.pollution_validity ?? '',
      b.base_point_validity ?? '', b.atp_validity ?? '', b.atp_authentication_validity ?? '',
      b.service_out_date ?? '', b.ownername ?? '', b.remarks ?? '', b.issparetank ?? 0,
    ])
    downloadExcel([BUS_TEMPLATE_HEADERS, ...rows], `Bus_Fleet_${Date.now()}.xlsx`)
    toast.success(`Exported ${rows.length} buses`)
  }

  // Buses and vans are imported and exported on their own sheets, the same way
  // Bus and Van service numbers are — a van sheet has no luxury/chassis columns
  // and always carries VAN as its vehicle type.
  const [sheetType, setSheetType] = useState<'Bus' | 'Van'>('Bus')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewRows, setPreviewRows] = useState<{ payload: Record<string, any>; preview: ExcelPreviewRow }[]>([])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const ab = await file.arrayBuffer()
      const wb = XLSX.read(ab)
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
      if (raw.length < 2) { toast.error('No data rows found in the file'); return }
      // Guard the positional mapping below: a sheet from another screen has
      // completely different columns but parses perfectly well, and every value
      // would land under the wrong field without a word of warning.
      const mismatch = headerRowMismatch(raw[0] ?? [], sheetType === 'Van' ? VAN_TEMPLATE_HEADERS : BUS_TEMPLATE_HEADERS)
      if (mismatch) {
        toast.error(`This does not look like the ${sheetType}} sheet. ${mismatch}. Download the template and fill that in.`)
        return
      }
      const [, ...dataRows] = raw
      const existingNos = new Set((data?.data ?? []).map((b: any) => String(b.bus_no ?? '').toLowerCase().trim()))
      // "hire" in the Category column is what makes an imported vehicle a hired
      // one; the Owner Ledger column names an existing ledger under Payables >
      // Hire Vehicles, resolved here so the sheet can carry a name rather than an
      // id. An unmatched name imports the vehicle without a ledger rather than
      // failing the row - it can be set on the Hire Bus form afterwards.
      const hireCategory = (v: any) => (String(v ?? '').trim().toLowerCase() === 'hire' ? 'hire' : 'normal')
      const ledgerIdByName = (v: any) => {
        const name = String(v ?? '').trim().toLowerCase()
        if (!name) return null
        const led = hireLedgers.find((l: any) => String(l.temple_name ?? '').trim().toLowerCase() === name)
        return led ? String(led.ledger_id) : null
      }
      if (sheetType === 'Van') {
        const vanRows = dataRows
          .filter(r => r && String(r[5] ?? '').trim())
          .map(r => {
            const payload = {
              // Fixed rather than read: this is the Van sheet, and the value is
              // what puts the vehicle on the Van tab everywhere else.
              vehicle_type: 'VAN',
              seating_capacity: String(r[1] ?? '').trim() || null,
              engine_no: String(r[2] ?? '').trim() || null,
              chassis_no: String(r[3] ?? '').trim() || null,
              date_of_purchase: excelCellToISODate(r[4]) || null,
              bus_no: String(r[5] ?? '').trim(),
              odometer: String(r[6] ?? '').trim() || null,
              reg_date: excelCellToISODate(r[7]) || null,
              fc_validity: excelCellToISODate(r[8]) || null,
              insurance_validity: excelCellToISODate(r[9]) || null,
              pollution_validity: excelCellToISODate(r[10]) || null,
              ownername: String(r[11] ?? '').trim() || null,
              remarks: String(r[12] ?? '').trim() || null,
              issparetank: 0,
              bus_category: hireCategory(r[13]),
              owner_ledger_id: ledgerIdByName(r[14]),
            }
            return { payload, isDuplicate: existingNos.has(payload.bus_no.toLowerCase()) }
          })
        if (vanRows.length === 0) { toast.error('No valid rows found (Van No column is required)'); return }
        setPreviewRows(vanRows.map(r => ({
          payload: r.payload,
          preview: { values: Object.values(r.payload).map(v => v ?? ''), isDuplicate: r.isDuplicate },
        })))
        setPreviewOpen(true)
        return
      }
      const rows = dataRows
        .filter(r => r && String(r[10] ?? '').trim())
        .map(r => {
          const payload = {
            vehicle_type: String(r[0] ?? '').trim() || null,
            luxury_type: String(r[1] ?? '').trim() || null,
            seating_capacity: String(r[2] ?? '').trim() || null,
            chassis_make: String(r[3] ?? '').trim() || null,
            chassis_model: String(r[4] ?? '').trim() || null,
            body_made: String(r[5] ?? '').trim() || null,
            mfg_year: String(r[6] ?? '').trim() || null,
            engine_no: String(r[7] ?? '').trim() || null,
            chassis_no: String(r[8] ?? '').trim() || null,
            date_of_purchase: excelCellToISODate(r[9]) || null,
            bus_no: String(r[10] ?? '').trim(),
            odometer: String(r[11] ?? '').trim() || null,
            reg_date: excelCellToISODate(r[12]) || null,
            fc_validity: excelCellToISODate(r[13]) || null,
            home_tax_validity: excelCellToISODate(r[14]) || null,
            insurance_validity: excelCellToISODate(r[15]) || null,
            pollution_validity: excelCellToISODate(r[16]) || null,
            base_point_validity: excelCellToISODate(r[17]) || null,
            atp_validity: excelCellToISODate(r[18]) || null,
            atp_authentication_validity: excelCellToISODate(r[19]) || null,
            service_out_date: excelCellToISODate(r[20]) || null,
            ownername: String(r[21] ?? '').trim() || null,
            remarks: String(r[22] ?? '').trim() || null,
            issparetank: Number(r[23] ?? 0) === 1 ? 1 : 0,
            bus_category: Number(r[23] ?? 0) === 1 ? 'spare' : hireCategory(r[24]),
            owner_ledger_id: ledgerIdByName(r[25]),
          }
          const isDuplicate = existingNos.has(payload.bus_no.toLowerCase())
          return { payload, isDuplicate }
        })
      if (rows.length === 0) { toast.error('No valid rows found (Bus No column is required)'); return }
      setPreviewRows(rows.map(r => ({
        payload: r.payload,
        preview: { values: Object.values(r.payload).map(v => v ?? ''), isDuplicate: r.isDuplicate },
      })))
      setPreviewOpen(true)
    } catch {
      toast.error('Failed to process file. Ensure it is a valid Excel file.')
    }
  }

  const confirmImport = async (selectedIndexes: number[]) => {
    const rows = selectedIndexes.map(i => previewRows[i].payload)
    setUploading(true)
    try {
      const uid = localStorage.getItem('user_id') ?? ''
      const unm = localStorage.getItem('usr_nm') ?? ''
      const res = await mastersService.bulkUploadBuses({ rows, user_id: uid, usr_nm: unm })
      if (res.status === 200) {
        const { inserted, replaced, total } = res.data
        qc.invalidateQueries({ queryKey: ['buses'] })
        if (replaced > 0) {
          toast.success(`Inserted ${inserted} new and replaced ${replaced} existing bus${replaced !== 1 ? 'es' : ''} (${total} total)`)
        } else {
          toast.success(`Successfully inserted ${inserted} buses!`)
        }
        setPreviewOpen(false)
      } else toast.error('Upload failed')
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex justify-between items-end">
        <PageHeader title="Bus Number Master" subtitle="Manage the complete bus fleet registry" />
        {!showForm && (
          <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add New Vehicle</Button>
        )}
      </div>

      {/* ── Add / Edit Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div key="bus-form" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
            <div ref={formRef}>
            <GlassCard className="p-6" colorBar={isEdit ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}>

              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {isEdit
                    ? <><Edit2 className="w-5 h-5 text-amber-500" /> Edit Vehicle</>
                    : <><Bus className="w-5 h-5 text-blue-500" /> Add New Vehicle</>
                  }
                </h2>
                <div className="flex items-center gap-3">
                  {!isEdit && (
                    <div className="flex rounded-xl border border-slate-200 overflow-hidden text-sm font-semibold">
                      <button onClick={() => setBusType('normal')} className={`px-4 py-2 transition-colors ${busType === 'normal' ? 'bg-blue-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Normal Bus</button>
                      <button onClick={() => setBusType('hire')} className={`px-4 py-2 transition-colors ${busType === 'hire' ? 'bg-purple-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Hire Bus</button>
                      <button onClick={() => setBusType('spare')} className={`px-4 py-2 transition-colors ${busType === 'spare' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500 hover:bg-slate-50'}`}>Spare Tank</button>
                    </div>
                  )}
                  {isEdit && (
                    <Badge variant={busType === 'spare' ? 'warning' : busType === 'hire' ? 'purple' : 'teal'}>
                      {busType === 'spare' ? 'Spare Tank' : busType === 'hire' ? 'Hire Bus' : 'Normal Bus'}
                    </Badge>
                  )}
                  <button onClick={closeForm} className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
                </div>
              </div>

              {busType === 'spare' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><Label>Bus Number <span className="text-red-500">*</span></Label>
                    <Input placeholder="Enter Bus Number" value={spareForm.bus_no} onChange={(e) => setSpareForm((f) => ({ ...f, bus_no: e.target.value }))} /></div>
                  <div><Label>Owner Name <span className="text-red-500">*</span></Label>
                    <Input placeholder="Enter Owner Name" value={spareForm.ownername} onChange={(e) => setSpareForm((f) => ({ ...f, ownername: e.target.value }))} /></div>
                </div>
              )}

              {busType === 'hire' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div><Label>Vehicle Type <span className="text-red-500">*</span></Label>
                    <MasterListPicker panelId="hire-vt-panel" queryKey="vehicle-types" queryFn={() => mastersService.getVehicleTypes()}
                      valueKey="type_name" value={hireForm.vehicle_type} onChange={(v) => setHireForm((f) => ({ ...f, vehicle_type: v }))}
                      placeholder="Select Vehicle Type" /></div>
                  <div><Label>Registration Number <span className="text-red-500">*</span></Label>
                    <Input placeholder="Enter Registration Number" value={hireForm.bus_no} onChange={(e) => setHireForm((f) => ({ ...f, bus_no: e.target.value }))} /></div>
                  <div>
                    <Label>Owner Ledger <span className="text-red-500">*</span></Label>
                    <SearchableSelect
                      placeholder="Select owner" options={hireLedgerOptions} value={hireForm.owner_ledger_id}
                      onChange={(v) => {
                        const l = hireLedgers.find((x: any) => String(x.ledger_id) === v)
                        setHireForm((f) => ({ ...f, owner_ledger_id: v, ownername: String(l?.temple_name ?? '') }))
                      }}
                      onClear={() => setHireForm((f) => ({ ...f, owner_ledger_id: '', ownername: '' }))} />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Payables › {HIRE_GROUP} — who we pay for this vehicle.
                    </p>
                  </div>
                  <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                    <Label>Owner not listed? Create the ledger</Label>
                    <div className="flex gap-2">
                      <Input placeholder="New owner name" value={newOwner} onChange={(e) => setNewOwner(e.target.value)} />
                      <Button variant="ghost" onClick={() => createOwnerLedger()} disabled={addingOwner || !newOwner.trim()}>
                        <Plus className="w-4 h-4" /> {addingOwner ? 'Creating…' : 'Create'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {busType === 'normal' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div><Label>Vehicle Type <span className="text-red-500">*</span></Label>
                    <MasterListPicker panelId="vt-panel" queryKey="vehicle-types" queryFn={() => mastersService.getVehicleTypes()}
                      valueKey="type_name" value={normalForm.vehicle_type} onChange={(v) => setNormalForm(f => ({ ...f, vehicle_type: v }))}
                      placeholder="Select Vehicle Type" /></div>
                  <div><Label>Luxury Type</Label>
                    <MasterListPicker panelId="luxury-type-panel" queryKey="luxury-types" queryFn={() => mastersService.getLuxuryTypes()}
                      valueKey="type_name" value={normalForm.luxury_type} onChange={(v) => setNormalForm(f => ({ ...f, luxury_type: v }))}
                      placeholder="Select Luxury Type" /></div>
                  <div><Label>Seating Capacity</Label>
                    <MasterListPicker panelId="seat-cap-panel" queryKey="seating-capacities" queryFn={() => mastersService.getSeatingCapacities()}
                      valueKey="capacity" value={normalForm.seating_capacity} onChange={(v) => setNormalForm(f => ({ ...f, seating_capacity: v }))}
                      placeholder="Select Seating Capacity" /></div>
                  <div><Label>Chassis Make</Label>
                    <MasterListPicker panelId="chassis-make-panel" queryKey="vehicle-companies" queryFn={() => mastersService.getVehicleCompanies()}
                      valueKey="company_name" value={normalForm.chassis_make} onChange={(v) => setNormalForm(f => ({ ...f, chassis_make: v }))}
                      placeholder="Select Chassis Make" /></div>
                  <div><Label>Chassis Model</Label>
                    <MasterListPicker panelId="chassis-model-panel" queryKey="chassis-models" queryFn={() => mastersService.getChassisModels()}
                      valueKey="model_name" value={normalForm.chassis_model} onChange={(v) => setNormalForm(f => ({ ...f, chassis_model: v }))}
                      placeholder="Select Chassis Model" /></div>
                  <div><Label>Body Made</Label>
                    <MasterListPicker panelId="body-made-panel" queryKey="body-builders" queryFn={() => mastersService.getBodyBuilders()}
                      valueKey="builder_name" value={normalForm.body_made} onChange={(v) => setNormalForm(f => ({ ...f, body_made: v }))}
                      placeholder="Select Body Builder" /></div>
                  <div><Label>Mfg Year</Label>
                    <MasterListPicker panelId="mfg-year-panel" queryKey="mfg-years" queryFn={() => mastersService.getMfgYears()}
                      valueKey="year_value" value={normalForm.mfg_year} onChange={(v) => setNormalForm(f => ({ ...f, mfg_year: v }))}
                      placeholder="Select Mfg Year" /></div>
                  <div><Label>Engine Number</Label>
                    <Input placeholder="Enter Engine Number" value={normalForm.engine_no} onChange={setN('engine_no')} /></div>
                  <div><Label>Chassis Number</Label>
                    <Input placeholder="Enter Chassis Number" value={normalForm.chassis_no} onChange={setN('chassis_no')} /></div>
                  <div><Label>Purchase Date</Label>
                    <Input type="date" max={today} value={normalForm.date_of_purchase} onChange={setN('date_of_purchase')} /></div>
                  <div><Label>Vehicle / Register Number <span className="text-red-500">*</span></Label>
                    <Input placeholder="Enter Register Number" value={normalForm.bus_no} onChange={setN('bus_no')} /></div>
                  <div><Label>Odometer <span className="text-red-500">*</span></Label>
                    <Input placeholder="Enter Odometer Reading" type="number" value={normalForm.odometer} onChange={setN('odometer')} /></div>
                  <div><Label>Registration Date</Label>
                    <Input type="date" max={today} value={normalForm.reg_date} onChange={setN('reg_date')} /></div>
                  <div><Label>Fitness Validity <span className="text-red-500">*</span></Label>
                    <Input type="date" value={normalForm.fc_validity} onChange={setN('fc_validity')} /></div>
                  <div><Label>Home Tax Validity <span className="text-red-500">*</span></Label>
                    <Input type="date" value={normalForm.home_tax_validity} onChange={setN('home_tax_validity')} /></div>
                  <div><Label>Insurance Validity <span className="text-red-500">*</span></Label>
                    <Input type="date" value={normalForm.insurance_validity} onChange={setN('insurance_validity')} /></div>
                  <div><Label>PUCC Validity <span className="text-red-500">*</span></Label>
                    <Input type="date" value={normalForm.pollution_validity} onChange={setN('pollution_validity')} /></div>
                  <div><Label>Permit Validity <span className="text-red-500">*</span></Label>
                    <Input type="date" value={normalForm.base_point_validity} onChange={setN('base_point_validity')} /></div>
                  <div><Label>AITP Validity</Label>
                    <Input type="date" value={normalForm.atp_validity} onChange={setN('atp_validity')} /></div>
                  <div><Label>Authorization Validity</Label>
                    <Input type="date" value={normalForm.atp_authentication_validity} onChange={setN('atp_authentication_validity')} /></div>
                  <div><Label>Service Out Date</Label>
                    <Input type="date" max={today} value={normalForm.service_out_date} onChange={setN('service_out_date')} /></div>
                  <div><Label>Owner Name</Label>
                    <Input placeholder="Owner name" value={normalForm.ownername} onChange={setN('ownername')} /></div>
                  <div className="md:col-span-3"><Label>Remarks</Label>
                    <textarea rows={3} placeholder="Enter Remarks" value={normalForm.remarks}
                      onChange={(e) => setNormalForm((f) => ({ ...f, remarks: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 resize-none" /></div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button onClick={() => save()} disabled={isPending || !canSave}>
                  <Save className="w-4 h-4" />{isPending ? 'Saving…' : isEdit ? 'Update Bus' : 'Submit'}
                </Button>
                <Button variant="ghost" onClick={closeForm}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Excel actions bar ── */}
      <GlassCard className="p-4" colorBar="bg-gradient-to-r from-slate-500 to-slate-700">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Excel Actions</span>
          <div className="h-5 w-px bg-slate-200" />
          {/* Buses and vans use different sheets, so Template, Export and Import
              all follow this one choice rather than guessing from the file. */}
          <div className="inline-flex rounded-xl border border-slate-200 bg-white overflow-hidden">
            {(['Bus', 'Van'] as const).map((t) => (
              <button key={t} onClick={() => setSheetType(t)}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${sheetType === t ? 'bg-slate-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                {t}s
              </button>
            ))}
          </div>
          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Download Template
          </button>
          <button
            onClick={downloadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export All Data
          </button>
          <label className="cursor-pointer">
            <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${uploading ? 'border-blue-200 bg-blue-50 text-blue-400' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
              <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : 'Import Excel'}
            </span>
            <input ref={uploadRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
          <span className="ml-auto text-xs text-slate-400 hidden sm:block">
            Use the <strong className="text-slate-600">▼</strong> filter icons in column headers to filter rows
          </span>
        </div>
      </GlassCard>

      <ExcelImportPreviewModal
        open={previewOpen}
        title={sheetType === 'Van' ? 'Confirm Van Import' : 'Confirm Bus Import'}
        headers={sheetType === 'Van' ? VAN_TEMPLATE_HEADERS : BUS_TEMPLATE_HEADERS}
        rows={previewRows.map(r => r.preview)}
        submitting={uploading}
        onCancel={() => setPreviewOpen(false)}
        onConfirm={confirmImport}
        duplicateHint="Duplicates are checked by default — they'll replace the existing bus's values with this row. Untick to leave that bus unchanged."
        duplicatesSelectedByDefault
      />

      {/* ── Bus fleet table ── */}
      <DataTable
        title={`Bus Fleet Registry (${busList.length})`}
        columns={cols}
        data={busList}
        loading={isLoading}
        onAction={(action, row) => {
          if (action === 'edit') handleEdit(row)
          if (action === 'history') setHistoryModal({ open: true, bus: row })
        }}
        actions={['edit', 'history']}
        icon={<Bus className="w-5 h-5 text-blue-500" />}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters(prev => ({ ...prev, [k]: v }))}
        className="border-2 border-slate-200"
        paginated
        pageSize={10}
        topScrollbar
      />

      {/* ── Sold Out / Service Out modal ── */}
      {serviceOutBus && (
        <ServiceOutModal
          bus={serviceOutBus}
          onConfirm={(date, reason) => markServiceOut({ date, reason })}
          onClose={() => setServiceOutBus(null)}
          isPending={markingServiceOut}
        />
      )}

      {/* ── Edit History modal ── */}
      <AnimatePresence>
        {historyModal.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <History className="w-5 h-5 text-slate-500" /> Edit History
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{historyModal.bus?.bus_no}</p>
                </div>
                <button onClick={() => setHistoryModal({ open: false, bus: null })} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto space-y-4">
                {loadingHistory ? (
                  <p className="text-sm text-slate-400 text-center py-8">Loading…</p>
                ) : historyList.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-8">No edits have been made to this bus yet.</p>
                ) : (
                  <ol className="relative border-l-2 border-slate-100 ml-2 space-y-6">
                    {historyList.map((h: any) => (
                      <li key={h.id} className="ml-4">
                        <span className="absolute -left-[7px] w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <Clock className="w-3.5 h-3.5" />
                          {fmtDateTime(h.changed_at)} · {h.changed_by_name || 'Unknown'}
                        </div>
                        <ChangeNote note={h.changes_note ?? ''} />
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
