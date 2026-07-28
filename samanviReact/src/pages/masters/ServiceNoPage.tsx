import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Plus, X, Save, Edit2, Search, Route, Upload, Download, FileSpreadsheet } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader, SearchableSelect, ExcelImportPreviewModal } from '@/components/shared'
import type { ExcelPreviewRow } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mastersService } from '@/services/masters.service'
import { scrollContentToTop } from '@/lib/utils'
import * as XLSX from 'xlsx'

const EMPTY: Record<string, string> = {
  serviceFor: '', service_for_id: '', serviceNo: '', fromCity: '', toCity: '',
  viaPlaces: '', parkingAmount: '0', driverOneBeta: '', driverTwoBeta: '',
  helperBeta: '', conductorBeta: '', distance: '', optDriver: '', optHelper: '',
  optDriverSalary: '', optHelperSalary: '', remarks: '',
}

const amt = (v: any) => <span className="font-medium text-slate-800">{v != null && v !== '' ? `₹${v}` : '—'}</span>

const cols: Column[] = [
  { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
  { label: 'Service For', key: 'serviceFor', filterable: true, render: (v) => <Badge variant="info">{String(v ?? '—')}</Badge> },
  { label: 'Service No', key: 'serviceNo', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v ?? '—')}</span> },
  { label: 'From City', key: 'fromCity', filterable: true, render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'To City', key: 'toCity', filterable: true, render: (v) => <span className="font-medium">{String(v ?? '—')}</span> },
  { label: 'Via Places', key: 'viaPlaces', filterable: true, render: (v) => <span className="text-sm text-slate-500">{String(v ?? '—')}</span> },
  { label: 'Parking Amt', key: 'parkingAmount', render: amt },
  { label: 'Driver 1 Beta', key: 'driverOneBeta', render: amt },
  { label: 'Driver 2 Beta', key: 'driverTwoBeta', render: amt },
  { label: 'Helper Beta', key: 'helperBeta', render: amt },
  { label: 'Conductor Beta', key: 'conductorBeta', render: amt },
  { label: 'Distance', key: 'distance', render: (v) => <span className="font-medium">{v != null && v !== '' ? `${v} km` : '—'}</span> },
  { label: 'OPT Driver', key: 'optDriver', render: amt },
  { label: 'OPT Helper', key: 'optHelper', render: amt },
  { label: 'OPT Driver Salary', key: 'optDriverSalary', render: amt },
  { label: 'OPT Helper Salary', key: 'optHelperSalary', render: amt },
]

const SERVICE_TEMPLATE_HEADERS = [
  'Service For*', 'Service No*', 'From City*', 'To City*', 'Via Places',
  'Parking Amount', 'Driver One Beta', 'Driver Two Beta', 'Helper Beta',
  'Conductor Beta', 'Distance (km)', 'OPT Driver', 'OPT Helper',
  'OPT Driver Salary', 'OPT Helper Salary', 'Remarks',
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
  const [isEdit, setIsEdit] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState({ ...EMPTY })

  const [search, setSearch] = useState('')
  const [filterFor, setFilterFor] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const uploadRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const { data: routes, isLoading } = useQuery({ queryKey: ['routes'], queryFn: () => mastersService.getServiceRoutes() })
  const { data: serviceNames } = useQuery({ queryKey: ['service-names'], queryFn: () => mastersService.getServiceNumbers() })

  const serviceNameList: any[] = serviceNames?.data ?? []
  const routeList: any[] = routes?.data ?? []
  const serviceForOptions = [...new Set(routeList.map((r) => r.serviceFor).filter(Boolean))]

  const filtered = useMemo(() => routeList.filter((r) => {
    if (search && !String(r.serviceNo ?? '').toLowerCase().includes(search.trim().toLowerCase())) return false
    if (filterFor && r.serviceFor !== filterFor) return false
    return true
  }), [routeList, search, filterFor])

  const buildPayload = () => ({
    ...form, id: editId,
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
    onError: () => toast.error('Server error'),
  })

  const handleEdit = (row: any) => {
    setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, row[k] ?? ''])))
    setIsEdit(true); setEditId(row.id); setShowForm(true)
    scrollContentToTop()
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

  // ── Excel download — template ─────────────────────────────────────────────
  const downloadTemplate = () => {
    downloadExcel([
      SERVICE_TEMPLATE_HEADERS,
      ['Samanvi', 'ST-11', 'Hyderabad', 'Vijayawada', 'Guntur', '50', '800', '700', '500', '400', '250', '600', '400', '300', '200', 'Remarks here'],
    ], `ServiceRoute_Upload_Template_${Date.now()}.xlsx`)
  }

  // ── Excel download — current data ─────────────────────────────────────────
  const downloadData = () => {
    const rows = routeList.map(r => [
      r.serviceFor ?? '', r.serviceNo ?? '', r.fromCity ?? '', r.toCity ?? '', r.viaPlaces ?? '',
      r.parkingAmount ?? '', r.driverOneBeta ?? '', r.driverTwoBeta ?? '', r.helperBeta ?? '',
      r.conductorBeta ?? '', r.distance ?? '', r.optDriver ?? '', r.optHelper ?? '',
      r.optDriverSalary ?? '', r.optHelperSalary ?? '', r.remarks ?? '',
    ])
    downloadExcel([SERVICE_TEMPLATE_HEADERS, ...rows], `ServiceRoutes_${Date.now()}.xlsx`)
    toast.success(`Exported ${rows.length} routes`)
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
      const [, ...dataRows] = raw
      const existingNos = new Set(routeList.map((r: any) => String(r.serviceNo ?? '').toLowerCase().trim()))
      const rows = dataRows
        .filter(r => r && String(r[0] ?? '').trim() && String(r[1] ?? '').trim())
        .map(r => {
          const svcFor = String(r[0] ?? '').trim()
          const serviceNo = String(r[1] ?? '').trim()
          const found = serviceNameList.find((s: any) => s.name?.toLowerCase() === svcFor.toLowerCase())
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
          }
          const values = [payload.serviceFor, payload.serviceNo, payload.fromCity, payload.toCity, payload.viaPlaces,
            payload.parkingAmount, payload.driverOneBeta, payload.driverTwoBeta, payload.helperBeta, payload.conductorBeta,
            payload.distance, payload.optDriver, payload.optHelper, payload.optDriverSalary, payload.optHelperSalary, payload.remarks]
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

      {/* ── Form ── */}
      <AnimatePresence>
        {showForm && (
          <motion.div key="svc-form" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
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
                <div><Label>From <span className="text-red-500">*</span></Label>
                  <Input placeholder="Enter start city" value={form.fromCity} onChange={set('fromCity')} /></div>
                <div><Label>To <span className="text-red-500">*</span></Label>
                  <Input placeholder="Enter end city" value={form.toCity} onChange={set('toCity')} /></div>
                <div><Label>Via <span className="text-red-500">*</span></Label>
                  <Input placeholder="Enter via places" value={form.viaPlaces} onChange={set('viaPlaces')} /></div>
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
                <div><Label>OPT-Driver <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="Enter opting driver amount" value={form.optDriver} onChange={set('optDriver')} /></div>
                <div><Label>OPT-Helper <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="Enter opting helper amount" value={form.optHelper} onChange={set('optHelper')} /></div>
                <div><Label>OPT-Driver Salary</Label>
                  <Input type="number" placeholder="Enter opt-driver salary" value={form.optDriverSalary} onChange={set('optDriverSalary')} /></div>
                <div><Label>OPT-Helper Salary</Label>
                  <Input type="number" placeholder="Enter opt-helper salary" value={form.optHelperSalary} onChange={set('optHelperSalary')} /></div>
                <div className="md:col-span-3"><Label>Remarks</Label>
                  <textarea rows={3} placeholder="Enter Remarks" value={form.remarks} onChange={set('remarks')}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none" /></div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={() => save()} disabled={isPending || !canSave}>
                  <Save className="w-4 h-4" />{isPending ? 'Saving…' : isEdit ? 'Update Route' : 'Submit'}
                </Button>
                <Button variant="ghost" onClick={closeForm}><X className="w-4 h-4" /> Cancel</Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Filter + Actions bar (accounts module style) ── */}
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-slate-500 to-slate-700">
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
          <button
            onClick={downloadData}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export
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
        title="Confirm Service Route Import"
        headers={SERVICE_TEMPLATE_HEADERS}
        rows={previewRows.map(r => r.preview)}
        submitting={uploading}
        onCancel={() => setPreviewOpen(false)}
        onConfirm={confirmImport}
      />

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
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters(prev => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
