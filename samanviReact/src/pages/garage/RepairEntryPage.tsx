import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Wrench, Save, X, RefreshCw, CheckCircle, Plus, PackagePlus, History, Clock } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, PageHeader, DynamicRows, SearchableSelect, ColumnFilterDropdown, DualScrollTable, ExportMenu } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { fuelService } from '@/services/fuel.service'
import { accountingService } from '@/services/accounting.service'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ledgerOption, todayISO } from '@/lib/utils'

interface JobRow { category: string; priority: string; technician: string; description: string }
interface PartRow { category_id: string; part_id: string; qty: string; rate: string }

const emptyPartRow = (): PartRow => ({ category_id: '', part_id: '', qty: '1', rate: '' })

export default function RepairEntryPage() {
  const qc = useQueryClient()

  const [form, setForm] = useState({ job_date: todayISO(), bus_no: '', odometer: '', driver: '' })
  const [jobRows, setJobRows] = useState<JobRow[]>([{ category: '', priority: 'Medium', technician: '', description: '' }])
  const [submitted, setSubmitted] = useState(false)

  const [colFilters, setColFilters] = useState<Record<string, string[]>>({})

  // Complete Job modal
  const [completeModal, setCompleteModal] = useState<{ open: boolean; jobCardNo: string; jobCardId: number | null; job: any }>({
    open: false, jobCardNo: '', jobCardId: null, job: null,
  })
  const [completeParts, setCompleteParts] = useState<PartRow[]>([emptyPartRow()])
  const [debitLedgerId, setDebitLedgerId] = useState('')
  const [creditLedgerId, setCreditLedgerId] = useState('')
  const [completeRepeat, setCompleteRepeat] = useState(false)
  const [completeRepeatDate, setCompleteRepeatDate] = useState('')

  const [finishModal, setFinishModal]           = useState<{ open: boolean; job: any }>({ open: false, job: null })
  const [finishRemarks, setFinishRemarks]       = useState('')
  const [finishRepeat, setFinishRepeat]         = useState(false)
  const [finishRepeatDate, setFinishRepeatDate] = useState('')
  const [finishDebitLedgerId, setFinishDebitLedgerId]   = useState('')
  const [finishCreditLedgerId, setFinishCreditLedgerId] = useState('')

  const [historyModal, setHistoryModal] = useState<{ open: boolean; job: any; jobCardId: number | null }>({ open: false, job: null, jobCardId: null })

  // New part creation inline form
  const [showNewPart, setShowNewPart] = useState(false)
  const [newPart, setNewPart] = useState({ part_number: '', part_name: '', price: '', category_id: '' })

  const { data: entries, isLoading } = useQuery({ queryKey: ['repair-entries'], queryFn: () => garageService.getRepairEntries({}) })
  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })
  const { data: categories, refetch: reloadCats, isFetching: loadingCats } = useQuery({ queryKey: ['repair-cats'], queryFn: () => garageService.getCategories() })
  const { data: partsData, refetch: reloadParts, isFetching: loadingParts } = useQuery({ queryKey: ['repair-parts'], queryFn: () => garageService.getParts() })
  const { data: staffData, refetch: reloadStaff, isFetching: loadingStaff } = useQuery({ queryKey: ['garage-staff'], queryFn: () => garageService.getStaff() })
  const { data: driversData, refetch: reloadDrivers, isFetching: loadingDrivers } = useQuery({ queryKey: ['garage-drivers'], queryFn: () => garageService.getDriversList() })
  const { data: ledgersData, refetch: reloadLedgers, isFetching: loadingLedgers } = useQuery({
    queryKey: ['ledger-names-garage'],
    queryFn: () => accountingService.getLedgerName(),
  })
  const { data: jobHistoryData, isLoading: loadingHistory } = useQuery({
    queryKey: ['job-history', historyModal.jobCardId],
    queryFn: () => garageService.getJobApprovalHistory({ job_card_id: historyModal.jobCardId }),
    enabled: historyModal.open && !!historyModal.jobCardId,
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(s => ({ ...s, [k]: e.target.value }))
  const setField = (k: string) => (v: string) => setForm(s => ({ ...s, [k]: v }))
  const updateJobRow = (i: number, k: keyof JobRow) => (v: string) =>
    setJobRows(rows => rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r))

  const busList: any[] = buses?.data ?? []
  const catList: any[] = categories?.data ?? []
  const partsList: any[] = partsData?.data ?? []
  const staffList: any[] = staffData?.data ?? []
  const driverList: any[] = driversData?.data ?? []
  const entryList: any[] = entries?.data ?? []
  const ledgerList: any[] = ledgersData?.data ?? []

  const ledgerOptions = ledgerList.map((l: any) => ledgerOption(l))
  const partsOptions = partsList.map((p: any) => ({ value: String(p.part_id), label: p.part_name }))
  const catOptions = catList.map((c: any) => ({ value: String(c.id), label: c.name }))

  const partsTotal = completeParts.reduce((s, p) => s + (parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0), 0)
  const debitLedgerName = ledgerList.find((l: any) => String(l.id) === debitLedgerId)?.temple_name || ''
  const creditLedgerName = ledgerList.find((l: any) => String(l.id) === creditLedgerId)?.temple_name || ''

  const colValue = (r: any, key: string): string => {
    if (key === 'busNo')      return r.vehicle_number || ''
    if (key === 'category')   return r.repair_category_name || r.all_categories || ''
    if (key === 'assignedTo') return r.staff_name || ''
    if (key === 'createdBy')  return r.created_by || ''
    if (key === 'status') {
      const s = r.state || 'OPEN'
      if (s === 'CLOSED' || s === 'COMPLETED') return 'Completed'
      if (s === 'REJECTED') return 'Rejected'
      if (s === 'FINISHED') return 'Finished'
      return 'Open'
    }
    return ''
  }

  const filterColOptions = useMemo(() => {
    const keys = ['busNo', 'category', 'assignedTo', 'createdBy', 'status']
    const result: Record<string, string[]> = {}
    keys.forEach(k => {
      result[k] = Array.from(new Set(entryList.map(r => colValue(r, k)).filter(Boolean))).sort()
    })
    return result
  }, [entryList])

  const activeFilterCount = Object.values(colFilters).filter(v => v && v.length > 0).length

  const filteredEntryList = useMemo(() => {
    const hasFilter = Object.values(colFilters).some(v => v && v.length > 0)
    const list = hasFilter
      ? entryList.filter(r => {
          for (const [key, vals] of Object.entries(colFilters)) {
            if (!vals || vals.length === 0) continue
            if (!vals.includes(colValue(r, key))) return false
          }
          return true
        })
      : entryList
    return list.slice(0, 10)
  }, [entryList, colFilters])

  const downloadExcel = () => {
    const rows = filteredEntryList.map((r: any, i: number) => ({
      'Sl No':           i + 1,
      'Job Card Number': r.job_card_number,
      'Created Date':    fmtDate(r.job_date || r.created_at),
      'Due Days':        dueDays(r.job_date || r.created_at),
      'Bus No':          r.vehicle_number,
      'Repair Category': r.repair_category_name || r.all_categories || '',
      'Assigned To':     r.staff_name || '',
      'Created By':      r.created_by || '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Job Cards')
    XLSX.writeFile(wb, `JobCards_${Date.now()}.xlsx`)
  }

  const downloadPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    doc.setFontSize(13)
    doc.text('Active Job Cards', 40, 40)
    autoTable(doc, {
      startY: 60,
      head: [['Sl No', 'Job Card Number', 'Created Date', 'Due Days', 'Bus No', 'Repair Category', 'Assigned To', 'Created By']],
      body: filteredEntryList.map((r: any, i: number) => [
        i + 1, r.job_card_number, fmtDate(r.job_date || r.created_at),
        dueDays(r.job_date || r.created_at), r.vehicle_number,
        r.repair_category_name || r.all_categories || '',
        r.staff_name || '', r.created_by || '',
      ]),
      styles: { fontSize: 8 },
    })
    doc.save(`JobCards_${Date.now()}.pdf`)
  }

  // Auto-fill price when part selected in Complete modal
  const handlePartSelect = (i: number, part_id: string) => {
    const found = partsList.find((p: any) => String(p.part_id) === part_id)
    setCompleteParts(prev => prev.map((row, idx) =>
      idx === i ? { ...row, part_id, rate: found?.price ? String(found.price) : row.rate } : row
    ))
  }
  const updatePartRow = (i: number, field: keyof PartRow, value: string) =>
    setCompleteParts(prev => prev.map((row, idx) => idx === i ? { ...row, [field]: value } : row))

  const openCompleteModal = (row: any) => {
    setCompleteModal({ open: true, jobCardNo: row.job_card_number || '', jobCardId: row.id || null, job: row })
    setCompleteParts([emptyPartRow()])
    setDebitLedgerId('')
    setCreditLedgerId('')
    setCompleteRepeat(false)
    setCompleteRepeatDate('')
    setShowNewPart(false)
    setNewPart({ part_number: '', part_name: '', price: '', category_id: '' })
  }

  const closeCompleteModal = () => {
    setCompleteModal({ open: false, jobCardNo: '', jobCardId: null, job: null })
    setCompleteRepeat(false)
    setCompleteRepeatDate('')
  }

  const fmtDate = (d: any) => {
    if (!d) return '-'
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return '-'
    return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(-2)}`
  }

  const dueDays = (d: any) => {
    if (!d) return '-'
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return '-'
    const diff = Math.floor((Date.now() - dt.getTime()) / 86400000)
    return diff >= 0 ? diff : '-'
  }

  const { mutate: addRepair, isPending } = useMutation({
    mutationFn: () => garageService.addRepairEntry({
      job_date: form.job_date,
      vehicle_number: form.bus_no,
      odometer_reading: form.odometer,
      reported_driver_id: form.driver,
      is_repeated_job: 0,
      next_job_date: null,
      job_rows: jobRows,
      repair_category_id: jobRows[0]?.category,
      priority: jobRows[0]?.priority,
      assigned_to: jobRows[0]?.technician,
      remarks: jobRows[0]?.description,
      user_id: localStorage.getItem('user_id'),
      usr_nm: localStorage.getItem('usr_nm'),
    }),
    onSuccess: (res) => {
      if (res.status === 200) {
        const count = Array.isArray(res.data) ? res.data.length : 1
        toast.success(count > 1 ? `${count} job cards created!` : 'Job card created successfully!')
        qc.invalidateQueries({ queryKey: ['repair-entries'] })
        setForm({ job_date: todayISO(), bus_no: '', odometer: '', driver: '' })
        setJobRows([{ category: '', priority: 'Medium', technician: '', description: '' }])
        setSubmitted(false)
      } else toast.error('Failed to create job card')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: saveFinish, isPending: savingFinish } = useMutation({
    mutationFn: () => garageService.changeJobStatus({
      id:                finishModal.job?.id,
      state:             'FINISHED',
      finish_remarks:    finishRemarks,
      is_repeated_job:   finishRepeat ? 1 : 0,
      next_job_date:     finishRepeat ? finishRepeatDate : null,
      debit_ledger_id:   finishDebitLedgerId,
      credit_ledger_id:  finishCreditLedgerId,
    }),
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success('Job marked as finished!')
        setFinishModal({ open: false, job: null })
        setFinishRemarks('')
        setFinishRepeat(false)
        setFinishRepeatDate('')
        setFinishDebitLedgerId('')
        setFinishCreditLedgerId('')
        qc.invalidateQueries({ queryKey: ['repair-entries'] })
      } else toast.error('Failed to finish job')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, state }: { id: number; state: string }) =>
      garageService.changeJobStatus({ id, state }),
    onSuccess: (res: any) => {
      if (res.status === 200) {
        qc.invalidateQueries({ queryKey: ['repair-entries'] })
      } else toast.error('Failed to update status')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: saveComplete, isPending: savingComplete } = useMutation({
    mutationFn: () => {
      const filledParts = completeParts.filter(p => p.part_id)
      const total = filledParts.reduce((s, p) => s + (parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0), 0)
      return garageService.submitRepairTracking({
        id: completeModal.jobCardId,
        job_card_number: completeModal.jobCardNo,
        parts: filledParts.map(p => ({
          part_id: p.part_id,
          amount: (parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0),
        })),
        total_amount: total,
        debit_ledger_id: debitLedgerId,
        credit_ledger_id: creditLedgerId,
        is_job_repeated: completeRepeat ? 1 : 0,
        next_job_date: completeRepeat ? completeRepeatDate : null,
        user_id: localStorage.getItem('user_id'),
      })
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Job completed and parts saved!')
        closeCompleteModal()
        qc.invalidateQueries({ queryKey: ['repair-entries'] })
      } else toast.error('Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: createPart, isPending: creatingPart } = useMutation({
    mutationFn: () => garageService.addPart(newPart),
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success(`Part "${newPart.part_name}" added!`)
        qc.invalidateQueries({ queryKey: ['repair-parts'] })
        setNewPart({ part_number: '', part_name: '', price: '', category_id: '' })
        setShowNewPart(false)
      } else toast.error('Failed to add part')
    },
    onError: () => toast.error('Server error'),
  })

  const fieldErr = (v: string) => submitted && !v.trim() ? 'ring-2 ring-red-400 border-red-300' : ''
  const rowFieldErr = (v: string) => submitted && !v.trim() ? 'ring-2 ring-red-400 border-red-300' : ''

  const handleSubmit = () => {
    setSubmitted(true)
    const missing: string[] = []
    if (!form.job_date)   missing.push('Date')
    if (!form.bus_no)     missing.push('Vehicle Number')
    if (!form.odometer)   missing.push('Odometer')
    if (!form.driver)     missing.push('Driver')
    jobRows.forEach((r, i) => {
      const n = jobRows.length > 1 ? ` (row ${i + 1})` : ''
      if (!r.category)    missing.push(`Category${n}`)
      if (!r.technician)  missing.push(`Technician${n}`)
      if (!r.description) missing.push(`Issue Description${n}`)
    })
    if (missing.length > 0) {
      toast.error(`Please fill: ${missing.join(', ')}`)
      return
    }
    addRepair()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Garage & Maintenance" subtitle="Manage vehicle repairs, parts and job cards" />

      <>
        <GlassCard className="p-6" colorBar="bg-gradient-to-r from-orange-500 to-amber-500">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-500" /> Log Vehicle Repair
              </h2>
            </div>

            {/* Date, Vehicle, Odometer, Driver */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
              <div>
                <Label>Date <span className="text-red-500">*</span></Label>
                <Input type="date" value={form.job_date} onChange={f('job_date')} className={fieldErr(form.job_date)} />
              </div>
              <div>
                <Label>Vehicle Number <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  value={form.bus_no}
                  onChange={setField('bus_no')}
                  options={busList.map((b) => ({ value: b.bus_no, label: b.bus_no }))}
                  placeholder="Select Bus"
                  onReload={() => reloadBuses()}
                  reloading={loadingBuses}
                  className={fieldErr(form.bus_no)}
                />
              </div>
              <div>
                <Label>Odometer <span className="text-red-500">*</span></Label>
                <Input type="number" value={form.odometer} onChange={f('odometer')} className={fieldErr(form.odometer)} />
              </div>
              <div>
                <Label>Reported By (Driver) <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  value={form.driver}
                  onChange={setField('driver')}
                  options={driverList.map((d) => ({ value: String(d.id), label: d.nickname || d.driver_name || '' }))}
                  placeholder="Select Driver"
                  onReload={() => reloadDrivers()}
                  reloading={loadingDrivers}
                  className={fieldErr(form.driver)}
                />
              </div>
            </div>

            {/* Repair Category Rows */}
            <DynamicRows
              title="Repair Categories"
              columns={[
                { label: 'S.No',               className: 'w-10 shrink-0' },
                { label: 'Category *',          className: 'flex-[2]' },
                { label: 'Priority',            className: 'flex-1' },
                { label: 'Technician *',        className: 'flex-[2]' },
                { label: 'Issue Description *', className: 'flex-[3]' },
              ]}
              rows={jobRows}
              onAdd={() => setJobRows([...jobRows, { category: '', priority: 'Medium', technician: '', description: '' }])}
              onRemove={(i) => setJobRows(jobRows.filter((_, idx) => idx !== i))}
              renderRow={(r, i) => (
                <>
                  <div className="w-10 shrink-0 text-center text-sm font-bold text-slate-500">{i + 1}</div>
                  <div className="flex-[2] min-w-0">
                    <SearchableSelect
                      value={r.category}
                      onChange={updateJobRow(i, 'category')}
                      options={catOptions}
                      placeholder="Select Category"
                      onReload={() => reloadCats()}
                      reloading={loadingCats}
                      className={rowFieldErr(r.category)}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Select value={r.priority} onChange={(e) => updateJobRow(i, 'priority')(e.target.value)}>
                      <option>High</option><option>Medium</option><option>Low</option>
                    </Select>
                  </div>
                  <div className="flex-[2] min-w-0">
                    <SearchableSelect
                      value={r.technician}
                      onChange={updateJobRow(i, 'technician')}
                      options={staffList.map((s) => ({ value: String(s.id), label: s.fullName || s.nickName || '' }))}
                      placeholder="Select Technician"
                      onReload={() => reloadStaff()}
                      reloading={loadingStaff}
                      className={rowFieldErr(r.technician)}
                    />
                  </div>
                  <div className="flex-[3] min-w-0">
                    <Input
                      placeholder="Describe the problem..."
                      value={r.description}
                      onChange={(e) => updateJobRow(i, 'description')(e.target.value)}
                      className={rowFieldErr(r.description)}
                    />
                  </div>
                </>
              )}
            />

            <div className="flex justify-end mt-6">
              <Button onClick={handleSubmit} disabled={isPending}>
                <Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Generate Job Card'}
              </Button>
            </div>

          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">
                Active Job Cards
                <span className="ml-2 text-xs font-normal text-slate-400">
                  last {filteredEntryList.length}{entryList.length > filteredEntryList.length ? ` of ${entryList.length}` : ''}
                </span>
              </h3>
              <div className="flex gap-1.5">
                <ExportMenu onExport={(f) => f === 'excel' ? downloadExcel() : downloadPdf()} />
                {activeFilterCount > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active ·{' '}
                    <button onClick={() => setColFilters({})} className="text-blue-600 font-semibold hover:underline">Reset</button>
                  </span>
                )}
              </div>
            </div>
            <DualScrollTable tableClassName="overflow-auto max-h-[70vh]">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    {([
                      { label: 'Sl No' },
                      { label: 'Job Card Number' },
                      { label: 'Created Date' },
                      { label: 'Due Days' },
                      { label: 'Bus No',          fk: 'busNo' },
                      { label: 'Repair Category', fk: 'category' },
                      { label: 'Assigned To',     fk: 'assignedTo' },
                      { label: 'Created By',       fk: 'createdBy' },
                      { label: 'Status',           fk: 'status' },
                    ] as { label: string; fk?: string }[]).map(({ label, fk }) => (
                      <th key={label} className="sticky top-0 z-10 px-3 py-2.5 text-left text-xs font-bold text-white whitespace-nowrap bg-blue-600 border-r border-blue-500 last:border-0">
                        <div className="flex items-center gap-1.5">
                          <span>{label}</span>
                          {fk && (
                            <ColumnFilterDropdown
                              variant="light"
                              options={filterColOptions[fk] ?? []}
                              selected={colFilters[fk] ?? []}
                              onChange={vals => setColFilters(f => ({ ...f, [fk]: vals }))}
                            />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">Loading…</td></tr>
                  ) : filteredEntryList.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">No job cards found.</td></tr>
                  ) : filteredEntryList.map((r: any, i: number) => {
                    const state: string = r.state || 'OPEN'
                    const isFinished = state === 'FINISHED'
                    const isApproved = state === 'APPROVED'
                    const isDone     = state === 'CLOSED' || state === 'COMPLETED'
                    const isRejected = state === 'REJECTED'
                    const rowBg      = i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    const statusBadge = isDone
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Completed</span>
                      : isRejected
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">Rejected</span>
                      : isApproved
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">Approved</span>
                      : isFinished
                      ? <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Finished</span>
                      : <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Open</span>
                    return (
                      <>
                        <tr key={r.id} className={`${rowBg} hover:bg-blue-50/40 transition-colors`}>
                          <td className="px-3 py-3 border-b border-slate-100 text-slate-500 text-center">{i + 1}</td>
                          <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap">
                            <button
                              onClick={() => setHistoryModal({ open: true, job: r, jobCardId: r.id })}
                              className="font-semibold text-blue-700 hover:text-blue-900 hover:underline underline-offset-2 transition-colors flex items-center gap-1"
                            >
                              <History className="w-3 h-3 opacity-60" />
                              {r.job_card_number}
                            </button>
                          </td>
                          <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap text-slate-600">{fmtDate(r.job_date || r.created_at)}</td>
                          <td className="px-3 py-3 border-b border-slate-100 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{dueDays(r.job_date || r.created_at)}</span>
                          </td>
                          <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap text-slate-700">{r.vehicle_number}</td>
                          <td className="px-3 py-3 border-b border-slate-100 text-slate-700">{r.repair_category_name || r.all_categories || '-'}</td>
                          <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap text-slate-600">{r.staff_name || '-'}</td>
                          <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap text-slate-600">{r.created_by || '-'}</td>
                          <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap">{statusBadge}</td>
                        </tr>
                      </>
                    )
                  })}
                </tbody>
              </table>
            </DualScrollTable>
          </GlassCard>

          {/* ── Finish Job Modal ───────────────────────────────────────────── */}
          {finishModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-500" /> Finish Job
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{finishModal.job?.job_card_number} · {finishModal.job?.vehicle_number}</p>
                  </div>
                  <button onClick={() => setFinishModal({ open: false, job: null })} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <Label>Comments</Label>
                    <textarea
                      rows={3}
                      placeholder="Add any remarks or notes about the work done…"
                      value={finishRemarks}
                      onChange={(e) => setFinishRemarks(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>

                  {/* Ledger selection */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Accounting Entry</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl overflow-hidden border border-slate-200">
                        <div className="px-4 py-2.5 bg-blue-600">
                          <span className="text-sm font-bold text-white">Debit Account</span>
                        </div>
                        <div className="p-3">
                          <SearchableSelect
                            value={finishDebitLedgerId}
                            onChange={setFinishDebitLedgerId}
                            options={ledgerOptions}
                            placeholder="Select Debit Ledger"
                            onReload={() => reloadLedgers()}
                            reloading={loadingLedgers}
                          />
                        </div>
                      </div>
                      <div className="rounded-xl overflow-hidden border border-slate-200">
                        <div className="px-4 py-2.5 bg-emerald-600">
                          <span className="text-sm font-bold text-white">Credit Account</span>
                        </div>
                        <div className="p-3">
                          <SearchableSelect
                            value={finishCreditLedgerId}
                            onChange={setFinishCreditLedgerId}
                            options={ledgerOptions}
                            placeholder="Select Credit Ledger"
                            onReload={() => reloadLedgers()}
                            reloading={loadingLedgers}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                      <input
                        type="checkbox"
                        className="w-4 h-4 accent-amber-500"
                        checked={finishRepeat}
                        onChange={(e) => { setFinishRepeat(e.target.checked); setFinishRepeatDate('') }}
                      />
                      <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                        <RefreshCw className="w-3.5 h-3.5 text-amber-500" /> Repeat Job
                      </span>
                    </label>
                    {finishRepeat && (
                      <div className="mt-3 max-w-xs">
                        <Label>Next Job Date</Label>
                        <Input type="date" value={finishRepeatDate} onChange={(e) => setFinishRepeatDate(e.target.value)} min={todayISO()} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setFinishModal({ open: false, job: null })}>Cancel</Button>
                  <Button onClick={() => saveFinish()} disabled={savingFinish}>
                    <CheckCircle className="w-4 h-4" />{savingFinish ? 'Saving…' : 'Mark as Finished'}
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {/* ── Job History Modal ─────────────────────────────────────────── */}
          {historyModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                      <History className="w-4 h-4 text-blue-500" /> Job History
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {historyModal.job?.job_card_number} · {historyModal.job?.vehicle_number}
                    </p>
                  </div>
                  <button onClick={() => setHistoryModal({ open: false, job: null, jobCardId: null })} className="text-slate-400 hover:text-slate-600 p-1">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 p-6">
                  {loadingHistory ? (
                    <p className="text-sm text-slate-400 text-center py-8">Loading history…</p>
                  ) : (() => {
                    const stages: any[] = jobHistoryData?.data ?? []
                    if (stages.length === 0) return <p className="text-sm text-slate-400 text-center py-8">No history recorded yet.</p>
                    return (
                      <ol className="relative border-l border-slate-200 ml-3 space-y-6">
                        {stages.map((s: any, idx: number) => (
                          <li key={s.id ?? idx} className="ml-5">
                            <span className="absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 ring-4 ring-white">
                              <Clock className="w-2.5 h-2.5 text-blue-600" />
                            </span>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">{s.stage || s.action}</p>
                                {s.action && s.stage && (
                                  <p className="text-xs text-slate-500 mt-0.5">Action: <span className="font-semibold">{s.action}</span></p>
                                )}
                                {s.action_by_name && (
                                  <p className="text-xs text-slate-500">By: <span className="font-semibold text-slate-700">{s.action_by_name}</span></p>
                                )}
                                {s.remarks && (
                                  <p className="mt-1 text-xs text-slate-600 italic bg-slate-50 rounded-lg px-2 py-1">{s.remarks}</p>
                                )}
                              </div>
                              <time className="shrink-0 text-xs text-slate-400 whitespace-nowrap">{fmtDate(s.action_at)}</time>
                            </div>
                          </li>
                        ))}
                      </ol>
                    )
                  })()}
                </div>
                <div className="flex justify-end px-6 py-4 border-t border-slate-100 shrink-0">
                  <button onClick={() => setHistoryModal({ open: false, job: null, jobCardId: null })} className="px-4 py-2 text-sm font-semibold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {/* ── Complete Job Modal ─────────────────────────────────────────── */}
          {completeModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto"
              >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-500" /> Complete Job
                    </h3>
                    {completeModal.jobCardNo && (
                      <p className="text-xs text-amber-600 font-semibold mt-0.5">
                        Job Card: {completeModal.jobCardNo}
                        {completeModal.job?.vehicle_number && (
                          <span className="ml-2 text-slate-400">· {completeModal.job.vehicle_number}</span>
                        )}
                      </p>
                    )}
                  </div>
                  <button onClick={closeCompleteModal} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-6">
                  {/* Debit / Credit Ledger */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Accounting Entry</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Debit */}
                      <div className="rounded-xl overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-blue-600">
                          <span className="text-sm font-bold text-white">Debit Account</span>
                          <span className="text-sm font-extrabold text-white tabular-nums">₹{partsTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="p-3">
                          <SearchableSelect
                            value={debitLedgerId}
                            onChange={setDebitLedgerId}
                            options={ledgerOptions}
                            placeholder="Select Debit Ledger"
                            onReload={() => reloadLedgers()}
                            reloading={loadingLedgers}
                          />
                          {debitLedgerName && <p className="mt-2 text-xs text-blue-700 font-semibold truncate">{debitLedgerName}</p>}
                        </div>
                      </div>
                      {/* Credit */}
                      <div className="rounded-xl overflow-hidden border border-slate-200">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-600">
                          <span className="text-sm font-bold text-white">Credit Account</span>
                          <span className="text-sm font-extrabold text-white tabular-nums">₹{partsTotal.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="p-3">
                          <SearchableSelect
                            value={creditLedgerId}
                            onChange={setCreditLedgerId}
                            options={ledgerOptions}
                            placeholder="Select Credit Ledger"
                            onReload={() => reloadLedgers()}
                            reloading={loadingLedgers}
                          />
                          {creditLedgerName && <p className="mt-2 text-xs text-emerald-700 font-semibold truncate">{creditLedgerName}</p>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Spare Parts */}
                  <div>
                    <DynamicRows
                      title="Parts Consumed"
                      columns={[
                        { label: 'Category', className: 'flex-[2]' },
                        { label: 'Part',     className: 'flex-[2.5]' },
                        { label: 'Qty',      className: 'flex-[0.7]' },
                        { label: 'Rate (₹)', className: 'flex-[1.3]' },
                        { label: 'Total',    className: 'flex-[1.3]' },
                      ]}
                      rows={completeParts}
                      onAdd={() => setCompleteParts(prev => [...prev, emptyPartRow()])}
                      onRemove={(i) => setCompleteParts(prev => prev.filter((_, idx) => idx !== i))}
                      renderRow={(r, i) => {
                        const filteredParts = r.category_id
                          ? partsList.filter((p: any) => !p.category_id || String(p.category_id) === r.category_id)
                          : partsList
                        const rowPartsOptions = filteredParts.map((p: any) => ({ value: String(p.part_id), label: p.category_id ? p.part_name : `${p.part_name} (General)` }))
                        return (
                          <>
                            <div className="flex-[2] min-w-0">
                              <SearchableSelect
                                value={r.category_id}
                                onChange={(v) => setCompleteParts(prev => prev.map((row, idx) =>
                                  idx === i ? { ...row, category_id: v, part_id: '', rate: '' } : row
                                ))}
                                options={catOptions}
                                placeholder="Category"
                                onReload={() => reloadCats()}
                                reloading={loadingCats}
                              />
                            </div>
                            <div className="flex-[2.5] min-w-0">
                              <SearchableSelect
                                value={r.part_id}
                                onChange={(v) => handlePartSelect(i, v)}
                                options={rowPartsOptions}
                                placeholder="Select Part"
                                onReload={() => reloadParts()}
                                reloading={loadingParts}
                              />
                            </div>
                            <div className="flex-[0.7] min-w-0">
                              <Input type="number" min="1" value={r.qty} onChange={(e) => updatePartRow(i, 'qty', e.target.value)} />
                            </div>
                            <div className="flex-[1.3] min-w-0">
                              <Input type="number" placeholder="0.00" value={r.rate} onChange={(e) => updatePartRow(i, 'rate', e.target.value)} />
                            </div>
                            <div className="flex-[1.3] min-w-0">
                              <Input className="bg-slate-100 font-bold text-right" disabled value={((parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0)).toLocaleString('en-IN')} />
                            </div>
                          </>
                        )
                      }}
                    />

                    {/* Parts total row */}
                    {completeParts.some(p => p.part_id) && (
                      <div className="flex justify-end mt-2 px-2">
                        <div className="flex items-center gap-3 bg-slate-100 rounded-lg px-4 py-2">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Total Amount</span>
                          <span className="text-base font-extrabold text-emerald-700 tabular-nums">₹{partsTotal.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    )}

                    {/* New Part button — bottom of parts section */}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setShowNewPart(v => !v)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                      >
                        <PackagePlus className="w-3.5 h-3.5" /> {showNewPart ? 'Cancel New Part' : '+ New Part'}
                      </button>
                    </div>

                    {/* Inline new-part form */}
                    {showNewPart && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 p-4 rounded-xl border-2 border-amber-200 bg-amber-50/60 space-y-3"
                      >
                        <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Add New Spare Part</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label>Part Number</Label>
                            <Input
                              placeholder="e.g. PT-001"
                              value={newPart.part_number}
                              onChange={(e) => setNewPart(s => ({ ...s, part_number: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label>Category <span className="text-red-500">*</span></Label>
                            <SearchableSelect
                              value={newPart.category_id}
                              onChange={(v) => setNewPart(s => ({ ...s, category_id: v }))}
                              options={catOptions}
                              placeholder="Select Category"
                              onReload={() => reloadCats()}
                              reloading={loadingCats}
                            />
                          </div>
                          <div>
                            <Label>Part Name <span className="text-red-500">*</span></Label>
                            <Input
                              placeholder="e.g. Oil Filter"
                              value={newPart.part_name}
                              onChange={(e) => setNewPart(s => ({ ...s, part_name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label>Price (₹) <span className="text-red-500">*</span></Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={newPart.price}
                              onChange={(e) => setNewPart(s => ({ ...s, price: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setShowNewPart(false); setNewPart({ part_number: '', part_name: '', price: '', category_id: '' }) }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            disabled={creatingPart || !newPart.part_name || !newPart.price}
                            onClick={() => createPart()}
                          >
                            <Plus className="w-3.5 h-3.5" />{creatingPart ? 'Saving…' : 'Save Part'}
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Repeat Job */}
                <div className="pt-4 border-t border-slate-100">
                  <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-amber-500"
                      checked={completeRepeat}
                      onChange={(e) => { setCompleteRepeat(e.target.checked); setCompleteRepeatDate('') }}
                    />
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500" /> Repeat Job
                    </span>
                  </label>
                  {completeRepeat && (
                    <div className="mt-3 max-w-xs">
                      <Label>Next Job Date</Label>
                      <Input type="date" value={completeRepeatDate} onChange={(e) => setCompleteRepeatDate(e.target.value)} min={todayISO()} />
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
                  <span className="text-sm font-bold text-slate-700">
                    Total: <span className="text-emerald-700">₹{partsTotal.toLocaleString('en-IN')}</span>
                  </span>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={closeCompleteModal}>Cancel</Button>
                    <Button onClick={() => saveComplete()} disabled={savingComplete}>
                      <Save className="w-4 h-4" />{savingComplete ? 'Saving…' : 'Save & Complete Job'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
      </>
    </motion.div>
  )
}
