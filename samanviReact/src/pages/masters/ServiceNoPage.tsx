import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, X, Save, Edit2, Search, Route, Upload, Download } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader, SearchableSelect, MasterListPicker, ExcelImportPreviewModal, TopNavTabs, FormModal } from '@/components/shared'
import type { ExcelPreviewRow } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mastersService } from '@/services/masters.service'
import { headerRowMismatch, formatDate, serverError } from '@/lib/utils'
import * as XLSX from 'xlsx'

const EMPTY: Record<string, string> = {
  serviceFor: '', service_for_id: '', serviceNo: '', fromCity: '', toCity: '',
  viaPlaces: '', parkingAmount: '0', driverOneBeta: '', driverTwoBeta: '',
  helperBeta: '', conductorBeta: '', distance: '', optDriver: '', optHelper: '',
  optDriverSalary: '', optHelperSalary: '', remarks: '',
  line_code: '', route_id: '', start_boarding_point: '', start_boarding_time: '',
  end_boarding_point: '', end_boarding_time: '',
  vehicle_type: 'bus', bus_operator_id: '', bus_operator_name: '', trip_type: '',
  up_down: '',
}

const amt = (v: any) => <span className="font-medium text-slate-800">{v != null && v !== '' ? `₹${v}` : '—'}</span>

// Boarding times must always end up as 24-hour "HH:MM" text, but Excel import
// can hand back three different shapes for the same cell: a real time-formatted
// cell (a fraction-of-a-day serial number, e.g. 0.770833 for 18:30 — verified
// empirically, sheet_to_json with header:1 does NOT auto-convert this to text),
// a 12-hour string someone typed ("6:30 PM"), or already-correct 24-hour text.
// Without this, a time-formatted cell would silently import as a garbled
// decimal string instead of a time.
function parseExcelTime(raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw === 'number') {
    const fraction = raw - Math.floor(raw)
    const totalMinutes = Math.round(fraction * 24 * 60)
    const hh = Math.floor(totalMinutes / 60) % 24
    const mm = totalMinutes % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
  }
  const str = String(raw).trim()
  if (!str) return null
  const match12 = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])$/)
  if (match12) {
    let hh = parseInt(match12[1], 10) % 12
    if (/pm/i.test(match12[3])) hh += 12
    return `${String(hh).padStart(2, '0')}:${match12[2]}`
  }
  const match24 = str.match(/^(\d{1,2}):(\d{2})/)
  if (match24) {
    const hh = Math.min(23, parseInt(match24[1], 10))
    return `${String(hh).padStart(2, '0')}:${match24[2]}`
  }
  return str
}

const cols: Column[] = [
  { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
  {
    label: 'Vehicle Type', key: 'vehicle_type', filterable: true,
    render: (v) => <Badge variant={v === 'van' ? 'purple' : 'info'}>{v === 'van' ? 'Van' : 'Bus'}</Badge>,
  },
  { label: 'Service For', key: 'serviceFor', filterable: true, render: (v) => <Badge variant="info">{String(v ?? '—')}</Badge> },
  { label: 'Service No', key: 'serviceNo', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v ?? '—')}</span> },
  {
    label: 'Up/Down', key: 'up_down', filterable: true,
    filterOptions: [{ label: 'Up', value: 'Up' }, { label: 'Down', value: 'Down' }],
    render: (v) => v ? <Badge variant={v === 'Up' ? 'info' : 'purple'}>{String(v)}</Badge> : <span className="text-slate-300 text-xs">—</span>,
  },
  { label: 'Bus Operator', key: 'bus_operator_name', filterable: true, render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
  { label: 'Trip Type', key: 'trip_type', filterable: true, render: (v) => <span className="text-sm capitalize">{String(v ?? '—')}</span> },
  { label: 'From City', key: 'fromCity', filterable: true, render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'To City', key: 'toCity', filterable: true, render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'Via Places', key: 'viaPlaces', filterable: true, render: (v) => <span className="text-sm text-slate-500">{String(v ?? '—')}</span> },
  { label: 'Line Code', key: 'line_code', filterable: true, render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
  { label: 'Route ID', key: 'route_id', filterable: true, render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
  { label: 'Start Boarding', key: 'start_boarding_point', filterable: true, render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
  { label: 'Start Boarding Time', key: 'start_boarding_time', render: (v) => <span className="text-sm font-medium">{String(v ?? '—')}</span> },
  { label: 'End Boarding', key: 'end_boarding_point', filterable: true, render: (v) => <span className="text-sm">{String(v ?? '—')}</span> },
  { label: 'End Boarding Time', key: 'end_boarding_time', render: (v) => <span className="text-sm font-medium">{String(v ?? '—')}</span> },
  { label: 'Parking Amt', key: 'parkingAmount', render: amt },
  { label: 'Driver 1 Beta', key: 'driverOneBeta', render: amt },
  { label: 'Driver 2 Beta', key: 'driverTwoBeta', render: amt },
  { label: 'Helper Beta', key: 'helperBeta', render: amt },
  { label: 'Conductor Beta', key: 'conductorBeta', render: amt },
  { label: 'Distance', key: 'distance', render: (v) => <span className="font-medium">{v != null && v !== '' ? `${v} km` : '—'}</span> },
  { label: 'OPT Driver', key: 'optDriver', render: (v) => <span className="text-sm">{v != null && v !== '' ? String(v) : '—'}</span> },
  { label: 'OPT Helper', key: 'optHelper', render: (v) => <span className="text-sm">{v != null && v !== '' ? String(v) : '—'}</span> },
  { label: 'OPT Driver Salary', key: 'optDriverSalary', render: amt },
  { label: 'OPT Helper Salary', key: 'optHelperSalary', render: amt },
  { label: 'Remarks', key: 'remarks', render: (v) => <span className="text-xs text-slate-500 truncate max-w-[10rem] block">{String(v ?? '—')}</span> },
]

// Bus and Van service numbers are different records with different fields, so
// each gets its own template, its own export and its own import mapping — a Van
// sheet has no cities, betas or distance, and a Bus sheet has no operator or
// trip type. The list view's Bus/Van tab decides which shape all three use.
const SERVICE_TEMPLATE_HEADERS = [
  'Service For*', 'Service No*', 'From City*', 'To City*', 'Via Places',
  'Parking Amount', 'Driver One Beta', 'Driver Two Beta', 'Helper Beta',
  'Conductor Beta', 'Distance (km)', 'OPT Driver', 'OPT Helper',
  'OPT Driver Salary', 'OPT Helper Salary', 'Remarks',
  'Line Code', 'Route ID', 'Start Boarding Point', 'Start Boarding Time (HH:MM)',
  'End Boarding Point', 'End Boarding Time (HH:MM)',
]

const VAN_TEMPLATE_HEADERS = [
  'Service For*', 'Service No*', 'Bus Operator*', 'Trip Type (pickup/drop)', 'Line Code',
  'First Boarding Point', 'First Boarding Time (HH:MM)', 'Dropping Point', 'Dropping Time (HH:MM)',
  'Via Route', 'Remarks',
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

export default function ServiceNoPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [formTab, setFormTab] = useState<'Bus' | 'Van' | 'Halt'>('Bus')
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...EMPTY })

  // Which kind of service number the list, the template, the export and the
  // import are working on. Bus and Van rows share one table but never one sheet.
  const [listType, setListType] = useState<'Bus' | 'Van'>('Bus')
  const [search, setSearch] = useState('')
  const [filterFor, setFilterFor] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const uploadRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  // Halt Beta is one company-wide amount, not a per-route rate, so the Halt tab
  // edits app_settings through its own query/mutation and ignores the route form.
  const [haltBeta, setHaltBeta] = useState('')
  const { data: haltBetaRes } = useQuery({ queryKey: ['halt-beta'], queryFn: () => mastersService.getHaltBeta() })
  const savedHaltBeta = String(haltBetaRes?.data?.halt_beta ?? '')
  useEffect(() => { setHaltBeta(savedHaltBeta) }, [savedHaltBeta])

  const { mutate: saveHaltBeta, isPending: haltSaving } = useMutation({
    mutationFn: () => mastersService.saveHaltBeta({
      halt_beta: haltBeta,
      userid: localStorage.getItem('user_id'),
      usrnm: localStorage.getItem('usr_nm'),
    }),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Halt beta saved!')
        qc.invalidateQueries({ queryKey: ['halt-beta'] })
        closeForm()
      } else toast.error(res.msg ?? 'Failed to save halt beta')
    },
    onError: () => toast.error('Server error'),
  })

  const { data: routes, isLoading } = useQuery({ queryKey: ['routes'], queryFn: () => mastersService.getServiceRoutes() })
  const { data: serviceNames } = useQuery({ queryKey: ['service-names'], queryFn: () => mastersService.getServiceNumbers() })
  const { data: busOperators } = useQuery({ queryKey: ['bus-operators'], queryFn: () => mastersService.getBusOperators() })

  const serviceNameList: any[] = serviceNames?.data ?? []
  const routeList: any[] = routes?.data ?? []
  const operatorList: any[] = busOperators?.data ?? []
  const serviceForOptions = [...new Set(routeList.map((r) => r.serviceFor).filter(Boolean))]

  // Bus and Van set vehicle_type; Halt is a third view of the SAME service
  // number (its halt settings), so selecting it must not touch vehicle_type or
  // reset the form the way switching Bus<->Van deliberately does.
  const formTabFor = (f: Record<string, string>) => (f.vehicle_type === 'van' ? 'Van' : 'Bus')
  // Up/Down is a Bus-only notion — a van route has no paired return service — so
  // it is left out of the Van form and cleared by EMPTY when switching across.
  const switchVehicleType = (t: 'bus' | 'van') => {
    setForm((f) => ({
      ...EMPTY,
      vehicle_type: t,
      serviceFor: f.serviceFor,
      service_for_id: f.service_for_id,
      serviceNo: f.serviceNo,
    }))
  }

  const isVanRoute = (r: any) => String(r.vehicle_type ?? 'bus') === 'van'
  // Rows from before the column existed are active.
  const isActiveRoute = (r: any) => String(r.is_active ?? '1') !== '0'
  const typeList = useMemo(
    () => routeList.filter((r) => (listType === 'Van' ? isVanRoute(r) : !isVanRoute(r))),
    [routeList, listType])
  const filtered = useMemo(() => typeList.filter((r) => {
    if (search && !String(r.serviceNo ?? '').toLowerCase().includes(search.trim().toLowerCase())) return false
    if (filterFor && r.serviceFor !== filterFor) return false
    return true
  }).map((r) => ({ ...r, status_label: isActiveRoute(r) ? 'Active' : 'Inactive' })), [typeList, search, filterFor])

  // Active / Inactive: an inactive service number is not offered on Trip
  // Creation until it is switched back on. Its past trips are untouched.
  const { mutate: setActive, isPending: settingActive } = useMutation({
    mutationFn: (row: any) => mastersService.setServiceRouteActive({
      id: row.id, is_active: isActiveRoute(row) ? 0 : 1,
      userid: localStorage.getItem('user_id'), usrnm: localStorage.getItem('usr_nm'),
    }),
    onSuccess: (res, row: any) => {
      if (res.status === 200) {
        toast.success(`${row.serviceNo} ${isActiveRoute(row) ? 'deactivated - hidden from Trip Creation from today (earlier dates still show it)' : 'activated'}`)
        qc.invalidateQueries({ queryKey: ['routes'] })
      } else toast.error('Failed to update status')
    },
    onError: () => toast.error('Server error'),
  })
  const tableCols: Column[] = useMemo(() => {
    const statusCol: Column = {
      label: 'Status', key: 'status_label', filterable: true,
      filterOptions: [{ label: 'Active', value: 'Active' }, { label: 'Inactive', value: 'Inactive' }],
      render: (v, row: any) => {
        const on = v === 'Active'
        return (
          <button
            type="button"
            disabled={settingActive}
            onClick={() => setActive(row)}
            title={on ? 'Click to deactivate' : 'Click to activate'}
            className="inline-flex items-center gap-2 disabled:opacity-60"
          >
            <span className={`relative inline-block w-9 h-5 rounded-full transition-colors ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`} />
            </span>
            <span className="text-left">
              <span className={`block text-xs font-semibold ${on ? 'text-emerald-700' : 'text-slate-500'}`}>{on ? 'Active' : 'Inactive'}</span>
              {!on && row.inactive_from && <span className="block text-[10px] text-slate-400 whitespace-nowrap">from {formatDate(row.inactive_from)}</span>}
            </span>
          </button>
        )
      },
    }
    // Right after Service No, so the state is read alongside the number.
    const at = cols.findIndex((c) => c.key === 'serviceNo') + 1
    return [...cols.slice(0, at), statusCol, ...cols.slice(at)]
  }, [settingActive, setActive])

  const buildPayload = () => ({
    ...form,
    id: editId,
    userid: localStorage.getItem('user_id'),
    usrnm: localStorage.getItem('usr_nm'),
  })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const payload = buildPayload()
      return isEdit ? mastersService.updateServiceRoute(payload) : mastersService.addServiceRoute(payload)
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success(isEdit ? 'Route updated!' : 'Route added!')
        qc.invalidateQueries({ queryKey: ['routes'] })
        closeForm()
      } else toast.error(res.message ?? 'Failed to save')
    },
    onError: (e) => toast.error(serverError(e)),
  })

  const handleEdit = (row: any) => {
    const next = Object.fromEntries(Object.keys(EMPTY).map((k) => [k, row[k] ?? '']))
    setForm(next); setFormTab(formTabFor(next))
    setIsEdit(true); setEditId(row.id); setShowForm(true)
  }

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mastersService.deleteServiceRoute({ id }),
    onSuccess: (res) => {
      if (res.status === 200) { toast.success('Route deleted'); qc.invalidateQueries({ queryKey: ['routes'] }) }
      else toast.error('Failed to delete')
    },
    onError: () => toast.error('Server error'),
  })

  const openAdd = () => { setForm({ ...EMPTY }); setFormTab('Bus'); setIsEdit(false); setEditId(null); setShowForm(true) }
  const closeForm = () => { setShowForm(false); setForm({ ...EMPTY }); setIsEdit(false); setEditId(null) }

  // The Halt tab saves the global amount, so it needs none of the Bus/Van
  // identifying fields — they aren't rendered there.
  const canSave = formTab === 'Halt'
    ? haltBeta.trim() !== ''
    : form.vehicle_type === 'van'
      ? Boolean(form.serviceFor && form.serviceNo && form.bus_operator_id)
      : Boolean(form.serviceFor && form.serviceNo && form.fromCity && form.toCity)

  // ── Excel download — template ─────────────────────────────────────────────
  const downloadTemplate = () => {
    if (listType === 'Van') {
      downloadExcel([
        VAN_TEMPLATE_HEADERS,
        ['Samanvi', 'VN-04', 'Sri Travels', 'pickup', 'LN-01', 'Ameerpet', '06:30', 'Gachibowli', '09:15', 'Via Madhapur', 'Remarks here'],
      ], `VanServiceRoute_Upload_Template_${Date.now()}.xlsx`)
      return
    }
    downloadExcel([
      SERVICE_TEMPLATE_HEADERS,
      ['Samanvi', 'ST-11', 'Hyderabad', 'Vijayawada', 'Guntur', '50', '800', '700', '500', '400', '250', '600', '400', '300', '200', 'Remarks here',
        'LN-01', 'RT-101', 'Ameerpet', '18:30', 'MG Bus Stand', '06:00'],
    ], `ServiceRoute_Upload_Template_${Date.now()}.xlsx`)
  }

  // ── Excel download — current data ─────────────────────────────────────────
  // The table's Export > Excel: the rows it shows, in the upload sheet's layout,
  // so the file can be edited and imported back.
  const downloadData = (shown?: any[]) => {
    const source: any[] = shown ?? typeList
    if (listType === 'Van') {
      const vanRows = source.map(r => [
        r.serviceFor ?? '', r.serviceNo ?? '', r.bus_operator_name ?? '', r.trip_type ?? '', r.line_code ?? '',
        r.start_boarding_point ?? '', r.start_boarding_time ?? '', r.end_boarding_point ?? '', r.end_boarding_time ?? '',
        r.viaPlaces ?? '', r.remarks ?? '',
      ])
      downloadExcel([VAN_TEMPLATE_HEADERS, ...vanRows], `VanServiceRoutes_${Date.now()}.xlsx`)
      toast.success(`Exported ${vanRows.length} van routes`)
      return
    }
    const rows = source.map(r => [
      r.serviceFor ?? '', r.serviceNo ?? '', r.fromCity ?? '', r.toCity ?? '', r.viaPlaces ?? '',
      r.parkingAmount ?? '', r.driverOneBeta ?? '', r.driverTwoBeta ?? '', r.helperBeta ?? '',
      r.conductorBeta ?? '', r.distance ?? '', r.optDriver ?? '', r.optHelper ?? '',
      r.optDriverSalary ?? '', r.optHelperSalary ?? '', r.remarks ?? '',
      r.line_code ?? '', r.route_id ?? '', r.start_boarding_point ?? '', r.start_boarding_time ?? '',
      r.end_boarding_point ?? '', r.end_boarding_time ?? '',
    ])
    downloadExcel([SERVICE_TEMPLATE_HEADERS, ...rows], `ServiceRoutes_${Date.now()}.xlsx`)
    toast.success(`Exported ${rows.length} bus routes`)
  }

  // ── Excel upload ──────────────────────────────────────────────────────────
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
      const mismatch = headerRowMismatch(raw[0] ?? [], listType === 'Van' ? VAN_TEMPLATE_HEADERS : SERVICE_TEMPLATE_HEADERS)
      if (mismatch) {
        toast.error(`This does not look like the ${listType} Service Route} sheet. ${mismatch}. Download the template and fill that in.`)
        return
      }
      const [, ...dataRows] = raw
      const existingNos = new Set(routeList.map((r: any) => String(r.serviceNo ?? '').toLowerCase().trim()))
      const rows = dataRows
        .filter(r => r && String(r[0] ?? '').trim() && String(r[1] ?? '').trim())
        .map(r => {
          const svcFor = String(r[0] ?? '').trim()
          const serviceNo = String(r[1] ?? '').trim()
          const found = serviceNameList.find((s: any) => s.name?.toLowerCase() === svcFor.toLowerCase())
          if (listType === 'Van') {
            const operatorName = String(r[2] ?? '').trim()
            const operator = operatorList.find((o: any) => String(o.operator_name ?? '').toLowerCase() === operatorName.toLowerCase())
            const vanPayload = {
              serviceFor: svcFor,
              serviceNo,
              service_for_id: found ? String(found.id) : null,
              vehicle_type: 'van',
              bus_operator_name: operatorName || null,
              bus_operator_id: operator ? String(operator.id) : null,
              trip_type: String(r[3] ?? '').trim().toLowerCase() || null,
              line_code: String(r[4] ?? '').trim() || null,
              start_boarding_point: String(r[5] ?? '').trim() || null,
              start_boarding_time: parseExcelTime(r[6]),
              end_boarding_point: String(r[7] ?? '').trim() || null,
              end_boarding_time: parseExcelTime(r[8]),
              viaPlaces: String(r[9] ?? '').trim() || null,
              remarks: String(r[10] ?? '').trim() || null,
            }
            const vanValues = [vanPayload.serviceFor, vanPayload.serviceNo, vanPayload.bus_operator_name, vanPayload.trip_type,
              vanPayload.line_code, vanPayload.start_boarding_point, vanPayload.start_boarding_time,
              vanPayload.end_boarding_point, vanPayload.end_boarding_time, vanPayload.viaPlaces, vanPayload.remarks]
            return { payload: vanPayload, preview: { values: vanValues.map(v => v ?? ''), isDuplicate: existingNos.has(serviceNo.toLowerCase()) } }
          }
          const payload = {
            serviceFor: svcFor,
            serviceNo,
            fromCity: String(r[2] ?? '').trim() || null,
            toCity: String(r[3] ?? '').trim() || null,
            viaPlaces: String(r[4] ?? '').trim() || null,
            parkingAmount: String(r[5] ?? '0').trim() || '0',
            driverOneBeta: String(r[6] ?? '0').trim() || '0',
            driverTwoBeta: String(r[7] ?? '0').trim() || '0',
            helperBeta: String(r[8] ?? '0').trim() || '0',
            conductorBeta: String(r[9] ?? '0').trim() || '0',
            distance: String(r[10] ?? '0').trim() || '0',
            optDriver: String(r[11] ?? '0').trim() || '0',
            optHelper: String(r[12] ?? '0').trim() || '0',
            optDriverSalary: String(r[13] ?? '0').trim() || '0',
            optHelperSalary: String(r[14] ?? '0').trim() || '0',
            remarks: String(r[15] ?? '').trim() || null,
            service_for_id: found ? String(found.id) : null,
            line_code: String(r[16] ?? '').trim() || null,
            route_id: String(r[17] ?? '').trim() || null,
            start_boarding_point: String(r[18] ?? '').trim() || null,
            start_boarding_time: parseExcelTime(r[19]),
            end_boarding_point: String(r[20] ?? '').trim() || null,
            end_boarding_time: parseExcelTime(r[21]),
          }
          const values = [payload.serviceFor, payload.serviceNo, payload.fromCity, payload.toCity, payload.viaPlaces,
            payload.parkingAmount, payload.driverOneBeta, payload.driverTwoBeta, payload.helperBeta, payload.conductorBeta,
            payload.distance, payload.optDriver, payload.optHelper, payload.optDriverSalary, payload.optHelperSalary, payload.remarks,
            payload.line_code, payload.route_id, payload.start_boarding_point, payload.start_boarding_time,
            payload.end_boarding_point, payload.end_boarding_time]
          return { payload, preview: { values: values.map(v => v ?? ''), isDuplicate: existingNos.has(serviceNo.toLowerCase()) } }
        })
      if (rows.length === 0) { toast.error('No valid rows found (Service For and Service No are required)'); return }
      setPreviewRows(rows)
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
      const res = await mastersService.bulkUploadServiceRoutes({ rows, user_id: uid, usr_nm: unm })
      if (res.status === 200) {
        const { inserted, skipped, total } = res.data
        qc.invalidateQueries({ queryKey: ['routes'] })
        if (skipped.length > 0) {
          toast.success(`Inserted ${inserted} of ${total} routes. ${skipped.length} duplicates skipped: ${skipped.slice(0, 5).join(', ')}${skipped.length > 5 ? '…' : ''}`)
        } else {
          toast.success(`Successfully inserted ${inserted} routes!`)
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
        <PageHeader title="Service Routes" subtitle="Manage service routes, beta amounts and city details" />
        {!showForm && <Button onClick={openAdd}><Plus className="w-4 h-4" /> Add Service Number</Button>}
      </div>

      {/* ── Form (popup) ── */}
      <AnimatePresence>
        {showForm && (
          <FormModal key="svc-form">
            <GlassCard className="p-6" colorBar={isEdit ? 'bg-gradient-to-r from-amber-400 to-orange-500' : 'bg-gradient-to-r from-indigo-500 to-blue-500'}>

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

              <TopNavTabs
                tabs={['Bus', 'Van', 'Halt']}
                activeTab={formTab}
                onChange={(t) => {
                  if (t === 'Halt') { setFormTab('Halt'); return }
                  setFormTab(t as 'Bus' | 'Van')
                  switchVehicleType(t.toLowerCase() as 'bus' | 'van')
                }}
              />

              {formTab === 'Halt' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <Label>Halt Beta (₹) <span className="text-red-500">*</span></Label>
                    <Input type="number" placeholder="Enter halt beta" value={haltBeta}
                      onChange={(e) => setHaltBeta(e.target.value)} />
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Paid to each assigned crew member when a service is marked
                      <span className="font-semibold text-slate-500"> Halt </span>
                      on Trip Creation, in place of their running beta.
                    </p>
                  </div>
                  <div className="md:col-span-2 self-end">
                    <p className="text-[11px] text-slate-400">
                      This is a single amount for <span className="font-semibold text-slate-500">all service numbers</span> —
                      saving it here does not change any route.
                      {savedHaltBeta ? ` Currently ₹${savedHaltBeta}.` : ' Not set yet.'}
                    </p>
                  </div>
                </div>
              ) : form.vehicle_type === 'van' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <Label>Service For <span className="text-red-500">*</span></Label>
                    <SearchableSelect
                      value={form.serviceFor}
                      onChange={(v) => {
                        const found = serviceNameList.find((s) => s.name === v)
                        setForm((f) => ({ ...f, serviceFor: v, service_for_id: String(found?.id ?? '') }))
                      }}
                      options={serviceNameList.map((s) => ({ value: s.name, label: s.name }))}
                      placeholder="Select service"
                    />
                  </div>
                  <div><Label>Service No <span className="text-red-500">*</span></Label>
                    <Input placeholder="Enter service number" value={form.serviceNo} onChange={set('serviceNo')} /></div>
                  <div><Label>Bus Operator <span className="text-red-500">*</span></Label>
                    <MasterListPicker panelId="svc-bus-operator-panel" queryKey="bus-operators" queryFn={() => mastersService.getBusOperators()}
                      valueKey="operator_name" value={form.bus_operator_name} onChange={(v) => {
                        const found = operatorList.find((o) => o.operator_name === v)
                        setForm((f) => ({ ...f, bus_operator_name: v, bus_operator_id: String(found?.id ?? '') }))
                      }} placeholder="Select bus operator" /></div>
                  <div><Label>Line Code</Label>
                    <MasterListPicker panelId="svc-line-code-panel-van" queryKey="line-codes" queryFn={() => mastersService.getLineCodes()}
                      valueKey="line_code" value={form.line_code} onChange={(v) => setForm((f) => ({ ...f, line_code: v }))} placeholder="Select line code" /></div>
                  <div><Label>Trip Type</Label>
                    <Select value={form.trip_type} onChange={set('trip_type')}>
                      <option value="">Select trip type</option>
                      <option value="pickup">Pickup</option>
                      <option value="drop">Drop</option>
                    </Select></div>
                  <div><Label>First Boarding Point</Label>
                    <MasterListPicker panelId="svc-first-bp-panel" queryKey="boarding-points" queryFn={() => mastersService.getBoardingPoints()}
                      valueKey="point_name" value={form.start_boarding_point} onChange={(v) => setForm((f) => ({ ...f, start_boarding_point: v }))} placeholder="Select boarding point" /></div>
                  <div><Label>First Boarding Time</Label>
                    <Input type="time" value={form.start_boarding_time} onChange={set('start_boarding_time')} /></div>
                  <div><Label>Dropping Point</Label>
                    <MasterListPicker panelId="svc-dropping-bp-panel" queryKey="boarding-points" queryFn={() => mastersService.getBoardingPoints()}
                      valueKey="point_name" value={form.end_boarding_point} onChange={(v) => setForm((f) => ({ ...f, end_boarding_point: v }))} placeholder="Select dropping point" /></div>
                  <div><Label>Dropping Time</Label>
                    <Input type="time" value={form.end_boarding_time} onChange={set('end_boarding_time')} /></div>
                  <div className="md:col-span-3"><Label>Via Route</Label>
                    <Input placeholder="Enter via route" value={form.viaPlaces} onChange={set('viaPlaces')} /></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <Label>Service For <span className="text-red-500">*</span></Label>
                    <SearchableSelect
                      value={form.serviceFor}
                      onChange={(v) => {
                        const found = serviceNameList.find((s) => s.name === v)
                        setForm((f) => ({ ...f, serviceFor: v, service_for_id: String(found?.id ?? '') }))
                      }}
                      options={serviceNameList.map((s) => ({ value: s.name, label: s.name }))}
                      placeholder="Select service"
                    />
                  </div>
                  <div><Label>Service No <span className="text-red-500">*</span></Label>
                    <Input placeholder="Enter service number" value={form.serviceNo} onChange={set('serviceNo')} /></div>
                  <div><Label>Up/Down</Label>
                    <Select value={form.up_down} onChange={set('up_down')}>
                      <option value="">— Select —</option>
                      <option value="Up">Up</option>
                      <option value="Down">Down</option>
                    </Select></div>
                  <div><Label>Line Code</Label>
                    <MasterListPicker panelId="svc-line-code-panel" queryKey="line-codes" queryFn={() => mastersService.getLineCodes()}
                      valueKey="line_code" value={form.line_code} onChange={(v) => setForm((f) => ({ ...f, line_code: v }))} placeholder="Select line code" /></div>
                  <div><Label>Route ID</Label>
                    <MasterListPicker panelId="svc-route-id-panel" queryKey="route-ids" queryFn={() => mastersService.getRouteIds()}
                      valueKey="route_id_name" value={form.route_id} onChange={(v) => setForm((f) => ({ ...f, route_id: v }))} placeholder="Select route ID" /></div>
                  <div><Label>From <span className="text-red-500">*</span></Label>
                    <MasterListPicker panelId="svc-from-city-panel" queryKey="city-list" queryFn={() => mastersService.getCityList()}
                      valueKey="city_name" value={form.fromCity} onChange={(v) => setForm((f) => ({ ...f, fromCity: v }))} placeholder="Select start city" /></div>
                  <div><Label>To <span className="text-red-500">*</span></Label>
                    <MasterListPicker panelId="svc-to-city-panel" queryKey="city-list" queryFn={() => mastersService.getCityList()}
                      valueKey="city_name" value={form.toCity} onChange={(v) => setForm((f) => ({ ...f, toCity: v }))} placeholder="Select end city" /></div>
                  <div><Label>Start Boarding Point</Label>
                    <MasterListPicker panelId="svc-start-bp-panel" queryKey="boarding-points" queryFn={() => mastersService.getBoardingPoints()}
                      valueKey="point_name" value={form.start_boarding_point} onChange={(v) => setForm((f) => ({ ...f, start_boarding_point: v }))} placeholder="Select boarding point" /></div>
                  <div><Label>Start Boarding Time</Label>
                    <Input type="time" value={form.start_boarding_time} onChange={set('start_boarding_time')} /></div>
                  <div><Label>End Boarding Point</Label>
                    <MasterListPicker panelId="svc-end-bp-panel" queryKey="boarding-points" queryFn={() => mastersService.getBoardingPoints()}
                      valueKey="point_name" value={form.end_boarding_point} onChange={(v) => setForm((f) => ({ ...f, end_boarding_point: v }))} placeholder="Select boarding point" /></div>
                  <div><Label>End Boarding Time</Label>
                    <Input type="time" value={form.end_boarding_time} onChange={set('end_boarding_time')} /></div>
                  <div><Label>Parking Amount <span className="text-red-500">*</span></Label>
                    <Input type="number" placeholder="Enter parking amount" value={form.parkingAmount} onChange={set('parkingAmount')} /></div>
                  <div><Label>Driver One Beta <span className="text-red-500">*</span></Label>
                    <Input type="number" placeholder="Enter driver one beta" value={form.driverOneBeta} onChange={set('driverOneBeta')} /></div>
                  <div><Label>Driver Two Beta <span className="text-red-500">*</span></Label>
                    <Input type="number" placeholder="Enter driver two beta" value={form.driverTwoBeta} onChange={set('driverTwoBeta')} /></div>
                  <div><Label>Helper Beta <span className="text-red-500">*</span></Label>
                    <Input type="number" placeholder="Enter helper beta" value={form.helperBeta} onChange={set('helperBeta')} /></div>
                  <div><Label>Conductor Beta <span className="text-red-500">*</span></Label>
                    <Input type="number" placeholder="Enter conductor beta" value={form.conductorBeta} onChange={set('conductorBeta')} /></div>
                  <div><Label>Distance <span className="text-red-500">*</span></Label>
                    <Input type="number" placeholder="Enter distance" value={form.distance} onChange={set('distance')} /></div>
                  <div><Label>OPT-Driver Salary</Label>
                    <Input type="number" placeholder="Enter opt-driver salary" value={form.optDriverSalary} onChange={set('optDriverSalary')} /></div>
                  <div><Label>OPT-Helper Salary</Label>
                    <Input type="number" placeholder="Enter opt-helper salary" value={form.optHelperSalary} onChange={set('optHelperSalary')} /></div>
                  <div className="md:col-span-3"><Label>Remarks</Label>
                    <textarea rows={3} placeholder="Enter Remarks" value={form.remarks} onChange={set('remarks')}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none" /></div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button onClick={() => (formTab === 'Halt' ? saveHaltBeta() : save())} disabled={isPending || haltSaving || !canSave}>
                  <Save className="w-4 h-4" />
                  {isPending || haltSaving ? 'Saving…' : formTab === 'Halt' ? 'Save Halt Beta' : isEdit ? 'Update Route' : 'Submit'}
                </Button>
                <Button variant="ghost" onClick={closeForm}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </GlassCard>
          </FormModal>
        )}
      </AnimatePresence>

      {/* ── Filter + Actions bar (accounts module style) ── */}
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-slate-500 to-slate-700">
        {/* Bus and Van are separate sets of service numbers with separate sheets:
            this picks which one the table below, Template, Export and Upload all
            act on, so a Van sheet can never be read with the Bus column order. */}
        <div className="mb-4">
          <TopNavTabs tabs={['Bus', 'Van']} activeTab={listType} onChange={(t) => setListType(t as 'Bus' | 'Van')} />
        </div>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label className="text-slate-600">Search Service No</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <Input placeholder="e.g. ST-11, F-BHM" value={search} onChange={(e) => setSearch(e.target.value)} className="w-44 pl-8" />
            </div>
          </div>
          <div>
            <Label className="text-slate-600">Service For</Label>
            <Select value={filterFor} onChange={(e) => setFilterFor(e.target.value)} className="w-36">
              <option value="">All</option>
              {serviceForOptions.map((s) => <option key={s as string} value={s as string}>{s as string}</option>)}
            </Select>
          </div>
          {(search || filterFor) && (
            <button
              onClick={() => { setSearch(''); setFilterFor('') }}
              className="text-xs text-slate-500 hover:text-red-500 font-medium underline"
            >
              Clear
            </button>
          )}
          {(search || filterFor) && (
            <span className="text-xs font-semibold text-blue-600">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          )}

          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />

          <button
            onClick={downloadTemplate}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Template
          </button>
          <label className="cursor-pointer">
            <span className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${uploading ? 'border-blue-200 bg-blue-50 text-blue-400' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
              <Upload className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : 'Import Excel'}
            </span>
            <input ref={uploadRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </GlassCard>

      <ExcelImportPreviewModal
        open={previewOpen}
        title={listType === 'Van' ? 'Confirm Van Service Route Import' : 'Confirm Bus Service Route Import'}
        headers={listType === 'Van' ? VAN_TEMPLATE_HEADERS : SERVICE_TEMPLATE_HEADERS}
        rows={previewRows.map(r => r.preview)}
        submitting={uploading}
        onCancel={() => setPreviewOpen(false)}
        onConfirm={confirmImport}
      />

      {/* ── Routes table ── */}
      <DataTable
        title={`${listType} Service Routes (${filtered.length})`}
        columns={tableCols}
        data={filtered}
        loading={isLoading}
        onAction={(action, row) => {
          if (action === 'edit') handleEdit(row)
          if (action === 'delete') del(row.id as number)
        }}
        actions={['edit', 'delete']}
        icon={<Route className="w-5 h-5 text-indigo-500" />}
        onExport={{ excel: (rows) => downloadData(rows) }}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters(prev => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
