import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { motion } from 'motion/react'
import {
  CheckCircle, X, Save, PackagePlus, Plus, MinusCircle, AlertCircle, Eye, FileSpreadsheet, FileText, Pencil, RefreshCw, XCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  GlassCard, Button, Input, Label, PageHeader,
  DynamicRows, SearchableSelect, ColumnFilterDropdown,
} from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { fuelService } from '@/services/fuel.service'
import { accountingService } from '@/services/accounting.service'


type SimplePartRow = { part_id: string; qty: string; rate: string }
type JobRow = { category: string; priority: string; technician: string; description: string }
type LedgerEntry = { ledger_id: string; amount: string; ledger_name: string }
type VoucherBlock = { description: string; category_name: string; debit: LedgerEntry[]; credit: LedgerEntry[]; parts: SimplePartRow[] }
type JobNavState = { job_card_number: string; voucher_blocks?: VoucherBlock[]; c_number?: string; is_edit_mode?: boolean }

const emptySimplePartRow = (): SimplePartRow => ({ part_id: '', qty: '1', rate: '' })
const emptyJobRow = (): JobRow => ({ category: '', priority: 'Medium', technician: '', description: '' })
const emptyLedgerEntry = (): LedgerEntry => ({ ledger_id: '', amount: '', ledger_name: '' })
const emptyVoucherBlock = (): VoucherBlock => ({ description: '', category_name: '', debit: [emptyLedgerEntry()], credit: [emptyLedgerEntry()], parts: [emptySimplePartRow()] })

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High']

export default function RepairTrackingPage() {
  const qc = useQueryClient()
  const location = useLocation()
  const navigate  = useNavigate()

  // Set once from router state when navigated here via "Edit in Job Card"
  const navState    = location.state as JobNavState | null
  const isEditMode  = navState?.is_edit_mode === true
  const editCNumber = navState?.c_number ?? ''
  const editJobNum  = navState?.job_card_number ?? ''

  const [stageFilter, setStageFilter] = useState('OPEN')
  const [colFilters, setColFilters]   = useState<Record<string, string[]>>({})

  // View modal
  const [viewModal, setViewModal] = useState<{ open: boolean; job: any }>({ open: false, job: null })

  // Complete modal
  const [completeModal, setCompleteModal] = useState<{ open: boolean; job: any }>({ open: false, job: null })
  const [voucherBlocks, setVoucherBlocks]   = useState<VoucherBlock[]>([emptyVoucherBlock()])
  const [quickCompleteMode, setQuickCompleteMode] = useState(false)
  const [quickCompleteDesc, setQuickCompleteDesc] = useState('')
  const [createdVouchers, setCreatedVouchers] = useState<string[]>([])
  const [showNewPart, setShowNewPart]       = useState(false)
  const [newPart, setNewPart]               = useState({ part_number: '', part_name: '', price: '', category_id: '' })

  // Edit modal
  const [editModal, setEditModal] = useState<{ open: boolean; job: any }>({ open: false, job: null })
  const [editForm, setEditForm]   = useState({ bus_no: '', odometer: '', driver: '', edit_reason: '' })
  const [completeRepeat, setCompleteRepeat] = useState(false)
  const [completeRepeatDate, setCompleteRepeatDate] = useState('')
  const [editJobRows, setEditJobRows] = useState<JobRow[]>([emptyJobRow()])

  // Finish modal
  const [finishModal, setFinishModal]           = useState<{ open: boolean; job: any }>({ open: false, job: null })
  const [finishRemarks, setFinishRemarks]       = useState('')
  const [finishRepeat, setFinishRepeat]         = useState(false)
  const [finishRepeatDate, setFinishRepeatDate] = useState('')
  const [finishVoucherBlocks, setFinishVoucherBlocks] = useState<VoucherBlock[]>([emptyVoucherBlock()])

  // Approve modal
  const [approveModal, setApproveModal]             = useState<{ open: boolean; job: any }>({ open: false, job: null })
  const [approveRemarks, setApproveRemarks]         = useState('')
  const [approveVoucherBlocks, setApproveVoucherBlocks] = useState<VoucherBlock[]>([emptyVoucherBlock()])

  const [rejectModal, setRejectModal] = useState<{ open: boolean; job: any }>({ open: false, job: null })
  const [rejectReason, setRejectReason] = useState('')

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['repair-tracking'],
    queryFn: () => garageService.getRepairEntries({}),
  })
  const { data: partsData, refetch: reloadParts, isFetching: loadingParts } = useQuery({
    queryKey: ['repair-parts-track'],
    queryFn: () => garageService.getParts(),
  })
  const { data: ledgersData, refetch: reloadLedgers, isFetching: loadingLedgers } = useQuery({
    queryKey: ['ledger-names-track'],
    queryFn: () => accountingService.getLedgerName(),
  })
  const { data: catsData, refetch: reloadCats, isFetching: loadingCats } = useQuery({
    queryKey: ['repair-cats-track'],
    queryFn: () => garageService.getCategories(),
  })
  const { data: busesData, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({
    queryKey: ['buses-track'],
    queryFn: () => fuelService.getBusNumbers(),
  })
  const { data: driversData, refetch: reloadDrivers, isFetching: loadingDrivers } = useQuery({
    queryKey: ['drivers-track'],
    queryFn: () => garageService.getDriversList(),
  })
  const { data: staffData, refetch: reloadStaff, isFetching: loadingStaff } = useQuery({
    queryKey: ['staff-track'],
    queryFn: () => garageService.getStaff(),
  })

  // Job permissions
  const { data: permData } = useQuery({
    queryKey: ['job-permissions'],
    queryFn: () => garageService.checkJobPermission({
      user_id: localStorage.getItem('user_id'),
      role_type: localStorage.getItem('role_type'),
    }),
    staleTime: 60_000,
  })
  const canApprove: boolean = permData?.can_approve === 1
  const canComplete: boolean = permData?.can_complete === 1

  // Fetch existing voucher data when opened from "Edit in Job Card"
  const { data: editVoucherRaw } = useQuery({
    queryKey: ['job-edit-voucher', editCNumber],
    queryFn:  () => accountingService.getVoucherModalData({ serviceNo: editCNumber }),
    enabled:  isEditMode && !!editCNumber,
  })

  // Job categories (fetched when view or edit modal opens)
  const { data: jobCatsData, isLoading: loadingJobCats } = useQuery({
    queryKey: ['job-cats', viewModal.job?.id ?? editModal.job?.id],
    queryFn: () => garageService.getJobCategories({ job_card_id: viewModal.job?.id ?? editModal.job?.id }),
    enabled: (viewModal.open || editModal.open) && !!(viewModal.job?.id ?? editModal.job?.id),
  })
  const jobCategories: any[] = jobCatsData?.data ?? []

  // Stage data (parts + ledgers) — fetched when view or approve modal is open
  const stageJobId = viewModal.job?.id ?? approveModal.job?.id
  const { data: stageDataRaw } = useQuery({
    queryKey: ['job-stage-data', stageJobId],
    queryFn:  () => garageService.getJobStageData({ id: stageJobId }),
    enabled:  !!stageJobId && (viewModal.open || approveModal.open),
  })
  const stageParts:   any[] = stageDataRaw?.parts   ?? []
  const stageLedgers: any[] = stageDataRaw?.ledgers ?? []

  // ── Derived ──────────────────────────────────────────────────────────────────
  const list: any[]        = data?.data ?? []
  const partsList: any[]   = partsData?.data ?? []
  const ledgerList: any[]  = ledgersData?.data ?? []
  const catList: any[]     = catsData?.data ?? []
  const busList: any[]     = busesData?.data ?? []
  const driverList: any[]  = driversData?.data ?? []
  const staffList: any[]   = staffData?.data ?? []

  const partsOptions  = partsList.map((p: any) => ({ value: String(p.part_id), label: p.part_name }))
  const ledgerOptions = ledgerList.map((l: any) => ({ value: String(l.id), label: l.temple_name || l.name || '' }))
  const catOptions    = catList.map((c: any) => ({ value: String(c.id), label: c.name }))
  const busOptions    = busList.map((b: any) => ({ value: b.bus_no, label: b.bus_no }))
  const driverOptions = driverList.map((d: any) => ({ value: String(d.id), label: d.driver_name || d.nickname || '' }))
  const staffOptions  = staffList.map((s: any) => ({ value: String(s.id), label: s.fullName || s.nickName || '' }))

  const findLedger = (keyword: string): LedgerEntry => {
    const match = ledgerList.find((l: any) =>
      (l.temple_name || l.name || '').toLowerCase().includes(keyword.toLowerCase())
    )
    return match
      ? { ledger_id: String(match.id), amount: '', ledger_name: match.temple_name || match.name || '' }
      : emptyLedgerEntry()
  }

  const defaultDebitEntries = (): LedgerEntry[] => [
    findLedger('mechanical'),
    findLedger('spare'),
  ]

  const defaultVoucherBlock = (category_name = '', description = ''): VoucherBlock => ({
    description,
    category_name,
    parts:  [emptySimplePartRow()],
    debit:  defaultDebitEntries(),
    credit: [emptyLedgerEntry()],
  })

  const blockPartsTotals = voucherBlocks.map(b =>
    b.parts.reduce((s, p) => s + (parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0), 0)
  )
  const completeTotal = blockPartsTotals.reduce((s, t) => s + t, 0)

  const blockTotals = voucherBlocks.map(b => ({
    debit:  b.debit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    credit: b.credit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
  }))
  const totalDebitAllBlocks  = blockTotals.reduce((s, t) => s + t.debit, 0)
  const totalCreditAllBlocks = blockTotals.reduce((s, t) => s + t.credit, 0)
  const allBlocksBalanced = voucherBlocks.every((b, i) => {
    const hasEntry = b.debit.some(e => e.ledger_id) || b.credit.some(e => e.ledger_id)
    if (!hasEntry) return true
    const d = Math.round(blockTotals[i].debit  * 100)
    const c = Math.round(blockTotals[i].credit * 100)
    return d > 0 && d === c
  })

  // Finish modal computed values
  const finishBlockPartsTotals = finishVoucherBlocks.map(b =>
    b.parts.reduce((s, p) => s + (parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0), 0)
  )
  const finishTotal = finishBlockPartsTotals.reduce((s, t) => s + t, 0)
  const finishBlockTotals = finishVoucherBlocks.map(b => ({
    debit:  b.debit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    credit: b.credit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
  }))
  const totalFinishDebit  = finishBlockTotals.reduce((s, t) => s + t.debit, 0)
  const totalFinishCredit = finishBlockTotals.reduce((s, t) => s + t.credit, 0)
  const allFinishBlocksBalanced = finishVoucherBlocks.every((b, i) => {
    const hasEntry = b.debit.some(e => e.ledger_id) || b.credit.some(e => e.ledger_id)
    if (!hasEntry) return true
    const d = Math.round(finishBlockTotals[i].debit  * 100)
    const c = Math.round(finishBlockTotals[i].credit * 100)
    return d > 0 && d === c
  })

  // Approve modal computed values
  const approveBlockPartsTotals = approveVoucherBlocks.map(b =>
    b.parts.reduce((s, p) => s + (parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0), 0)
  )
  const approveTotal = approveBlockPartsTotals.reduce((s, t) => s + t, 0)
  const approveBlockTotals = approveVoucherBlocks.map(b => ({
    debit:  b.debit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    credit: b.credit.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
  }))
  const totalApproveDebit  = approveBlockTotals.reduce((s, t) => s + t.debit, 0)
  const totalApproveCredit = approveBlockTotals.reduce((s, t) => s + t.credit, 0)
  const allApproveBlocksBalanced = approveVoucherBlocks.every((b, i) => {
    const hasEntry = b.debit.some(e => e.ledger_id) || b.credit.some(e => e.ledger_id)
    if (!hasEntry) return true
    const d = Math.round(approveBlockTotals[i].debit  * 100)
    const c = Math.round(approveBlockTotals[i].credit * 100)
    return d > 0 && d === c
  })

  const getJobState = (r: any): string => r.state || 'OPEN'

  const colValue = (r: any, key: string): string => {
    if (key === 'busNo')      return r.vehicle_number || ''
    if (key === 'category')   return r.all_categories || r.repair_category_name || ''
    if (key === 'assignedTo') return r.staff_name || ''
    if (key === 'createdBy')  return r.created_by || ''
    return ''
  }

  const filterColOptions = useMemo(() => {
    const keys = ['busNo', 'category', 'assignedTo', 'createdBy']
    const result: Record<string, string[]> = {}
    keys.forEach(k => {
      result[k] = Array.from(new Set(list.map(r => colValue(r, k)).filter(Boolean))).sort()
    })
    return result
  }, [list])

  const activeFilterCount = Object.values(colFilters).filter(v => v && v.length > 0).length

  const filteredList = useMemo(() => {
    const byTab = stageFilter === 'all' ? list : list.filter(r => getJobState(r) === stageFilter)
    const hasCol = Object.values(colFilters).some(v => v && v.length > 0)
    if (!hasCol) return byTab
    return byTab.filter(r => {
      for (const [key, vals] of Object.entries(colFilters)) {
        if (!vals || vals.length === 0) continue
        if (!vals.includes(colValue(r, key))) return false
      }
      return true
    })
  }, [list, stageFilter, colFilters])

  const countByState = (s: string) => list.filter((r: any) => getJobState(r) === s).length

  // Auto-open complete modal when navigated here via "Edit in Job Card"
  const editModalOpened     = useRef(false)
  const approveFilledForJob = useRef<any>(null)
  useEffect(() => {
    if (!isEditMode || !editJobNum || list.length === 0) return
    if (!editVoucherRaw?.data) return
    if (ledgerList.length === 0) return
    if (editModalOpened.current) return
    const job = list.find((r: any) => r.job_card_number === editJobNum)
    if (!job) return
    editModalOpened.current = true
    const subRows: any[] = Array.isArray(editVoucherRaw.data[1]) ? editVoucherRaw.data[1] : []
    const debitEntries  = subRows.filter((r: any) => r.account_type === 'Debit Account')
    const creditEntries = subRows.filter((r: any) => r.account_type === 'Credit Account')
    const mainDesc: string = editVoucherRaw.data[0]?.[0]?.description || ''
    const toEntry = (r: any): LedgerEntry => {
      const id = String(r.ledger_id || r.subchildtwo_id || '')
      const nameFromList = ledgerList.find((l: any) => String(l.id) === id)?.temple_name || ''
      return {
        ledger_id:   id,
        amount:      String(r.amount || ''),
        ledger_name: String(r.expensives || '') || nameFromList,
      }
    }
    const blocks: VoucherBlock[] = [{
      description:   mainDesc,
      category_name: '',
      parts:         [emptySimplePartRow()],
      debit:  debitEntries.length  ? debitEntries.map(toEntry)  : [emptyLedgerEntry()],
      credit: creditEntries.length ? creditEntries.map(toEntry) : [emptyLedgerEntry()],
    }]
    setStageFilter('all')
    setVoucherBlocks(blocks)
    setQuickCompleteMode(false)
    setCreatedVouchers([])
    setCompleteModal({ open: true, job })
  }, [isEditMode, editJobNum, list, editVoucherRaw, ledgerList])

  const fmtDate = (d: any) => {
    if (!d) return '-'
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return '-'
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`
  }

  const dueDays = (d: any) => {
    if (!d) return '-'
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return '-'
    const diff = Math.floor((Date.now() - dt.getTime()) / 86400000)
    return diff >= 0 ? diff : '-'
  }

  const statusBadge = (state: string) => {
    if (state === 'CLOSED' || state === 'COMPLETED')
      return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Completed</span>
    if (state === 'REJECTED')
      return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600">Rejected</span>
    if (state === 'APPROVED')
      return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-violet-100 text-violet-700">Approved</span>
    if (state === 'FINISHED')
      return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">Finished</span>
    return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Open</span>
  }

  // Auto-sync each block's single debit/credit row with that block's parts total
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!completeModal.open || quickCompleteMode) return
    setVoucherBlocks(blocks => blocks.map((b, bi) => {
      const t = blockPartsTotals[bi] ?? 0
      if (t === 0) return b
      return {
        ...b,
        debit:  b.debit.length  === 1 ? [{ ...b.debit[0],  amount: String(t) }] : b.debit,
        credit: b.credit.length === 1 ? [{ ...b.credit[0], amount: String(t) }] : b.credit,
      }
    }))
  }, [blockPartsTotals.join(','), quickCompleteMode])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!finishModal.open) return
    setFinishVoucherBlocks(blocks => blocks.map((b, bi) => {
      const t = finishBlockPartsTotals[bi] ?? 0
      if (t === 0) return b
      return {
        ...b,
        debit:  b.debit.length  === 1 ? [{ ...b.debit[0],  amount: String(t) }] : b.debit,
        credit: b.credit.length === 1 ? [{ ...b.credit[0], amount: String(t) }] : b.credit,
      }
    }))
  }, [finishBlockPartsTotals.join(','), finishModal.open])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!approveModal.open) return
    setApproveVoucherBlocks(blocks => blocks.map((b, bi) => {
      const t = approveBlockPartsTotals[bi] ?? 0
      if (t === 0) return b
      return {
        ...b,
        debit:  b.debit.length  === 1 ? [{ ...b.debit[0],  amount: String(t) }] : b.debit,
        credit: b.credit.length === 1 ? [{ ...b.credit[0], amount: String(t) }] : b.credit,
      }
    }))
  }, [approveBlockPartsTotals.join(','), approveModal.open])

  // Pre-fill Approve modal with parts + ledgers saved during Finish stage
  useEffect(() => {
    if (!approveModal.open || !approveModal.job) return
    if (!stageDataRaw) return
    if (approveFilledForJob.current === approveModal.job.id) return
    approveFilledForJob.current = approveModal.job.id
    const debitEntries: LedgerEntry[] = stageLedgers
      .filter((l: any) => l.entry_type === 'debit')
      .map((l: any) => ({ ledger_id: String(l.ledger_id), amount: String(l.amount), ledger_name: l.ledger_name || '' }))
    const creditEntries: LedgerEntry[] = stageLedgers
      .filter((l: any) => l.entry_type === 'credit')
      .map((l: any) => ({ ledger_id: String(l.ledger_id), amount: String(l.amount), ledger_name: l.ledger_name || '' }))
    const partsRows: SimplePartRow[] = stageParts.map((p: any) => ({
      part_id: String(p.part_id),
      qty:     String(p.qty || 1),
      rate:    String(p.rate || 0),
    }))
    setApproveVoucherBlocks([{
      description:   '',
      category_name: '',
      parts:  partsRows.length  > 0 ? partsRows        : [emptySimplePartRow()],
      debit:  debitEntries.length  > 0 ? debitEntries  : defaultDebitEntries(),
      credit: creditEntries.length > 0 ? creditEntries : [emptyLedgerEntry()],
    }])
  }, [approveModal.open, approveModal.job?.id, stageDataRaw])

  // ── Downloads ────────────────────────────────────────────────────────────────
  const downloadExcel = () => {
    const rows = filteredList.map((r: any, i: number) => ({
      'Sl No':           i + 1,
      'Job Card Number': r.job_card_number,
      'Created Date':    fmtDate(r.job_date || r.created_at),
      'Due Days':        dueDays(r.job_date || r.created_at),
      'Bus No':          r.vehicle_number,
      'Repair Category': r.all_categories || r.repair_category_name || '',
      'Assigned To':     r.staff_name || '',
      'Created By':      r.created_by || '',
      'Status':          getJobState(r),
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Repair Tracking')
    XLSX.writeFile(wb, `RepairTracking_${Date.now()}.xlsx`)
  }

  const downloadPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
    doc.setFontSize(13)
    doc.text('Repair Tracking', 40, 40)
    autoTable(doc, {
      startY: 60,
      head: [['Sl No', 'Job Card Number', 'Created Date', 'Due Days', 'Bus No', 'Repair Category', 'Assigned To', 'Created By', 'Status']],
      body: filteredList.map((r: any, i: number) => [
        i + 1, r.job_card_number, fmtDate(r.job_date || r.created_at),
        dueDays(r.job_date || r.created_at), r.vehicle_number,
        r.all_categories || r.repair_category_name || '',
        r.staff_name || '', r.created_by || '', getJobState(r),
      ]),
      styles: { fontSize: 8 },
    })
    doc.save(`RepairTracking_${Date.now()}.pdf`)
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const updateBlockPart = (bIdx: number, pIdx: number, field: keyof SimplePartRow, value: string) =>
    setVoucherBlocks(prev => prev.map((b, bi) => bi !== bIdx ? b : {
      ...b,
      parts: b.parts.map((p, pi) => pi !== pIdx ? p : { ...p, [field]: value }),
    }))

  const handleBlockPartSelect = (bIdx: number, pIdx: number, part_id: string) => {
    const found = partsList.find((p: any) => String(p.part_id) === part_id)
    setVoucherBlocks(prev => prev.map((b, bi) => bi !== bIdx ? b : {
      ...b,
      parts: b.parts.map((p, pi) => pi !== pIdx ? p : {
        ...p, part_id, rate: found?.price ? String(found.price) : p.rate,
      }),
    }))
  }

  const openCompleteFromView = () => {
    const job = viewModal.job
    const blocks = jobCategories.length > 0
      ? jobCategories.map((c: any) => defaultVoucherBlock(c.category_name || '', c.category_name || ''))
      : [defaultVoucherBlock()]
    setVoucherBlocks(blocks)
    setQuickCompleteMode(false)
    setQuickCompleteDesc('')
    setCreatedVouchers([])
    setShowNewPart(false)
    setNewPart({ part_number: '', part_name: '', price: '', category_id: '' })
    setViewModal({ open: false, job: null })
    setCompleteModal({ open: true, job })
  }

  const openEditFromView = () => {
    const job = viewModal.job
    const rows = jobCategories.length > 0
      ? jobCategories.map((c: any) => ({
          category: String(c.category_id),
          priority: c.priority || 'Medium',
          technician: String(c.technician_id || ''),
          description: c.description || '',
        }))
      : [{ category: String(job.repair_category_id || ''), priority: job.priority || 'Medium', technician: String(job.assigned_to || ''), description: job.remarks || '' }]
    setEditForm({
      bus_no: job.vehicle_number || '',
      odometer: job.odometer_reading || '',
      driver: String(job.reported_driver_id || ''),
      edit_reason: '',
    })
    setEditJobRows(rows)
    setViewModal({ open: false, job: null })
    setEditModal({ open: true, job })
  }

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const resetCompleteModal = () => {
    setCompleteModal({ open: false, job: null })
    setVoucherBlocks([emptyVoucherBlock()])
    setQuickCompleteMode(false)
    setQuickCompleteDesc('')
    setCreatedVouchers([])
    setCompleteRepeat(false)
    setCompleteRepeatDate('')
  }

  const { mutate: saveComplete, isPending: savingComplete } = useMutation({
    mutationFn: () => {
      if (quickCompleteMode) {
        return garageService.submitRepairTracking({
          id:              completeModal.job?.id,
          job_card_number: completeModal.job?.job_card_number,
          quick_complete:  true,
          description:     quickCompleteDesc,
          user_id:         localStorage.getItem('user_id'),
        })
      }
      const allParts = voucherBlocks.flatMap(b =>
        b.parts.filter(p => p.part_id).map(p => ({
          part_id: p.part_id,
          amount:  (parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0),
        }))
      )
      const blocks = voucherBlocks
        .filter(b => b.debit.some(e => e.ledger_id) || b.credit.some(e => e.ledger_id))
        .map(b => ({
          description: b.description,
          debit:  b.debit.filter(e => e.ledger_id && e.amount),
          credit: b.credit.filter(e => e.ledger_id && e.amount),
        }))
      return garageService.submitRepairTracking({
        id:              completeModal.job?.id,
        job_card_number: completeModal.job?.job_card_number,
        vehicle_number:  completeModal.job?.vehicle_number,
        driver_name:     completeModal.job?.driver_name || '',
        parts:           allParts,
        total_amount:    completeTotal,
        voucher_blocks:  blocks,
        is_job_repeated: completeRepeat ? 1 : 0,
        next_job_date:   completeRepeat ? completeRepeatDate : null,
        user_id:         localStorage.getItem('user_id'),
        entry_by:        localStorage.getItem('usr_nm') || '',
      })
    },
    onSuccess: (res: any) => {
      if (res.status === 200) {
        const vNums: string[] = res.voucher_numbers || []
        qc.invalidateQueries({ queryKey: ['repair-tracking'] })
        if (vNums.length > 0) {
          setCreatedVouchers(vNums)
          toast.success(`Job completed! ${vNums.length} voucher(s) created.`)
        } else {
          toast.success('Job completed!')
          resetCompleteModal()
        }
      } else toast.error('Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: saveEdit, isPending: savingEdit } = useMutation({
    mutationFn: () => garageService.editJob({
      id:                 editModal.job?.id,
      job_card_number:    editModal.job?.job_card_number,
      vehicle_number:     editForm.bus_no,
      odometer_reading:   editForm.odometer,
      reported_driver_id: editForm.driver,
      is_repeated_job:    0,
      next_job_date:      null,
      job_rows:           editJobRows,
      edit_reason:        editForm.edit_reason,
      user_id:            localStorage.getItem('user_id'),
    }),
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success('Job updated!')
        setEditModal({ open: false, job: null })
        qc.invalidateQueries({ queryKey: ['repair-tracking'] })
        qc.invalidateQueries({ queryKey: ['repair-entries'] })
      } else toast.error('Failed to update')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: updateVoucher, isPending: updatingVoucher } = useMutation({
    mutationFn: () => {
      const blocks = voucherBlocks
        .filter(b => b.debit.some(e => e.ledger_id) || b.credit.some(e => e.ledger_id))
        .map(b => ({
          description: b.description,
          debit:  b.debit.filter(e => e.ledger_id && e.amount),
          credit: b.credit.filter(e => e.ledger_id && e.amount),
        }))
      return garageService.updateJobVoucher({
        c_number:      editCNumber,
        voucher_blocks: blocks,
        user_id:       localStorage.getItem('user_id'),
        user_name:     localStorage.getItem('usr_nm') || '',
      })
    },
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success('Voucher updated successfully!')
        resetCompleteModal()
        qc.invalidateQueries({ queryKey: ['voucher-search'] })
        qc.invalidateQueries({ queryKey: ['voucher-approved-all'] })
        navigate(-1)
      } else toast.error('Failed to update voucher')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: saveFinish, isPending: savingFinish } = useMutation({
    mutationFn: () => {
      const allParts = finishVoucherBlocks.flatMap(b =>
        b.parts.filter(p => p.part_id).map(p => ({
          part_id: p.part_id,
          qty:     parseFloat(p.qty)  || 1,
          rate:    parseFloat(p.rate) || 0,
          amount:  (parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0),
        }))
      )
      const blocks = finishVoucherBlocks
        .filter(b => b.debit.some(e => e.ledger_id) || b.credit.some(e => e.ledger_id))
        .map(b => ({
          description: b.description,
          debit:  b.debit.filter(e => e.ledger_id && e.amount),
          credit: b.credit.filter(e => e.ledger_id && e.amount),
        }))
      return garageService.changeJobStatus({
        id:               finishModal.job?.id,
        job_card_number:  finishModal.job?.job_card_number,
        state:            'FINISHED',
        finish_remarks:   finishRemarks,
        is_repeated_job:  finishRepeat ? 1 : 0,
        next_job_date:    finishRepeat ? finishRepeatDate : null,
        parts:            allParts,
        total_amount:     finishTotal,
        voucher_blocks:   blocks,
      })
    },
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success('Job marked as finished!')
        setFinishModal({ open: false, job: null })
        setFinishRemarks('')
        setFinishRepeat(false)
        setFinishRepeatDate('')
        setFinishVoucherBlocks([emptyVoucherBlock()])
        qc.invalidateQueries({ queryKey: ['repair-tracking'] })
      } else toast.error('Failed to finish job')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: saveApprove, isPending: savingApprove } = useMutation({
    mutationFn: () => {
      const allParts = approveVoucherBlocks.flatMap(b =>
        b.parts.filter(p => p.part_id).map(p => ({
          part_id: p.part_id,
          qty:     parseFloat(p.qty)  || 1,
          rate:    parseFloat(p.rate) || 0,
          amount:  (parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0),
        }))
      )
      const blocks = approveVoucherBlocks
        .filter(b => b.debit.some(e => e.ledger_id) || b.credit.some(e => e.ledger_id))
        .map(b => ({
          description: b.description,
          debit:  b.debit.filter(e => e.ledger_id && e.amount),
          credit: b.credit.filter(e => e.ledger_id && e.amount),
        }))
      return garageService.changeJobStatus({
        id:               approveModal.job?.id,
        job_card_number:  approveModal.job?.job_card_number,
        state:            'APPROVED',
        approval_remarks: approveRemarks,
        parts:            allParts,
        total_amount:     approveTotal,
        voucher_blocks:   blocks,
      })
    },
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success('Job approved!')
        setApproveModal({ open: false, job: null })
        setApproveRemarks('')
        setApproveVoucherBlocks([emptyVoucherBlock()])
        qc.invalidateQueries({ queryKey: ['repair-tracking'] })
      } else toast.error('Failed to approve job')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: saveReject, isPending: savingReject } = useMutation({
    mutationFn: () => garageService.jobWorkflowAction({
      action:          'reject',
      id:              rejectModal.job?.id,
      job_card_number: rejectModal.job?.job_card_number,
      remarks:         rejectReason,
      user_id:         localStorage.getItem('user_id'),
    }),
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success('Job rejected.')
        setRejectModal({ open: false, job: null })
        setRejectReason('')
        qc.invalidateQueries({ queryKey: ['repair-tracking'] })
      } else toast.error('Failed to reject')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, state }: { id: number; state: string }) =>
      garageService.changeJobStatus({ id, state }),
    onSuccess: (res: any) => {
      if (res.status === 200) qc.invalidateQueries({ queryKey: ['repair-tracking'] })
      else toast.error('Failed to update status')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: createPart, isPending: creatingPart } = useMutation({
    mutationFn: () => garageService.addPart(newPart),
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success(`Part "${newPart.part_name}" added!`)
        qc.invalidateQueries({ queryKey: ['repair-parts-track'] })
        setNewPart({ part_number: '', part_name: '', price: '', category_id: '' })
        setShowNewPart(false)
      } else toast.error('Failed to add part')
    },
    onError: () => toast.error('Server error'),
  })

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Repair Tracking" subtitle="View job cards and mark them as completed" />

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'all',      label: 'All',       count: list.length,            active: 'bg-slate-700 text-white border-slate-700',       inactive: 'bg-white text-slate-600 border-slate-200 hover:border-slate-400' },
          { key: 'OPEN',     label: 'Open',      count: countByState('OPEN'),   active: 'bg-amber-500 text-white border-amber-500',        inactive: 'bg-white text-amber-600 border-amber-200 hover:border-amber-400' },
          { key: 'FINISHED', label: 'Finished',  count: countByState('FINISHED'), active: 'bg-blue-600 text-white border-blue-600',        inactive: 'bg-white text-blue-600 border-blue-200 hover:border-blue-400' },
          { key: 'APPROVED', label: 'Approved',  count: countByState('APPROVED'), active: 'bg-violet-600 text-white border-violet-600',    inactive: 'bg-white text-violet-600 border-violet-200 hover:border-violet-400' },
          { key: 'CLOSED',   label: 'Completed', count: countByState('CLOSED'), active: 'bg-emerald-600 text-white border-emerald-600',    inactive: 'bg-white text-emerald-600 border-emerald-200 hover:border-emerald-400' },
          { key: 'REJECTED', label: 'Rejected',  count: countByState('REJECTED'), active: 'bg-red-500 text-white border-red-500',         inactive: 'bg-white text-red-500 border-red-200 hover:border-red-400' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setStageFilter(t.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all ${stageFilter === t.key ? t.active : t.inactive}`}
          >
            {t.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-extrabold ${stageFilter === t.key ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
              {t.count}
            </span>
          </button>
        ))}
        <div className="ml-auto flex gap-1.5 items-center">
          <button onClick={downloadExcel} className="inline-flex items-center gap-1 h-9 px-3 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
          </button>
          <button onClick={downloadPdf} className="inline-flex items-center gap-1 h-9 px-3 rounded-xl text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors">
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Job cards table */}
      <GlassCard className="overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-700">
            Job Cards
            <span className="ml-2 text-xs font-normal text-slate-400">{filteredList.length}</span>
          </h3>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active ·{' '}
              <button onClick={() => setColFilters({})} className="text-blue-600 font-semibold hover:underline">Clear all</button>
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
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
                  { label: 'Status' },
                  { label: 'Action' },
                ] as { label: string; fk?: string }[]).map(({ label, fk }) => (
                  <th key={label} className="px-3 py-2.5 text-left text-xs font-bold text-white whitespace-nowrap bg-blue-600 border-r border-blue-500 last:border-0">
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
                <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-400">Loading…</td></tr>
              ) : filteredList.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-sm text-slate-400">No job cards found.</td></tr>
              ) : filteredList.map((r: any, i: number) => {
                const state = getJobState(r)
                const isOpen     = state === 'OPEN'
                const isFinished = state === 'FINISHED'
                const isApproved = state === 'APPROVED'
                const isDone     = state === 'CLOSED' || state === 'COMPLETED'
                const isRejected = state === 'REJECTED'
                return (
                  <tr key={r.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/40 transition-colors`}>
                    <td className="px-3 py-3 border-b border-slate-100 text-slate-500 text-center">{i + 1}</td>
                    <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-blue-700">{r.job_card_number}</span>
                        {r.insertion_type === 'Automatic' && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-[10px] font-bold">
                            <RefreshCw className="w-2.5 h-2.5" /> AUTO
                          </span>
                        )}
                        {r.parent_job_card_number && (
                          <span className="text-[10px] text-slate-400 font-medium">from {r.parent_job_card_number}</span>
                        )}
                        {r.next_job_date && (() => {
                          const days = Math.ceil((new Date(r.next_job_date).getTime() - Date.now()) / 86400000)
                          return (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${days < 0 ? 'bg-red-100 text-red-600' : days <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                              Next: {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                            </span>
                          )
                        })()}
                      </div>
                    </td>
                    <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap text-slate-600">{fmtDate(r.job_date || r.created_at)}</td>
                    <td className="px-3 py-3 border-b border-slate-100 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">{dueDays(r.job_date || r.created_at)}</span>
                    </td>
                    <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap text-slate-700">{r.vehicle_number}</td>
                    <td className="px-3 py-3 border-b border-slate-100 text-slate-700">{r.all_categories || r.repair_category_name || '-'}</td>
                    <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap text-slate-600">{r.staff_name || '-'}</td>
                    <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap text-slate-600">{r.created_by || '-'}</td>
                    <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap">{statusBadge(state)}</td>
                    <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setViewModal({ open: true, job: r })} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors">
                          View
                        </button>
                        {isOpen && (
                          <button onClick={() => { setFinishRemarks(''); setFinishRepeat(false); setFinishRepeatDate(''); setFinishVoucherBlocks([defaultVoucherBlock()]); setFinishModal({ open: true, job: r }) }} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors">
                            Finish
                          </button>
                        )}
                        {isFinished && canApprove && (
                          <button onClick={() => { approveFilledForJob.current = null; setApproveRemarks(''); setApproveVoucherBlocks([emptyVoucherBlock()]); setApproveModal({ open: true, job: r }) }} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors">
                            Approve
                          </button>
                        )}
                        {isApproved && canComplete && (
                          <button onClick={() => { setVoucherBlocks([defaultVoucherBlock()]); setQuickCompleteMode(false); setCreatedVouchers([]); setCompleteModal({ open: true, job: r }) }} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
                            Complete
                          </button>
                        )}
                        {(isOpen || isFinished) && (
                          <button onClick={() => setRejectModal({ open: true, job: r })} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors">
                            Reject
                          </button>
                        )}
                        {(isDone || isRejected) && (
                          <button onClick={() => updateStatus({ id: r.id, state: 'OPEN' })} className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-colors">
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ── View Details Modal ────────────────────────────────────────────────── */}
      {viewModal.open && viewModal.job && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-base font-bold text-slate-800">Job Card Details</h3>
                <p className="text-xs text-slate-500 mt-0.5">{viewModal.job.job_card_number} · {viewModal.job.vehicle_number}</p>
              </div>
              <button onClick={() => setViewModal({ open: false, job: null })} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                {[
                  ['Vehicle',  viewModal.job.vehicle_number || '—'],
                  ['Driver',   viewModal.job.driver_name || '—'],
                  ['Odometer', viewModal.job.odometer_reading || '—'],
                  ['Date',     fmtDate(viewModal.job.job_date || viewModal.job.created_at)],
                  ['Status',   (() => { const s = viewModal.job.state || 'OPEN'; if (s === 'CLOSED' || s === 'COMPLETED') return 'Completed'; if (s === 'REJECTED') return 'Rejected'; if (s === 'APPROVED') return 'Approved'; if (s === 'FINISHED') return 'Finished'; return 'Open' })()],
                  ['Amount',   `₹${viewModal.job.total_amount ?? 0}`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-xl px-4 py-3">
                    <div className="text-xs text-slate-400 font-semibold mb-0.5">{k}</div>
                    <div className="font-bold text-slate-800">{v}</div>
                  </div>
                ))}
              </div>

              {/* Categories */}
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3">Repair Categories</h4>
                {loadingJobCats ? (
                  <div className="text-sm text-slate-400 py-4 text-center">Loading categories…</div>
                ) : jobCategories.length === 0 ? (
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Category</span>
                      <span className="font-semibold">{viewModal.job.repair_category_name || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-slate-500">Priority</span>
                      <span className="font-semibold">{viewModal.job.priority || '—'}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-slate-500">Technician</span>
                      <span className="font-semibold">{viewModal.job.staff_name || '—'}</span>
                    </div>
                    {viewModal.job.remarks && (
                      <div className="mt-2 text-sm">
                        <span className="text-slate-500">Description: </span>
                        <span className="font-semibold">{viewModal.job.remarks}</span>
                      </div>
                    )}
                    {viewModal.job.finish_remarks && (
                      <div className="mt-2 text-sm">
                        <span className="text-slate-500">Finish Reason: </span>
                        <span className="font-semibold">{viewModal.job.finish_remarks}</span>
                      </div>
                    )}
                    {viewModal.job.approval_remarks && (
                      <div className="mt-2 text-sm">
                        <span className="text-slate-500">Approval Remarks: </span>
                        <span className="font-semibold">{viewModal.job.approval_remarks}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobCategories.map((cat: any, idx: number) => (
                      <div key={idx} className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-xs font-bold">{idx + 1}</span>
                          <span className="font-bold text-slate-800">{cat.category_name}</span>
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${cat.priority === 'High' ? 'bg-red-100 text-red-700' : cat.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                            {cat.priority}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 space-y-1">
                          {cat.technician_name && <div>Technician: <span className="font-semibold text-slate-700">{cat.technician_name}</span></div>}
                          {cat.description && <div>Note: <span className="font-semibold text-slate-700">{cat.description}</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

              {/* Parts used */}
              {stageParts.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Parts Used</h4>
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Part</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-slate-600">Qty</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-slate-600">Rate</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-slate-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stageParts.map((p: any, i: number) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                            <td className="px-3 py-2 font-medium text-slate-700">{p.part_name || p.part_id}</td>
                            <td className="px-3 py-2 text-right text-slate-600">{p.qty}</td>
                            <td className="px-3 py-2 text-right text-slate-600">₹{Number(p.rate).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2 text-right font-bold text-slate-800">₹{Number(p.amount).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        <tr className="bg-blue-50 border-t border-blue-100">
                          <td colSpan={3} className="px-3 py-2 text-xs font-bold text-blue-700 text-right">Total</td>
                          <td className="px-3 py-2 text-right font-extrabold text-blue-700">
                            ₹{stageParts.reduce((s: number, p: any) => s + Number(p.amount), 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Ledger entries */}
              {stageLedgers.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3">Accounting Entries</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-blue-100 bg-blue-50/30 overflow-hidden">
                      <div className="px-3 py-2 bg-blue-600">
                        <span className="text-xs font-bold text-white">Debit</span>
                      </div>
                      <div className="p-2 space-y-1">
                        {stageLedgers.filter((l: any) => l.entry_type === 'debit').length === 0 ? (
                          <p className="text-xs text-slate-400 px-1">No debit entries</p>
                        ) : stageLedgers.filter((l: any) => l.entry_type === 'debit').map((l: any, i: number) => (
                          <div key={i} className="flex justify-between items-center px-2 py-1.5 bg-white rounded-lg border border-blue-100">
                            <span className="text-xs font-medium text-slate-700">{l.ledger_name || `Ledger #${l.ledger_id}`}</span>
                            <span className="text-xs font-bold text-blue-700">₹{Number(l.amount).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 overflow-hidden">
                      <div className="px-3 py-2 bg-emerald-600">
                        <span className="text-xs font-bold text-white">Credit</span>
                      </div>
                      <div className="p-2 space-y-1">
                        {stageLedgers.filter((l: any) => l.entry_type === 'credit').length === 0 ? (
                          <p className="text-xs text-slate-400 px-1">No credit entries</p>
                        ) : stageLedgers.filter((l: any) => l.entry_type === 'credit').map((l: any, i: number) => (
                          <div key={i} className="flex justify-between items-center px-2 py-1.5 bg-white rounded-lg border border-emerald-100">
                            <span className="text-xs font-medium text-slate-700">{l.ledger_name || `Ledger #${l.ledger_id}`}</span>
                            <span className="text-xs font-bold text-emerald-700">₹{Number(l.amount).toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center sticky bottom-0 bg-white">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setViewModal({ open: false, job: null })}>Close</Button>
                {(() => {
                  const vs = viewModal.job.state || 'OPEN'
                  const notDone = vs !== 'CLOSED' && vs !== 'COMPLETED' && vs !== 'REJECTED'
                  return (
                    <>
                      {notDone && (
                        <Button variant="outline" onClick={openEditFromView} disabled={loadingJobCats}>
                          <Pencil className="w-4 h-4" /> Edit Job
                        </Button>
                      )}
                      {(vs === 'OPEN' || vs === 'FINISHED') && (
                        <Button variant="danger" onClick={() => { setRejectModal({ open: true, job: viewModal.job }); setRejectReason(''); setViewModal({ open: false, job: null }) }} disabled={loadingJobCats}>
                          <XCircle className="w-4 h-4" /> Reject
                        </Button>
                      )}
                      {vs === 'OPEN' && (
                        <Button variant="outline" onClick={() => { setFinishRemarks(''); setFinishRepeat(false); setFinishRepeatDate(''); setFinishVoucherBlocks([defaultVoucherBlock()]); setFinishModal({ open: true, job: viewModal.job }); setViewModal({ open: false, job: null }) }} disabled={loadingJobCats}>
                          <CheckCircle className="w-4 h-4 text-blue-500" /> Finish Job
                        </Button>
                      )}
                      {vs === 'FINISHED' && canApprove && (
                        <Button variant="purple" onClick={() => { approveFilledForJob.current = null; setApproveRemarks(''); setApproveVoucherBlocks([emptyVoucherBlock()]); setApproveModal({ open: true, job: viewModal.job }); setViewModal({ open: false, job: null }) }} disabled={loadingJobCats}>
                          <CheckCircle className="w-4 h-4" /> Approve
                        </Button>
                      )}
                      {vs === 'APPROVED' && canComplete && (
                        <Button onClick={openCompleteFromView} disabled={loadingJobCats}>
                          <CheckCircle className="w-4 h-4" /> Complete Job
                        </Button>
                      )}
                    </>
                  )
                })()}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Complete Job Modal ────────────────────────────────────────────────── */}
      {completeModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  {isEditMode
                    ? <><Pencil className="w-5 h-5 text-orange-500" /> Edit Job Voucher</>
                    : <>
                        <CheckCircle className="w-5 h-5 text-emerald-500" /> Complete Job
                        <button
                          onClick={() => { setQuickCompleteMode(v => !v); setCreatedVouchers([]) }}
                          title={quickCompleteMode ? 'Back to full mode' : 'Quick complete (no voucher)'}
                          className="w-6 h-6 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 flex items-center justify-center transition-colors"
                        >
                          {quickCompleteMode ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                        </button>
                      </>
                  }
                </h3>
                <p className="text-xs text-amber-600 font-semibold mt-0.5">
                  {completeModal.job?.job_card_number} · {completeModal.job?.vehicle_number}
                  {isEditMode && editCNumber && <span className="ml-2 text-slate-400">· {editCNumber}</span>}
                </p>
              </div>
              <button onClick={() => { resetCompleteModal(); if (isEditMode) navigate(-1) }} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Vouchers created — success screen */}
            {createdVouchers.length > 0 ? (
              <div className="p-6">
                <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 p-8 text-center space-y-4">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h4 className="text-lg font-bold text-emerald-800">Job Completed Successfully!</h4>
                  <p className="text-sm text-emerald-700">
                    {createdVouchers.length} voucher{createdVouchers.length > 1 ? 's' : ''} created for job{' '}
                    <span className="font-bold">{completeModal.job?.job_card_number}</span>
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {createdVouchers.map(v => (
                      <span key={v} className="px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-800 font-mono font-bold text-sm shadow-sm">{v}</span>
                    ))}
                  </div>
                  <Button onClick={resetCompleteModal}>Close</Button>
                </div>
              </div>
            ) : (
            <div className="p-6 space-y-6">
              {quickCompleteMode ? (
                /* ── Quick Complete (no voucher) ─── */
                <div className="rounded-xl border-2 border-amber-200 bg-amber-50/60 p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-amber-800">Quick Complete</span>
                    <span className="text-xs text-amber-600 bg-amber-100 rounded-full px-2 py-0.5 font-medium">No voucher required</span>
                  </div>
                  <div>
                    <Label>Description / Remarks</Label>
                    <textarea
                      className="w-full mt-1 px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                      rows={3}
                      placeholder="Enter completion remarks…"
                      value={quickCompleteDesc}
                      onChange={e => setQuickCompleteDesc(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
              <>
              {/* ── Accounting Entry (multi-voucher blocks) ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-700">Accounting Entry</h4>
                  <button
                    onClick={() => setVoucherBlocks(bs => [...bs, emptyVoucherBlock()])}
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Voucher
                  </button>
                </div>

                <div className="space-y-4">
                  {voucherBlocks.map((block, bIdx) => {
                    const bDebit   = blockTotals[bIdx]?.debit  ?? 0
                    const bCredit  = blockTotals[bIdx]?.credit ?? 0
                    const bBalanced  = bDebit > 0 && Math.round(bDebit * 100) === Math.round(bCredit * 100)
                    const bHasEntry  = block.debit.some(e => e.ledger_id) || block.credit.some(e => e.ledger_id)
                    return (
                      <div key={bIdx} className="rounded-xl border border-slate-200 overflow-hidden">
                        {/* Block header with description */}
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{bIdx + 1}</span>
                          <Input
                            className="flex-1 text-xs h-7 border-0 bg-transparent p-0 font-semibold text-slate-700 focus:ring-0 placeholder:text-slate-400"
                            placeholder="Voucher description (optional)"
                            value={block.description}
                            onChange={e => setVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, description: e.target.value }))}
                          />
                          {voucherBlocks.length > 1 && (
                            <button onClick={() => setVoucherBlocks(bs => bs.filter((_, i) => i !== bIdx))} className="text-slate-400 hover:text-red-500 p-0.5 transition-colors flex-shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Debit / Credit pair */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                          {/* Debit side */}
                          <div>
                            <div className="flex items-center justify-between px-4 py-2 bg-blue-600">
                              <span className="text-xs font-bold text-white">Debit Accounts</span>
                              <button
                                onClick={() => setVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, debit: [...b.debit, emptyLedgerEntry()] }))}
                                className="inline-flex items-center gap-1 text-xs font-bold text-blue-100 hover:text-white transition-colors"
                              ><Plus className="w-3 h-3" /> Add Row</button>
                            </div>
                            <div className="p-3 space-y-2">
                              {block.debit.map((entry, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <div className="flex-[3] min-w-0">
                                    <SearchableSelect
                                      value={entry.ledger_id}
                                      displayLabel={entry.ledger_name}
                                      onChange={v => {
                                        const nm = ledgerList.find((l: any) => String(l.id) === v)?.temple_name || ''
                                        setVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, debit: b.debit.map((e, ei) => ei !== i ? e : { ...e, ledger_id: v, ledger_name: nm }) }))
                                      }}
                                      options={ledgerOptions}
                                      placeholder="Select Ledger"
                                      onReload={() => reloadLedgers()}
                                      reloading={loadingLedgers}
                                    />
                                  </div>
                                  <div className="flex-[2] min-w-0">
                                    <Input type="number" placeholder="Amount" value={entry.amount}
                                      onChange={e => setVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, debit: b.debit.map((en, ei) => ei !== i ? en : { ...en, amount: e.target.value }) }))} />
                                  </div>
                                  {block.debit.length > 1 && (
                                    <button onClick={() => setVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, debit: b.debit.filter((_, ei) => ei !== i) }))} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                                      <MinusCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {bDebit > 0 && <div className="text-right text-xs font-extrabold text-blue-700 pt-1">Total: ₹{bDebit.toLocaleString('en-IN')}</div>}
                            </div>
                          </div>

                          {/* Credit side */}
                          <div>
                            <div className="flex items-center justify-between px-4 py-2 bg-emerald-600">
                              <span className="text-xs font-bold text-white">Credit Accounts</span>
                              <button
                                onClick={() => setVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, credit: [...b.credit, emptyLedgerEntry()] }))}
                                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-100 hover:text-white transition-colors"
                              ><Plus className="w-3 h-3" /> Add Row</button>
                            </div>
                            <div className="p-3 space-y-2">
                              {block.credit.map((entry, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <div className="flex-[3] min-w-0">
                                    <SearchableSelect
                                      value={entry.ledger_id}
                                      displayLabel={entry.ledger_name}
                                      onChange={v => {
                                        const nm = ledgerList.find((l: any) => String(l.id) === v)?.temple_name || ''
                                        setVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, credit: b.credit.map((e, ei) => ei !== i ? e : { ...e, ledger_id: v, ledger_name: nm }) }))
                                      }}
                                      options={ledgerOptions}
                                      placeholder="Select Ledger"
                                      onReload={() => reloadLedgers()}
                                      reloading={loadingLedgers}
                                    />
                                  </div>
                                  <div className="flex-[2] min-w-0">
                                    <Input type="number" placeholder="Amount" value={entry.amount}
                                      onChange={e => setVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, credit: b.credit.map((en, ei) => ei !== i ? en : { ...en, amount: e.target.value }) }))} />
                                  </div>
                                  {block.credit.length > 1 && (
                                    <button onClick={() => setVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, credit: b.credit.filter((_, ei) => ei !== i) }))} className="text-slate-400 hover:text-red-500 p-1 transition-colors">
                                      <MinusCircle className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {bCredit > 0 && <div className="text-right text-xs font-extrabold text-emerald-700 pt-1">Total: ₹{bCredit.toLocaleString('en-IN')}</div>}
                            </div>
                          </div>
                        </div>

                        {/* Per-block spare parts */}
                        <div className="border-t border-slate-100">
                          <div className="flex items-center justify-between px-4 py-2 bg-slate-50">
                            <span className="text-xs font-bold text-slate-600">
                              {block.category_name ? `${block.category_name} — Spare Parts` : 'Spare Parts'}
                            </span>
                            <button
                              onClick={() => setVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: [...b.parts, emptySimplePartRow()] }))}
                              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
                            ><Plus className="w-3 h-3" /> Add Part</button>
                          </div>
                          <div className="p-3">
                            <DynamicRows
                              title=""
                              columns={[
                                { label: 'Part',     className: 'flex-[3]' },
                                { label: 'Qty',      className: 'flex-[0.8]' },
                                { label: 'Rate (₹)', className: 'flex-[1.5]' },
                                { label: 'Total',    className: 'flex-[1.5]' },
                              ]}
                              rows={block.parts}
                              onAdd={() => setVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: [...b.parts, emptySimplePartRow()] }))}
                              onRemove={(pIdx) => setVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: b.parts.filter((_, pi) => pi !== pIdx) }))}
                              renderRow={(p, pIdx) => (
                                <>
                                  <div className="flex-[3] min-w-0">
                                    <SearchableSelect value={p.part_id} onChange={(v) => handleBlockPartSelect(bIdx, pIdx, v)} options={partsOptions} placeholder="Select Part" onReload={() => reloadParts()} reloading={loadingParts} />
                                  </div>
                                  <div className="flex-[0.8] min-w-0">
                                    <Input type="number" min="1" value={p.qty} onChange={(e) => updateBlockPart(bIdx, pIdx, 'qty', e.target.value)} />
                                  </div>
                                  <div className="flex-[1.5] min-w-0">
                                    <Input type="number" placeholder="0.00" value={p.rate} onChange={(e) => updateBlockPart(bIdx, pIdx, 'rate', e.target.value)} />
                                  </div>
                                  <div className="flex-[1.5] min-w-0">
                                    <Input className="bg-slate-100 font-bold text-right" disabled value={((parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0)).toLocaleString('en-IN')} />
                                  </div>
                                </>
                              )}
                            />
                            {blockPartsTotals[bIdx] > 0 && (
                              <div className="flex justify-end mt-1.5 text-xs font-bold text-emerald-700">
                                Parts Subtotal: ₹{blockPartsTotals[bIdx].toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Per-block balance indicator */}
                        {bHasEntry && (
                          bBalanced ? (
                            <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              Voucher {bIdx + 1} balanced — ₹{bDebit.toLocaleString('en-IN')}
                            </div>
                          ) : (
                            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              Debit ₹{bDebit.toLocaleString('en-IN')} ≠ Credit ₹{bCredit.toLocaleString('en-IN')} — must balance before saving
                            </div>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* New Part */}
              <div>
                <button type="button" onClick={() => setShowNewPart(v => !v)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors">
                  <PackagePlus className="w-3.5 h-3.5" /> {showNewPart ? 'Cancel' : '+ New Part'}
                </button>
                {showNewPart && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 p-4 rounded-xl border-2 border-amber-200 bg-amber-50/60 space-y-3">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">Add New Spare Part</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><Label>Part Number</Label><Input placeholder="e.g. PT-001" value={newPart.part_number} onChange={(e) => setNewPart(s => ({ ...s, part_number: e.target.value }))} /></div>
                      <div><Label>Category</Label><SearchableSelect value={newPart.category_id} onChange={(v) => setNewPart(s => ({ ...s, category_id: v }))} options={catOptions} placeholder="Select Category" onReload={() => reloadCats()} reloading={loadingCats} /></div>
                      <div><Label>Part Name <span className="text-red-500">*</span></Label><Input placeholder="e.g. Oil Filter" value={newPart.part_name} onChange={(e) => setNewPart(s => ({ ...s, part_name: e.target.value }))} /></div>
                      <div><Label>Price (₹) <span className="text-red-500">*</span></Label><Input type="number" placeholder="0.00" value={newPart.price} onChange={(e) => setNewPart(s => ({ ...s, price: e.target.value }))} /></div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setShowNewPart(false); setNewPart({ part_number: '', part_name: '', price: '', category_id: '' }) }}>Cancel</Button>
                      <Button size="sm" disabled={creatingPart || !newPart.part_name || !newPart.price} onClick={() => createPart()}>
                        <Plus className="w-3.5 h-3.5" />{creatingPart ? 'Saving…' : 'Save Part'}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
              </>
              )}
            </div>
            )}

            {/* Repeat Job — only in full complete mode, not in edit mode */}
            {!isEditMode && !quickCompleteMode && createdVouchers.length === 0 && (
              <div className="px-6 py-4 border-t border-slate-100">
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
                    <Input type="date" value={completeRepeatDate} onChange={(e) => setCompleteRepeatDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                  </div>
                )}
              </div>
            )}

            {/* Sticky footer */}
            {createdVouchers.length === 0 && (
              <div className="sticky bottom-0 border-t border-slate-200 bg-white rounded-b-2xl">
                <div className="flex items-center gap-4 px-6 py-3 flex-wrap">
                  {!quickCompleteMode && (
                    <>
                      <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                        Parts Total: <span className="text-slate-800 font-extrabold tabular-nums">₹{completeTotal.toLocaleString('en-IN')}</span>
                      </div>
                      {totalDebitAllBlocks > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700 tabular-nums">
                          Dr: ₹{totalDebitAllBlocks.toLocaleString('en-IN')}
                        </div>
                      )}
                      {totalCreditAllBlocks > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700 tabular-nums">
                          Cr: ₹{totalCreditAllBlocks.toLocaleString('en-IN')}
                        </div>
                      )}
                    </>
                  )}
                  <div className="ml-auto flex items-center gap-3">
                    <Button variant="outline" onClick={() => { resetCompleteModal(); if (isEditMode) navigate(-1) }}>Cancel</Button>
                    {isEditMode ? (
                      <Button onClick={() => updateVoucher()} disabled={updatingVoucher || !allBlocksBalanced} className="bg-orange-600 hover:bg-orange-700 text-white">
                        <Save className="w-4 h-4" />{updatingVoucher ? 'Updating…' : 'Update Voucher'}
                      </Button>
                    ) : (
                    <Button onClick={() => saveComplete()} disabled={savingComplete || (!quickCompleteMode && !allBlocksBalanced)}>
                      <Save className="w-4 h-4" />{savingComplete ? 'Saving…' : quickCompleteMode ? 'Quick Complete' : 'Save & Complete Job'}
                    </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Edit Job Modal ────────────────────────────────────────────────────── */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><Pencil className="w-4 h-4 text-blue-500" /> Edit Job</h3>
                <p className="text-xs text-slate-500 mt-0.5">{editModal.job?.job_card_number}</p>
              </div>
              <button onClick={() => setEditModal({ open: false, job: null })} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Vehicle</Label>
                  <SearchableSelect value={editForm.bus_no} onChange={(v) => setEditForm(s => ({ ...s, bus_no: v }))} options={busOptions} placeholder="Select Vehicle" onReload={() => reloadBuses()} reloading={loadingBuses} />
                </div>
                <div>
                  <Label>Driver</Label>
                  <SearchableSelect value={editForm.driver} onChange={(v) => setEditForm(s => ({ ...s, driver: v }))} options={driverOptions} placeholder="Select Driver" onReload={() => reloadDrivers()} reloading={loadingDrivers} />
                </div>
                <div>
                  <Label>Odometer</Label>
                  <Input type="number" value={editForm.odometer} onChange={(e) => setEditForm(s => ({ ...s, odometer: e.target.value }))} />
                </div>
              </div>

              {/* Job rows */}
              <DynamicRows
                title="Repair Categories"
                columns={[
                  { label: 'Category',    className: 'flex-[2]' },
                  { label: 'Priority',    className: 'flex-[1]' },
                  { label: 'Technician',  className: 'flex-[2]' },
                  { label: 'Description', className: 'flex-[3]' },
                ]}
                rows={editJobRows}
                onAdd={() => setEditJobRows(prev => [...prev, emptyJobRow()])}
                onRemove={(i) => setEditJobRows(prev => prev.filter((_, idx) => idx !== i))}
                renderRow={(r, i) => (
                  <>
                    <div className="flex-[2] min-w-0">
                      <SearchableSelect value={r.category} onChange={(v) => setEditJobRows(prev => prev.map((row, idx) => idx === i ? { ...row, category: v } : row))} options={catOptions} placeholder="Category" onReload={() => reloadCats()} reloading={loadingCats} />
                    </div>
                    <div className="flex-[1] min-w-0">
                      <select value={r.priority} onChange={(e) => setEditJobRows(prev => prev.map((row, idx) => idx === i ? { ...row, priority: e.target.value } : row))} className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm">
                        {PRIORITY_OPTIONS.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="flex-[2] min-w-0">
                      <SearchableSelect value={r.technician} onChange={(v) => setEditJobRows(prev => prev.map((row, idx) => idx === i ? { ...row, technician: v } : row))} options={staffOptions} placeholder="Technician" onReload={() => reloadStaff()} reloading={loadingStaff} />
                    </div>
                    <div className="flex-[3] min-w-0">
                      <Input placeholder="Description" value={r.description} onChange={(e) => setEditJobRows(prev => prev.map((row, idx) => idx === i ? { ...row, description: e.target.value } : row))} />
                    </div>
                  </>
                )}
              />

              {/* Reason for Edit */}
              <div className="pt-2 border-t border-slate-100">
                <Label>Reason for Edit <span className="text-red-500">*</span></Label>
                <textarea
                  rows={2}
                  placeholder="Briefly describe why you are editing this job card…"
                  value={editForm.edit_reason}
                  onChange={(e) => setEditForm(s => ({ ...s, edit_reason: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
              <Button variant="outline" onClick={() => setEditModal({ open: false, job: null })}>Cancel</Button>
              <Button onClick={() => saveEdit()} disabled={savingEdit || !editForm.bus_no || editJobRows.every(r => !r.category) || !editForm.edit_reason.trim()}>
                <Save className="w-4 h-4" />{savingEdit ? 'Saving…' : 'Update Job'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Finish Job Modal ──────────────────────────────────────────────────── */}
      {finishModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-blue-500" /> Finish Job
                </h3>
                <p className="text-xs text-blue-600 font-semibold mt-0.5">{finishModal.job?.job_card_number} · {finishModal.job?.vehicle_number}</p>
              </div>
              <button onClick={() => setFinishModal({ open: false, job: null })} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Remarks */}
              <div>
                <Label>Comments / Work Done</Label>
                <textarea
                  rows={2}
                  placeholder="Add remarks about the work done…"
                  value={finishRemarks}
                  onChange={(e) => setFinishRemarks(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>

              {/* Voucher blocks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-700">Accounting Entry</h4>
                  <button
                    onClick={() => setFinishVoucherBlocks(bs => [...bs, emptyVoucherBlock()])}
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Voucher
                  </button>
                </div>
                <div className="space-y-4">
                  {finishVoucherBlocks.map((block, bIdx) => {
                    const bDebit   = finishBlockTotals[bIdx]?.debit  ?? 0
                    const bCredit  = finishBlockTotals[bIdx]?.credit ?? 0
                    const bBalanced = bDebit > 0 && Math.round(bDebit * 100) === Math.round(bCredit * 100)
                    const bHasEntry = block.debit.some(e => e.ledger_id) || block.credit.some(e => e.ledger_id)
                    return (
                      <div key={bIdx} className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{bIdx + 1}</span>
                          <Input
                            className="flex-1 text-xs h-7 border-0 bg-transparent p-0 font-semibold text-slate-700 focus:ring-0 placeholder:text-slate-400"
                            placeholder="Voucher description (optional)"
                            value={block.description}
                            onChange={e => setFinishVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, description: e.target.value }))}
                          />
                          {finishVoucherBlocks.length > 1 && (
                            <button onClick={() => setFinishVoucherBlocks(bs => bs.filter((_, i) => i !== bIdx))} className="text-slate-400 hover:text-red-500 p-0.5 transition-colors flex-shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                          <div>
                            <div className="flex items-center justify-between px-4 py-2 bg-blue-600">
                              <span className="text-xs font-bold text-white">Debit Accounts</span>
                              <button onClick={() => setFinishVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, debit: [...b.debit, emptyLedgerEntry()] }))} className="inline-flex items-center gap-1 text-xs font-bold text-blue-100 hover:text-white transition-colors"><Plus className="w-3 h-3" /> Add Row</button>
                            </div>
                            <div className="p-3 space-y-2">
                              {block.debit.map((entry, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <div className="flex-[3] min-w-0">
                                    <SearchableSelect value={entry.ledger_id} displayLabel={entry.ledger_name}
                                      onChange={v => { const nm = ledgerList.find((l: any) => String(l.id) === v)?.temple_name || ''; setFinishVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, debit: b.debit.map((e, ei) => ei !== i ? e : { ...e, ledger_id: v, ledger_name: nm }) })) }}
                                      options={ledgerOptions} placeholder="Select Ledger" onReload={() => reloadLedgers()} reloading={loadingLedgers} />
                                  </div>
                                  <div className="flex-[2] min-w-0">
                                    <Input type="number" placeholder="Amount" value={entry.amount}
                                      onChange={e => setFinishVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, debit: b.debit.map((en, ei) => ei !== i ? en : { ...en, amount: e.target.value }) }))} />
                                  </div>
                                  {block.debit.length > 1 && (
                                    <button onClick={() => setFinishVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, debit: b.debit.filter((_, ei) => ei !== i) }))} className="text-slate-400 hover:text-red-500 p-1 transition-colors"><MinusCircle className="w-4 h-4" /></button>
                                  )}
                                </div>
                              ))}
                              {bDebit > 0 && <div className="text-right text-xs font-extrabold text-blue-700 pt-1">Total: ₹{bDebit.toLocaleString('en-IN')}</div>}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between px-4 py-2 bg-emerald-600">
                              <span className="text-xs font-bold text-white">Credit Accounts</span>
                              <button onClick={() => setFinishVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, credit: [...b.credit, emptyLedgerEntry()] }))} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-100 hover:text-white transition-colors"><Plus className="w-3 h-3" /> Add Row</button>
                            </div>
                            <div className="p-3 space-y-2">
                              {block.credit.map((entry, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <div className="flex-[3] min-w-0">
                                    <SearchableSelect value={entry.ledger_id} displayLabel={entry.ledger_name}
                                      onChange={v => { const nm = ledgerList.find((l: any) => String(l.id) === v)?.temple_name || ''; setFinishVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, credit: b.credit.map((e, ei) => ei !== i ? e : { ...e, ledger_id: v, ledger_name: nm }) })) }}
                                      options={ledgerOptions} placeholder="Select Ledger" onReload={() => reloadLedgers()} reloading={loadingLedgers} />
                                  </div>
                                  <div className="flex-[2] min-w-0">
                                    <Input type="number" placeholder="Amount" value={entry.amount}
                                      onChange={e => setFinishVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, credit: b.credit.map((en, ei) => ei !== i ? en : { ...en, amount: e.target.value }) }))} />
                                  </div>
                                  {block.credit.length > 1 && (
                                    <button onClick={() => setFinishVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, credit: b.credit.filter((_, ei) => ei !== i) }))} className="text-slate-400 hover:text-red-500 p-1 transition-colors"><MinusCircle className="w-4 h-4" /></button>
                                  )}
                                </div>
                              ))}
                              {bCredit > 0 && <div className="text-right text-xs font-extrabold text-emerald-700 pt-1">Total: ₹{bCredit.toLocaleString('en-IN')}</div>}
                            </div>
                          </div>
                        </div>
                        {/* Spare parts */}
                        <div className="border-t border-slate-100">
                          <div className="flex items-center justify-between px-4 py-2 bg-slate-50">
                            <span className="text-xs font-bold text-slate-600">Spare Parts</span>
                            <button onClick={() => setFinishVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: [...b.parts, emptySimplePartRow()] }))} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"><Plus className="w-3 h-3" /> Add Part</button>
                          </div>
                          <div className="p-3">
                            <DynamicRows
                              title=""
                              columns={[
                                { label: 'Part', className: 'flex-[3]' },
                                { label: 'Qty', className: 'flex-[0.8]' },
                                { label: 'Rate (₹)', className: 'flex-[1.5]' },
                                { label: 'Total', className: 'flex-[1.5]' },
                              ]}
                              rows={block.parts}
                              onAdd={() => setFinishVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: [...b.parts, emptySimplePartRow()] }))}
                              onRemove={(pIdx) => setFinishVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: b.parts.filter((_, pi) => pi !== pIdx) }))}
                              renderRow={(p, pIdx) => (
                                <>
                                  <div className="flex-[3] min-w-0">
                                    <SearchableSelect value={p.part_id}
                                      onChange={v => { const found = partsList.find((pt: any) => String(pt.part_id) === v); setFinishVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: b.parts.map((pt, pi) => pi !== pIdx ? pt : { ...pt, part_id: v, rate: found?.price ? String(found.price) : pt.rate }) })) }}
                                      options={partsOptions} placeholder="Select Part" onReload={() => reloadParts()} reloading={loadingParts} />
                                  </div>
                                  <div className="flex-[0.8] min-w-0">
                                    <Input type="number" min="1" value={p.qty} onChange={e => setFinishVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: b.parts.map((pt, pi) => pi !== pIdx ? pt : { ...pt, qty: e.target.value }) }))} />
                                  </div>
                                  <div className="flex-[1.5] min-w-0">
                                    <Input type="number" placeholder="0.00" value={p.rate} onChange={e => setFinishVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: b.parts.map((pt, pi) => pi !== pIdx ? pt : { ...pt, rate: e.target.value }) }))} />
                                  </div>
                                  <div className="flex-[1.5] min-w-0">
                                    <Input className="bg-slate-100 font-bold text-right" disabled value={((parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0)).toLocaleString('en-IN')} />
                                  </div>
                                </>
                              )}
                            />
                            {finishBlockPartsTotals[bIdx] > 0 && (
                              <div className="flex justify-end mt-1.5 text-xs font-bold text-emerald-700">
                                Parts Subtotal: ₹{finishBlockPartsTotals[bIdx].toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                        </div>
                        {bHasEntry && (
                          bBalanced ? (
                            <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Voucher {bIdx + 1} balanced — ₹{bDebit.toLocaleString('en-IN')}
                            </div>
                          ) : (
                            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> Debit ₹{bDebit.toLocaleString('en-IN')} ≠ Credit ₹{bCredit.toLocaleString('en-IN')} — must balance before saving
                            </div>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Repeat job */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                  <input type="checkbox" className="w-4 h-4 accent-amber-500" checked={finishRepeat} onChange={(e) => { setFinishRepeat(e.target.checked); setFinishRepeatDate('') }} />
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-500" /> Repeat Job
                  </span>
                </label>
                {finishRepeat && (
                  <div className="mt-3 max-w-xs">
                    <Label>Next Job Date</Label>
                    <Input type="date" value={finishRepeatDate} onChange={(e) => setFinishRepeatDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                  </div>
                )}
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white rounded-b-2xl">
              <div className="flex items-center gap-4 px-6 py-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                  Parts Total: <span className="text-slate-800 font-extrabold tabular-nums">₹{finishTotal.toLocaleString('en-IN')}</span>
                </div>
                {totalFinishDebit > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700 tabular-nums">
                    Dr: ₹{totalFinishDebit.toLocaleString('en-IN')}
                  </div>
                )}
                {totalFinishCredit > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700 tabular-nums">
                    Cr: ₹{totalFinishCredit.toLocaleString('en-IN')}
                  </div>
                )}
                <div className="ml-auto flex gap-3">
                  <Button variant="outline" onClick={() => setFinishModal({ open: false, job: null })}>Cancel</Button>
                  <Button onClick={() => saveFinish()} disabled={savingFinish}>
                    <CheckCircle className="w-4 h-4" />{savingFinish ? 'Saving…' : 'Mark as Finished'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Approve Job Modal ────────────────────────────────────────────────── */}
      {approveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-violet-500" /> Approve Job
                </h3>
                <p className="text-xs text-violet-600 font-semibold mt-0.5">{approveModal.job?.job_card_number} · {approveModal.job?.vehicle_number}</p>
              </div>
              <button onClick={() => { setApproveModal({ open: false, job: null }); approveFilledForJob.current = null }} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="rounded-xl bg-violet-50 border border-violet-100 px-4 py-3 text-sm text-violet-700 font-medium">
                Review and record accounting entries for approval. Vouchers are saved for reference — they are not posted until job completion.
              </div>

              {/* Remarks */}
              <div>
                <Label>Approval Remarks (optional)</Label>
                <textarea
                  rows={2}
                  placeholder="Add any approval notes…"
                  value={approveRemarks}
                  onChange={(e) => setApproveRemarks(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              {/* Voucher blocks */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-700">Accounting Entry</h4>
                  <button
                    onClick={() => setApproveVoucherBlocks(bs => [...bs, emptyVoucherBlock()])}
                    className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Voucher
                  </button>
                </div>
                <div className="space-y-4">
                  {approveVoucherBlocks.map((block, bIdx) => {
                    const bDebit   = approveBlockTotals[bIdx]?.debit  ?? 0
                    const bCredit  = approveBlockTotals[bIdx]?.credit ?? 0
                    const bBalanced = bDebit > 0 && Math.round(bDebit * 100) === Math.round(bCredit * 100)
                    const bHasEntry = block.debit.some(e => e.ledger_id) || block.credit.some(e => e.ledger_id)
                    return (
                      <div key={bIdx} className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                          <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{bIdx + 1}</span>
                          <Input
                            className="flex-1 text-xs h-7 border-0 bg-transparent p-0 font-semibold text-slate-700 focus:ring-0 placeholder:text-slate-400"
                            placeholder="Voucher description (optional)"
                            value={block.description}
                            onChange={e => setApproveVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, description: e.target.value }))}
                          />
                          {approveVoucherBlocks.length > 1 && (
                            <button onClick={() => setApproveVoucherBlocks(bs => bs.filter((_, i) => i !== bIdx))} className="text-slate-400 hover:text-red-500 p-0.5 transition-colors flex-shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                          <div>
                            <div className="flex items-center justify-between px-4 py-2 bg-blue-600">
                              <span className="text-xs font-bold text-white">Debit Accounts</span>
                              <button onClick={() => setApproveVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, debit: [...b.debit, emptyLedgerEntry()] }))} className="inline-flex items-center gap-1 text-xs font-bold text-blue-100 hover:text-white transition-colors"><Plus className="w-3 h-3" /> Add Row</button>
                            </div>
                            <div className="p-3 space-y-2">
                              {block.debit.map((entry, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <div className="flex-[3] min-w-0">
                                    <SearchableSelect value={entry.ledger_id} displayLabel={entry.ledger_name}
                                      onChange={v => { const nm = ledgerList.find((l: any) => String(l.id) === v)?.temple_name || ''; setApproveVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, debit: b.debit.map((e, ei) => ei !== i ? e : { ...e, ledger_id: v, ledger_name: nm }) })) }}
                                      options={ledgerOptions} placeholder="Select Ledger" onReload={() => reloadLedgers()} reloading={loadingLedgers} />
                                  </div>
                                  <div className="flex-[2] min-w-0">
                                    <Input type="number" placeholder="Amount" value={entry.amount}
                                      onChange={e => setApproveVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, debit: b.debit.map((en, ei) => ei !== i ? en : { ...en, amount: e.target.value }) }))} />
                                  </div>
                                  {block.debit.length > 1 && (
                                    <button onClick={() => setApproveVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, debit: b.debit.filter((_, ei) => ei !== i) }))} className="text-slate-400 hover:text-red-500 p-1 transition-colors"><MinusCircle className="w-4 h-4" /></button>
                                  )}
                                </div>
                              ))}
                              {bDebit > 0 && <div className="text-right text-xs font-extrabold text-blue-700 pt-1">Total: ₹{bDebit.toLocaleString('en-IN')}</div>}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between px-4 py-2 bg-emerald-600">
                              <span className="text-xs font-bold text-white">Credit Accounts</span>
                              <button onClick={() => setApproveVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, credit: [...b.credit, emptyLedgerEntry()] }))} className="inline-flex items-center gap-1 text-xs font-bold text-emerald-100 hover:text-white transition-colors"><Plus className="w-3 h-3" /> Add Row</button>
                            </div>
                            <div className="p-3 space-y-2">
                              {block.credit.map((entry, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                  <div className="flex-[3] min-w-0">
                                    <SearchableSelect value={entry.ledger_id} displayLabel={entry.ledger_name}
                                      onChange={v => { const nm = ledgerList.find((l: any) => String(l.id) === v)?.temple_name || ''; setApproveVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, credit: b.credit.map((e, ei) => ei !== i ? e : { ...e, ledger_id: v, ledger_name: nm }) })) }}
                                      options={ledgerOptions} placeholder="Select Ledger" onReload={() => reloadLedgers()} reloading={loadingLedgers} />
                                  </div>
                                  <div className="flex-[2] min-w-0">
                                    <Input type="number" placeholder="Amount" value={entry.amount}
                                      onChange={e => setApproveVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, credit: b.credit.map((en, ei) => ei !== i ? en : { ...en, amount: e.target.value }) }))} />
                                  </div>
                                  {block.credit.length > 1 && (
                                    <button onClick={() => setApproveVoucherBlocks(bs => bs.map((b, bi) => bi !== bIdx ? b : { ...b, credit: b.credit.filter((_, ei) => ei !== i) }))} className="text-slate-400 hover:text-red-500 p-1 transition-colors"><MinusCircle className="w-4 h-4" /></button>
                                  )}
                                </div>
                              ))}
                              {bCredit > 0 && <div className="text-right text-xs font-extrabold text-emerald-700 pt-1">Total: ₹{bCredit.toLocaleString('en-IN')}</div>}
                            </div>
                          </div>
                        </div>
                        {/* Spare parts */}
                        <div className="border-t border-slate-100">
                          <div className="flex items-center justify-between px-4 py-2 bg-slate-50">
                            <span className="text-xs font-bold text-slate-600">Spare Parts</span>
                            <button onClick={() => setApproveVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: [...b.parts, emptySimplePartRow()] }))} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"><Plus className="w-3 h-3" /> Add Part</button>
                          </div>
                          <div className="p-3">
                            <DynamicRows
                              title=""
                              columns={[
                                { label: 'Part', className: 'flex-[3]' },
                                { label: 'Qty', className: 'flex-[0.8]' },
                                { label: 'Rate (₹)', className: 'flex-[1.5]' },
                                { label: 'Total', className: 'flex-[1.5]' },
                              ]}
                              rows={block.parts}
                              onAdd={() => setApproveVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: [...b.parts, emptySimplePartRow()] }))}
                              onRemove={(pIdx) => setApproveVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: b.parts.filter((_, pi) => pi !== pIdx) }))}
                              renderRow={(p, pIdx) => (
                                <>
                                  <div className="flex-[3] min-w-0">
                                    <SearchableSelect value={p.part_id}
                                      onChange={v => { const found = partsList.find((pt: any) => String(pt.part_id) === v); setApproveVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: b.parts.map((pt, pi) => pi !== pIdx ? pt : { ...pt, part_id: v, rate: found?.price ? String(found.price) : pt.rate }) })) }}
                                      options={partsOptions} placeholder="Select Part" onReload={() => reloadParts()} reloading={loadingParts} />
                                  </div>
                                  <div className="flex-[0.8] min-w-0">
                                    <Input type="number" min="1" value={p.qty} onChange={e => setApproveVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: b.parts.map((pt, pi) => pi !== pIdx ? pt : { ...pt, qty: e.target.value }) }))} />
                                  </div>
                                  <div className="flex-[1.5] min-w-0">
                                    <Input type="number" placeholder="0.00" value={p.rate} onChange={e => setApproveVoucherBlocks(bs => bs.map((b, i) => i !== bIdx ? b : { ...b, parts: b.parts.map((pt, pi) => pi !== pIdx ? pt : { ...pt, rate: e.target.value }) }))} />
                                  </div>
                                  <div className="flex-[1.5] min-w-0">
                                    <Input className="bg-slate-100 font-bold text-right" disabled value={((parseFloat(p.qty) || 0) * (parseFloat(p.rate) || 0)).toLocaleString('en-IN')} />
                                  </div>
                                </>
                              )}
                            />
                            {approveBlockPartsTotals[bIdx] > 0 && (
                              <div className="flex justify-end mt-1.5 text-xs font-bold text-emerald-700">
                                Parts Subtotal: ₹{approveBlockPartsTotals[bIdx].toLocaleString('en-IN')}
                              </div>
                            )}
                          </div>
                        </div>
                        {bHasEntry && (
                          bBalanced ? (
                            <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-100 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" /> Voucher {bIdx + 1} balanced — ₹{bDebit.toLocaleString('en-IN')}
                            </div>
                          ) : (
                            <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> Debit ₹{bDebit.toLocaleString('en-IN')} ≠ Credit ₹{bCredit.toLocaleString('en-IN')} — must balance before saving
                            </div>
                          )
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 border-t border-slate-200 bg-white rounded-b-2xl">
              <div className="flex items-center gap-4 px-6 py-3 flex-wrap">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                  Parts Total: <span className="text-slate-800 font-extrabold tabular-nums">₹{approveTotal.toLocaleString('en-IN')}</span>
                </div>
                {totalApproveDebit > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-100 text-xs font-bold text-blue-700 tabular-nums">
                    Dr: ₹{totalApproveDebit.toLocaleString('en-IN')}
                  </div>
                )}
                {totalApproveCredit > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-xs font-bold text-emerald-700 tabular-nums">
                    Cr: ₹{totalApproveCredit.toLocaleString('en-IN')}
                  </div>
                )}
                <div className="ml-auto flex gap-3">
                  <Button variant="outline" onClick={() => setApproveModal({ open: false, job: null })}>Cancel</Button>
                  <Button variant="purple" onClick={() => saveApprove()} disabled={savingApprove}>
                    <CheckCircle className="w-4 h-4" />{savingApprove ? 'Approving…' : 'Confirm Approve'}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── Reject Job Modal ──────────────────────────────────────────────────── */}
      {rejectModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-500" /> Reject Job
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{rejectModal.job?.job_card_number}</p>
              </div>
              <button onClick={() => setRejectModal({ open: false, job: null })} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-medium">
                This job card will be marked as rejected. Please provide a reason.
              </div>
              <div>
                <Label>Reason for Rejection <span className="text-red-500">*</span></Label>
                <textarea
                  rows={3}
                  placeholder="Describe why this job is being rejected…"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <Button variant="outline" onClick={() => setRejectModal({ open: false, job: null })}>Cancel</Button>
              <Button variant="danger" onClick={() => saveReject()} disabled={savingReject || !rejectReason.trim()}>
                <XCircle className="w-4 h-4" />{savingReject ? 'Rejecting…' : 'Confirm Reject'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  )
}
