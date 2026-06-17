import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle, XCircle, Eye, Search, CreditCard, Pencil, Save, X, BookOpen, Trash2, Clock, History, ChevronDown, Plus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { accountingService } from '@/services/accounting.service'
import { mastersService } from '@/services/masters.service'
import { formatCurrency, formatDate } from '@/lib/utils'

interface EditLedgerItem {
  ledger: any
  amount: string
  description: string
  valueDate: string   // YYYY-MM-DD
  vehicleNo: string
  staffValue: string  // "id|type|name" packed
}

function parseStaff(v: string) {
  if (!v) return null
  const [id, type, name] = v.split('|')
  return { id: parseInt(id) || 0, type: type ?? '', name: name ?? '' }
}

// ── Portal-based ledger dropdown (immune to overflow:hidden modal) ─────────
function LedgerDropdown({ value, ledgers, onChange }: {
  value: any; ledgers: any[]; onChange: (l: any) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const PANEL_MAX_H = 240
  const openDropdown = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(true); setSearch('')
  }
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const panel = document.getElementById('ev-ldg-panel')
      if (panel?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      setOpen(false); setSearch('')
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const filtered = ledgers.filter(l => l.temple_name?.toLowerCase().includes(search.toLowerCase()))
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUpward = rect ? spaceBelow < PANEL_MAX_H + 8 : false
  const panel = open && rect && createPortal(
    <div id="ev-ldg-panel" style={{
      position: 'fixed',
      top: openUpward ? undefined : rect.bottom + 4,
      bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
      left: rect.left, width: rect.width, maxHeight: PANEL_MAX_H, zIndex: 99999,
    }} className="rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 flex-shrink-0">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search ledger…"
          className="flex-1 text-sm outline-none placeholder:text-slate-400 bg-transparent" />
      </div>
      <ul className="overflow-y-auto flex-1">
        <li onMouseDown={() => { onChange(null); setOpen(false) }}
          className="px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 cursor-pointer">— None —</li>
        {filtered.map(l => (
          <li key={l.id} onMouseDown={() => { onChange(l); setOpen(false); setSearch('') }}
            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${value?.id === l.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-800 hover:bg-slate-50'}`}>
            {l.temple_name}
          </li>
        ))}
      </ul>
    </div>, document.body
  )
  return (
    <div className="flex-1 min-w-0">
      <button ref={btnRef} type="button" onClick={openDropdown}
        className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
        <span className={value ? 'text-slate-900 font-medium truncate min-w-0' : 'text-slate-400'}>
          {value?.temple_name || 'Select Ledger'}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {panel}
    </div>
  )
}

// ── Portal-based simple dropdown ──────────────────────────────────────────
function SimpleDropdown({ value, options, placeholder = 'Select…', onChange }: {
  value: string; options: { label: string; value: string }[]; placeholder?: string; onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const PANEL_MAX_H = 220
  const openDropdown = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(true)
  }
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const panel = document.getElementById('ev-sdp-panel')
      if (panel?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUpward = rect ? spaceBelow < PANEL_MAX_H + 8 : false
  const panel = open && rect && createPortal(
    <div id="ev-sdp-panel" style={{
      position: 'fixed',
      top: openUpward ? undefined : rect.bottom + 4,
      bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
      left: rect.left, width: rect.width, maxHeight: PANEL_MAX_H, zIndex: 99999,
    }} className="rounded-xl border border-slate-200 bg-white shadow-2xl overflow-y-auto">
      {options.map(opt => (
        <div key={opt.value} onMouseDown={() => { onChange(opt.value); setOpen(false) }}
          className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${value === opt.value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-800 hover:bg-slate-50'}`}>
          {opt.label}
        </div>
      ))}
    </div>, document.body
  )
  return (
    <button ref={btnRef} type="button" onClick={openDropdown}
      className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
      <span className={value ? 'text-slate-900 font-medium truncate' : 'text-slate-400'}>
        {options.find(o => o.value === value)?.label || placeholder}
      </span>
      <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      {panel}
    </button>
  )
}

interface FilterOpts {
  voucherTypes: { label: string; value: string }[]
  busList: { label: string; value: string }[]
  staffOptions: { label: string; value: string }[]
  entryByOpts: { label: string; value: string }[]
}

const buildCols = (
  onApprove: (row: any) => void,
  onReject: (row: any) => void,
  onView: (row: any) => void,
  mode: string,
  fOpts: FilterOpts
): Column[] => [
  {
    label: '#', key: 'id',
    render: (_: any, __: any, i: number) => (
      <span className="text-xs font-bold text-slate-400">{i + 1}</span>
    ),
  },
  {
    label: 'Rf. No.', key: 'c_number', filterable: true, filterType: 'text',
    render: (v: any, row: any) => (
      <span
        onClick={() => onView(row)}
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 whitespace-nowrap cursor-pointer hover:bg-blue-200 transition-colors"
      >
        {String(v ?? '—')}
      </span>
    ),
  },
  {
    label: 'Voucher Type', key: 'vouchertype', filterable: true, filterType: 'select',
    filterOptions: fOpts.voucherTypes,
    render: (v: any) => <span className="font-medium text-slate-700">{String(v ?? '—')}</span>,
  },
  {
    label: 'Voucher Date', key: 'voucherdate', filterable: true, filterType: 'date',
    render: (v: any) => <span className="whitespace-nowrap">{v ? formatDate(v) : '—'}</span>,
  },
  {
    label: 'Dr. Ledger Name', key: 'debit_ledger_names', filterable: true, filterType: 'text',
    render: (v: any) => {
      const items: string[] = Array.isArray(v) ? v : []
      return items.length ? (
        <div className="flex flex-col gap-0.5">
          {items.map((l, i) => <span key={i} className="text-xs font-medium text-red-700 whitespace-nowrap">{l}</span>)}
        </div>
      ) : <span className="text-slate-300">—</span>
    },
  },
  {
    label: 'Cr. Ledger Name', key: 'credit_ledger_names', filterable: true, filterType: 'text',
    render: (v: any) => {
      const items: string[] = Array.isArray(v) ? v : []
      return items.length ? (
        <div className="flex flex-col gap-0.5">
          {items.map((l, i) => <span key={i} className="text-xs font-medium text-emerald-700 whitespace-nowrap">{l}</span>)}
        </div>
      ) : <span className="text-slate-300">—</span>
    },
  },
  {
    label: 'Amount', key: 'debit_total', filterable: true, filterType: 'text',
    render: (v: any, row: any) => {
      const amount = v != null ? v : row.creditanddebitamount
      return <span className="font-bold text-slate-800">{amount != null ? formatCurrency(Number(amount)) : '—'}</span>
    },
  },
  {
    label: 'Value Date', key: 'valueDate', filterable: true, filterType: 'date',
    render: (v: any) => <span className="whitespace-nowrap">{v ? formatDate(v) : '—'}</span>,
  },
  {
    label: 'Vehicle No', key: 'vehicleNo', filterable: true, filterType: 'select',
    filterOptions: fOpts.busList,
    render: (v: any) => <span>{String(v ?? '—')}</span>,
  },
  {
    label: 'Staff Name', key: 'staff_type', filterable: true, filterType: 'select',
    filterOptions: fOpts.staffOptions,
    render: (v: any) => <span>{String(v ?? '—')}</span>,
  },
  {
    label: 'Description', key: 'description', filterable: true, filterType: 'text',
    render: (v: any) => v
      ? <span className="text-sm text-slate-600 max-w-[160px] line-clamp-2 block">{String(v)}</span>
      : <span className="text-slate-300 text-sm">—</span>,
  },
  {
    label: 'Entry By', key: 'entry_by', filterable: true, filterType: 'select',
    filterOptions: fOpts.entryByOpts,
    render: (v: any) => <span>{String(v ?? '—')}</span>,
  },
  {
    label: 'Actions', key: 'id',
    render: (_: any, row: any) => (
      <div className="flex gap-1.5">
        <button onClick={() => onView(row)} className="p-1.5 text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100"><Eye className="w-4 h-4" /></button>
        {mode === 'pending' && (
          <>
            <button onClick={() => onApprove(row)} className="p-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100"><CheckCircle className="w-4 h-4" /></button>
            <button onClick={() => onReject(row)} className="p-1.5 text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100"><XCircle className="w-4 h-4" /></button>
          </>
        )}
      </div>
    ),
  },
]

// ── Committed ledger rows table ─────────────────────────────────────────────
function ELedgerTable({ rows, side, onRemove }: { rows: EditLedgerItem[]; side: 'debit'|'credit'; onRemove:(i:number)=>void }) {
  if (rows.length === 0) return null
  const isDr = side === 'debit'
  return (
    <div className={`border-t pt-3 ${isDr ? 'border-red-100' : 'border-emerald-100'}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className={`text-xs font-semibold border-b ${isDr ? 'text-red-400 border-red-100' : 'text-emerald-500 border-emerald-100'}`}>
            <th className="text-left pb-1.5 w-6">#</th>
            <th className="text-left pb-1.5">Ledger Account</th>
            <th className="text-right pb-1.5 pr-1">Amount (₹)</th>
            <th className="w-5"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b last:border-0 ${isDr ? 'border-red-50' : 'border-emerald-50'}`}>
              <td className="py-2 text-xs text-slate-400">{i + 1}</td>
              <td className="py-2 font-medium text-slate-800 truncate max-w-[160px]">{row.ledger?.temple_name}</td>
              <td className={`py-2 text-right font-bold pr-1 ${isDr ? 'text-red-600' : 'text-emerald-600'}`}>
                {parseFloat(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="py-2 pl-1">
                <button type="button" onClick={() => onRemove(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Per-ledger transaction detail card ───────────────────────────────────────
function ELedgerDetailCard({ index, item, side, isPending, busList, staffOptions, onChange, onClear, onApplyToAll }: {
  index: number; item: EditLedgerItem; side: 'debit'|'credit'; isPending?: boolean
  busList: {label:string;value:string}[]; staffOptions: {label:string;value:string}[]
  onChange: (u: Partial<EditLedgerItem>) => void; onClear: () => void; onApplyToAll: () => void
}) {
  const isDr = side === 'debit'
  const todayStr = new Date().toISOString().split('T')[0]
  return (
    <div className={`rounded-xl border-2 overflow-hidden ${isDr ? 'border-red-200' : 'border-emerald-200'}`}>
      <div className={`flex items-center justify-between px-4 py-2.5 ${isDr ? 'bg-red-50' : 'bg-emerald-50'}`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="text-xs text-slate-400 font-medium w-5 flex-shrink-0">{index}.</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded tracking-wide flex-shrink-0 ${isDr ? 'text-red-500 bg-red-100 border border-red-200' : 'text-emerald-600 bg-emerald-100 border border-emerald-200'}`}>{isDr ? 'DR' : 'CR'}</span>
          <span className="font-semibold text-slate-800 text-sm truncate min-w-0">
            {item.ledger?.temple_name ?? <span className="text-slate-400 italic text-xs">Ledger not selected</span>}
          </span>
          {isPending && <span className="text-[10px] text-slate-400 italic bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">pending</span>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`font-bold text-sm tabular-nums ${isDr ? 'text-red-600' : 'text-emerald-600'}`}>
            ₹{parseFloat(item.amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <button type="button" onClick={onApplyToAll}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors">
            Apply to all
          </button>
          <button type="button" onClick={onClear}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white">
        <div>
          <Label>Value Date</Label>
          <div className="flex items-center gap-1">
            <Input type="date" max={todayStr} value={item.valueDate} onChange={e => onChange({ valueDate: e.target.value })} onClick={e => (e.target as HTMLInputElement).showPicker?.()} />
            {item.valueDate && <button type="button" onClick={() => onChange({ valueDate: '' })} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>}
          </div>
        </div>
        <div>
          <Label>Vehicle No</Label>
          <div className="flex items-center gap-1">
            <div className="flex-1 min-w-0"><SimpleDropdown value={item.vehicleNo} placeholder="Select Vehicle" options={busList} onChange={v => onChange({ vehicleNo: v })} /></div>
            {item.vehicleNo && <button type="button" onClick={() => onChange({ vehicleNo: '' })} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>}
          </div>
        </div>
        <div>
          <Label>Staff Name</Label>
          <div className="flex items-center gap-1">
            <div className="flex-1 min-w-0"><SimpleDropdown value={item.staffValue} placeholder="Select Staff" options={staffOptions} onChange={v => onChange({ staffValue: v })} /></div>
            {item.staffValue && <button type="button" onClick={() => onChange({ staffValue: '' })} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>}
          </div>
        </div>
        <div className="md:col-span-3">
          <Label>Narration</Label>
          <textarea value={item.description} onChange={e => onChange({ description: e.target.value })} rows={1}
            placeholder="Enter narration…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-slate-400" />
        </div>
      </div>
    </div>
  )
}

function groupVoucherRows(rows: any[]): any[] {
  return rows.map(row => ({
    ...row,
    debit_ledger_names: row.debit_ledger_name ? String(row.debit_ledger_name).split('|').map((s: string) => s.trim()).filter(Boolean) : [],
    credit_ledger_names: row.credit_ledger_name ? String(row.credit_ledger_name).split('|').map((s: string) => s.trim()).filter(Boolean) : [],
  }))
}

const today = new Date().toISOString().split('T')[0]

import ActivityHistory from '@/components/shared/ActivityHistory'

export default function VoucherApprovalsPage() {
  const [tab, setTab] = useState('Pending Approval')
  const [colFilters, setColFilters] = useState<Record<string, string>>({})
  const [filterInput, setFilterInput] = useState({ fromdate: '', todate: '' })
  const [appliedFilter, setAppliedFilter] = useState({ fromdate: '', todate: '' })
  const [viewModal, setViewModal] = useState<any>(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ vouchertype: '', voucherdate: '', valueDate: '', vehicleNo: '', description: '' })
  const emptyEditItem: EditLedgerItem = { ledger: null, amount: '', description: '', valueDate: '', vehicleNo: '', staffValue: '' }
  const [editDebits, setEditDebits] = useState<EditLedgerItem[]>([])
  const [editCredits, setEditCredits] = useState<EditLedgerItem[]>([])
  const [editDebitInput, setEditDebitInput] = useState<EditLedgerItem>(emptyEditItem)
  const [editCreditInput, setEditCreditInput] = useState<EditLedgerItem>(emptyEditItem)
  const editCreditAutoFilled = useRef(false)
  const editDebitAutoFilled  = useRef(false)
  const [editReason, setEditReason] = useState('')
  const originalForDiff = useRef<{ vouchertype: string; voucherdate: string; description: string; debits: EditLedgerItem[]; credits: EditLedgerItem[] } | null>(null)
  const [selectedRows, setSelectedRows] = useState<any[]>([])
  const [rejectModal, setRejectModal] = useState<{ mode: 'single' | 'bulk'; row?: any } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const qc = useQueryClient()

  const { data: pendingRes, isLoading: loadPending } = useQuery({
    queryKey: ['voucher-pending'],
    queryFn: () => accountingService.getVoucherEntries(),
  })
  const { data: approvedRes, isLoading: loadApproved } = useQuery({
    queryKey: ['voucher-approved-all'],
    queryFn: () => accountingService.getVoucherApproved(),
  })
  const { data: rejectedRes, isLoading: loadRejected } = useQuery({
    queryKey: ['voucher-rejected-all'],
    queryFn: () => accountingService.getVoucherSearch({ fromdate: '', todate: '', type: '2' }),
  })

  const { data: ledgersRes } = useQuery({
    queryKey: ['ledger-names'],
    queryFn: () => accountingService.getLedgerName(),
  })

  const { data: voucherTypesRes } = useQuery({
    queryKey: ['voucher-types'],
    queryFn: () => accountingService.getVoucherTypes({}),
  })
  const { data: busesRes } = useQuery({
    queryKey: ['buses'],
    queryFn: () => mastersService.getBuses(),
  })
  const { data: employeesRes } = useQuery({
    queryKey: ['employees-voucher'],
    queryFn: () => accountingService.getEmployeesDropdown(),
  })

  const isFiltered = !!(appliedFilter.fromdate && appliedFilter.todate)
  const { data: searched, isLoading: loadSearch } = useQuery({
    queryKey: ['voucher-search', appliedFilter],
    queryFn: () => accountingService.getVoucherSearch(appliedFilter),
    enabled: isFiltered,
  })

  const { data: modalData } = useQuery({
    queryKey: ['voucher-modal', viewModal?.c_number],
    queryFn: () => accountingService.getVoucherModalData({ serviceNo: viewModal?.c_number }),
    enabled: !!viewModal?.c_number,
  })

  const { data: auditRes } = useQuery({
    queryKey: ['voucher-audit', viewModal?.c_number],
    queryFn: () => accountingService.getVoucherAudit(viewModal!.c_number),
    enabled: !!viewModal?.c_number,
  })
  const auditTrail: any[] = auditRes?.data ?? []

  const ledgerList: any[] = ledgersRes?.data ?? []
  const voucherTypeList: any[] = voucherTypesRes?.data ?? []
  const busList = (busesRes?.data ?? []).map((b: any) => ({ label: b.bus_no, value: b.bus_no }))
  const staffOptions = (employeesRes?.data ?? []).flat().map((s: any) => ({
    label: `${s.fullName || s.helper_name || s.driver_name || '—'} (${s.type})`,
    value: `${s.staff_id}|${s.type}|${s.fullName || s.helper_name || s.driver_name || ''}`,
  }))
  const voucherTypeFilterOpts = voucherTypeList.map((v: any) => ({ label: v.voucher_type, value: v.voucher_type }))
  const staffFilterOpts = [...new Set(
    (employeesRes?.data ?? []).flat().map((s: any) => s.type).filter(Boolean)
  )].map((t: any) => ({ label: String(t), value: String(t) }))

  const allRows = [...(pendingRes?.data ?? []), ...(approvedRes?.data ?? []), ...(rejectedRes?.data ?? [])]
  const entryByOpts = [...new Set(allRows.map((r: any) => r.entry_by).filter(Boolean))]
    .map((name: any) => ({ label: String(name), value: String(name) }))

  // ── Edit-mode derived values ──────────────────────────────────────────────
  const editTotalDr   = editDebits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const editTotalCr   = editCredits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const editPendingDr = parseFloat(editDebitInput.amount) || 0
  const editPendingCr = parseFloat(editCreditInput.amount) || 0
  const editEffectiveDr   = editTotalDr + editPendingDr
  const editEffectiveCr   = editTotalCr + editPendingCr
  const editEffectiveDiff = editEffectiveDr - editEffectiveCr
  const editEffectiveBalanced = editEffectiveDr > 0 && Math.abs(editEffectiveDiff) < 0.001
  const editPendingDrValid = !editDebitInput.amount  || (!!editDebitInput.ledger  && !!editDebitInput.amount)
  const editPendingCrValid = !editCreditInput.amount || (!!editCreditInput.ledger && !!editCreditInput.amount)
  const editCreditLockedIds = new Set<number>([
    ...editCredits.map(r => r.ledger?.id).filter(Boolean) as number[],
    ...(editCreditInput.ledger ? [editCreditInput.ledger.id] : []),
  ])
  const editDebitLockedIds = new Set<number>([
    ...editDebits.map(r => r.ledger?.id).filter(Boolean) as number[],
    ...(editDebitInput.ledger ? [editDebitInput.ledger.id] : []),
  ])
  const editDebitLedgers  = ledgerList.filter(l => !editCreditLockedIds.has(l.id))
  const editCreditLedgers = ledgerList.filter(l => !editDebitLockedIds.has(l.id))
  const editPreviewDebits  = [...editDebits,  ...(editDebitInput.ledger  && editDebitInput.amount  ? [editDebitInput]  : [])]
  const editPreviewCredits = [...editCredits, ...(editCreditInput.ledger && editCreditInput.amount ? [editCreditInput] : [])]

  // ── Edit-mode handlers ────────────────────────────────────────────────────
  const handleEditDebitAmountChange = (val: string) => {
    editDebitAutoFilled.current = false
    setEditDebitInput(p => ({ ...p, amount: val }))
    if (!editCreditInput.amount || editCreditAutoFilled.current) {
      const n = parseFloat(val) || 0
      if (n > 0) { setCreditNeeded(); editCreditAutoFilled.current = true }
      else { setEditCreditInput(p => ({ ...p, amount: '' })); editCreditAutoFilled.current = false }
    }
    function setCreditNeeded() {
      const needed = (parseFloat(val) || 0) + editTotalDr - editTotalCr
      setEditCreditInput(p => ({ ...p, amount: needed > 0 ? String(needed) : '' }))
    }
  }
  const handleEditCreditAmountChange = (val: string) => {
    editCreditAutoFilled.current = false
    setEditCreditInput(p => ({ ...p, amount: val }))
    if (!editDebitInput.amount || editDebitAutoFilled.current) {
      const n = parseFloat(val) || 0
      if (n > 0) { setDebitNeeded(); editDebitAutoFilled.current = true }
      else { setEditDebitInput(p => ({ ...p, amount: '' })); editDebitAutoFilled.current = false }
    }
    function setDebitNeeded() {
      const needed = (parseFloat(val) || 0) + editTotalCr - editTotalDr
      setEditDebitInput(p => ({ ...p, amount: needed > 0 ? String(needed) : '' }))
    }
  }
  const addEditDebit = () => {
    if (!editDebitInput.ledger || !editDebitInput.amount) return
    const newDebits = [...editDebits, editDebitInput]
    setEditDebits(newDebits)
    editDebitAutoFilled.current = false
    const newDr = newDebits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
    const gap = editEffectiveCr - newDr
    if (gap > 0) { setEditDebitInput({ ...emptyEditItem, amount: String(gap) }); editDebitAutoFilled.current = true }
    else {
      setEditDebitInput(emptyEditItem)
      const crGap = newDr - editTotalCr
      if (crGap > 0) { setEditCreditInput(p => ({ ...p, amount: String(crGap) })); editCreditAutoFilled.current = true }
      else { setEditCreditInput(p => ({ ...p, amount: '' })); editCreditAutoFilled.current = false }
    }
  }
  const addEditCredit = () => {
    if (!editCreditInput.ledger || !editCreditInput.amount) return
    const newCredits = [...editCredits, editCreditInput]
    setEditCredits(newCredits)
    editCreditAutoFilled.current = false
    const newCr = newCredits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
    const gap = editEffectiveDr - newCr
    if (gap > 0) { setEditCreditInput({ ...emptyEditItem, amount: String(gap) }); editCreditAutoFilled.current = true }
    else {
      setEditCreditInput(emptyEditItem)
      const drGap = newCr - editTotalDr
      if (drGap > 0) { setEditDebitInput(p => ({ ...p, amount: String(drGap) })); editDebitAutoFilled.current = true }
      else { setEditDebitInput(p => ({ ...p, amount: '' })); editDebitAutoFilled.current = false }
    }
  }
  const updateEditDebitDetail  = (i: number, u: Partial<EditLedgerItem>) => setEditDebits(p => p.map((item, idx) => idx===i ? {...item,...u} : item))
  const updateEditCreditDetail = (i: number, u: Partial<EditLedgerItem>) => setEditCredits(p => p.map((item, idx) => idx===i ? {...item,...u} : item))
  const clearEditDetail = (side: 'debit'|'credit', i: number|'pending') => {
    const blank = { description:'', valueDate:'', vehicleNo:'', staffValue:'' }
    if (side==='debit') { if (i==='pending') setEditDebitInput(p=>({...p,...blank})); else updateEditDebitDetail(i as number, blank) }
    else { if (i==='pending') setEditCreditInput(p=>({...p,...blank})); else updateEditCreditDetail(i as number, blank) }
  }
  const applyEditDetailToAll = (src: EditLedgerItem) => {
    const d = { description: src.description, valueDate: src.valueDate, vehicleNo: src.vehicleNo, staffValue: src.staffValue }
    setEditDebits(p => p.map(item => ({...item,...d})))
    setEditCredits(p => p.map(item => ({...item,...d})))
    setEditDebitInput(p => ({...p,...d}))
    setEditCreditInput(p => ({...p,...d}))
  }

  // Populate edit state when modal data arrives
  useEffect(() => {
    if (!modalData?.data || !viewModal) return
    const subs: any[] = Array.isArray(modalData.data[1]) ? modalData.data[1] : []
    const debitSubs = subs.filter((r: any) => r.account_type === 'Debit Account')
    const creditSubs = subs.filter((r: any) => r.account_type === 'Credit Account')

    setEditForm({
      vouchertype: viewModal.vouchertype ?? '',
      voucherdate: viewModal.voucherdate ? String(viewModal.voucherdate).split('T')[0] : '',
      valueDate: viewModal.valueDate ? String(viewModal.valueDate).split('T')[0] : '',
      vehicleNo: viewModal.vehicleNo ?? '',
      description: viewModal.description ?? '',
    })
    setEditReason('')
    setEditDebitInput(emptyEditItem)
    setEditCreditInput(emptyEditItem)
    editDebitAutoFilled.current = false
    editCreditAutoFilled.current = false
    const toEditItem = (r: any): EditLedgerItem => ({
      ledger: ledgerList.find((l: any) => l.temple_name === r.expensives) ?? null,
      amount: String(r.amount ?? ''),
      description: r.description ?? '',
      valueDate: r.valueDate ? String(r.valueDate).split('T')[0] : '',
      vehicleNo: r.vehicleNo ?? '',
      staffValue: r.staff_type_id ? `${r.staff_type_id}|${r.staff_type || ''}|${r.name || ''}` : '',
    })
    const mappedDebits = debitSubs.map(toEditItem)
    const mappedCredits = creditSubs.map(toEditItem)
    setEditDebits(mappedDebits)
    setEditCredits(mappedCredits)
    originalForDiff.current = {
      vouchertype: viewModal.vouchertype ?? '',
      voucherdate: viewModal.voucherdate ? String(viewModal.voucherdate).split('T')[0] : '',
      description: viewModal.description ?? '',
      debits: mappedDebits,
      credits: mappedCredits,
    }
  }, [modalData, ledgerList])

  // Reset edit mode when modal changes
  useEffect(() => { setEditMode(false); setEditReason('') }, [viewModal?.c_number])

  const { mutate: updateStatus } = useMutation({
    mutationFn: (payload: { row: any; status: number; rejection_reason?: string }) =>
      accountingService.updateVoucherStatus({
        vouchervalue: payload.status,
        admin_status_by_id: localStorage.getItem('user_id'),
        admin_status_by_name: localStorage.getItem('usr_nm'),
        admin_status_by_date: new Date().toISOString().split('T')[0],
        rejection_reason: payload.rejection_reason ?? '',
        voucherdata: { c_number: payload.row.c_number },
      }),
    onSuccess: (res, payload) => {
      if (res.status === 200) {
        toast.success('Status updated!')
        qc.invalidateQueries({ queryKey: ['voucher-pending'] })
        qc.invalidateQueries({ queryKey: ['voucher-approved-all'] })
        qc.invalidateQueries({ queryKey: ['voucher-rejected-all'] })
        qc.invalidateQueries({ queryKey: ['voucher-audit', payload.row.c_number] })
      } else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const validateEditForm = () => {
    const allDebits  = [...editDebits,  ...(editDebitInput.ledger  && editDebitInput.amount  ? [editDebitInput]  : [])]
    const allCredits = [...editCredits, ...(editCreditInput.ledger && editCreditInput.amount ? [editCreditInput] : [])]
    const totalDr = allDebits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
    const totalCr = allCredits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
    if (!editReason.trim()) { toast.error('Reason for editing is required'); return false }
    if (!editForm.vouchertype) { toast.error('Voucher type is required'); return false }
    if (!editForm.voucherdate) { toast.error('Voucher date is required'); return false }
    if (!editForm.description.trim()) { toast.error('Voucher narration is required'); return false }
    if (allDebits.length === 0) { toast.error('Add at least one debit entry'); return false }
    if (allCredits.length === 0) { toast.error('Add at least one credit entry'); return false }
    if (Math.abs(totalDr - totalCr) > 0.001) { toast.error(`Debit (${totalDr}) does not equal Credit (${totalCr}) — must balance`); return false }
    return true
  }

  const { mutate: saveEdit, isPending: saving } = useMutation({
    mutationFn: () => {
      const selectedType = voucherTypeList.find(v => v.voucher_type === editForm.vouchertype)
        ?? { voucher_type: editForm.vouchertype, id: null }
      const allDebits  = [...editDebits,  ...(editDebitInput.ledger  && editDebitInput.amount  ? [editDebitInput]  : [])]
      const allCredits = [...editCredits, ...(editCreditInput.ledger && editCreditInput.amount ? [editCreditInput] : [])]
      const totalDr = allDebits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
      const totalCr = allCredits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)

      const userId = localStorage.getItem('user_id')
      const userName = localStorage.getItem('usr_nm')
      const todayStr = new Date().toISOString().split('T')[0]
      const firstDr = allDebits[0]
      const primaryStaff = parseStaff(firstDr?.staffValue ?? '')

      return accountingService.updateVoucher({
        c_number: viewModal.c_number,
        c_id: viewModal.c_id,
        i_ts: viewModal.i_ts,
        entry_by: viewModal.entry_by,
        updatedby_id: userId,
        updatedby_name: userName,
        updatedby_date: todayStr,
        expensedetails: {
          vouchertype: selectedType,
          voucher_type_id: selectedType.id,
          voucherdate: editForm.voucherdate,
          description: editForm.description,
          valueDate: firstDr?.valueDate ?? '',
          vehicleNo: firstDr?.vehicleNo ?? '',
          name: primaryStaff?.name ?? '',
          staff_type: primaryStaff?.type ?? '',
          staff_type_id: String(primaryStaff?.id ?? ''),
        },
        patientsTstdts: allDebits.map(d => {
          const st = parseStaff(d.staffValue)
          return {
            d_test_name: d.ledger,
            d_test_amount: parseFloat(d.amount) || 0,
            temple_name: d.ledger?.temple_name,
            debitaccount: 'Debit Account',
            description: d.description,
            valueDate: d.valueDate,
            vehicleNo: d.vehicleNo,
            name: st?.name ?? '',
            staff_type: st?.type ?? '',
            staff_type_id: String(st?.id ?? ''),
          }
        }),
        creditaddrowdts: allCredits.map(c => {
          const st = parseStaff(c.staffValue)
          return {
            creditledger: c.ledger,
            creditamount: parseFloat(c.amount) || 0,
            temple_name: c.ledger?.temple_name,
            creditaccount: 'Credit Account',
            description: c.description,
            valueDate: c.valueDate,
            vehicleNo: c.vehicleNo,
            name: st?.name ?? '',
            staff_type: st?.type ?? '',
            staff_type_id: String(st?.id ?? ''),
          }
        }),
        creditanddebitamount: totalDr + totalCr,
        user_id: userId,
        named: userName,
        changes_note: (() => {
          type ChangeRow = { side: string; idx: number; ledger: string; field: string; old: string; nw: string }
          const changes: ChangeRow[] = []
          const hdr = (field: string, old: string, nw: string) => changes.push({ side: 'header', idx: 0, ledger: '', field, old, nw })
          const orig = originalForDiff.current
          if (orig) {
            if (orig.vouchertype !== editForm.vouchertype) hdr('Voucher Type', orig.vouchertype, editForm.vouchertype)
            if (orig.voucherdate !== editForm.voucherdate) hdr('Voucher Date', orig.voucherdate, editForm.voucherdate)
            if (orig.description.trim() !== editForm.description.trim()) hdr('Narration', orig.description.trim(), editForm.description.trim())
            const cmp = (origItems: EditLedgerItem[], newItems: EditLedgerItem[], side: string) => {
              const len = Math.max(origItems.length, newItems.length)
              for (let i = 0; i < len; i++) {
                const o = origItems[i]; const n = newItems[i]
                const ledger = o?.ledger?.temple_name ?? n?.ledger?.temple_name ?? ''
                const row = (field: string, old: string, nw: string) => changes.push({ side, idx: i + 1, ledger, field, old, nw })
                if (!o) { row('Entry', '', `${n.ledger?.temple_name ?? '?'} (${n.amount})`); continue }
                if (!n) { row('Entry', `${o.ledger?.temple_name ?? '?'} (${o.amount})`, ''); continue }
                if ((o.ledger?.temple_name ?? '') !== (n.ledger?.temple_name ?? '')) row('Ledger', o.ledger?.temple_name ?? '', n.ledger?.temple_name ?? '')
                if ((parseFloat(o.amount)||0) !== (parseFloat(n.amount)||0)) row('Amount', o.amount, n.amount)
                if ((o.description ?? '').trim() !== (n.description ?? '').trim()) row('Narration', (o.description ?? '').trim(), (n.description ?? '').trim())
                if ((o.valueDate ?? '') !== (n.valueDate ?? '')) row('Value Date', o.valueDate || '', n.valueDate || '')
                if ((o.vehicleNo ?? '') !== (n.vehicleNo ?? '')) row('Vehicle', o.vehicleNo || '', n.vehicleNo || '')
                const os = parseStaff(o.staffValue ?? '')?.name ?? ''; const ns = parseStaff(n.staffValue ?? '')?.name ?? ''
                if (os !== ns) row('Staff', os, ns)
              }
            }
            cmp(orig.debits, allDebits, 'DR')
            cmp(orig.credits, allCredits, 'CR')
          }
          return JSON.stringify({ reason: editReason.trim(), changes })
        })(),
      })
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Voucher updated!')
        setEditMode(false)
        setViewModal((v: any) => v ? {
          ...v,
          vouchertype: editForm.vouchertype,
          voucherdate: editForm.voucherdate,
          description: editForm.description,
        } : v)
        qc.invalidateQueries({ queryKey: ['voucher-pending'] })
        qc.invalidateQueries({ queryKey: ['voucher-approved-all'] })
        qc.invalidateQueries({ queryKey: ['voucher-rejected-all'] })
        qc.invalidateQueries({ queryKey: ['voucher-modal', viewModal?.c_number] })
        qc.invalidateQueries({ queryKey: ['voucher-audit', viewModal?.c_number] })
      } else toast.error(res.message ?? 'Update failed')
    },
    onError: () => toast.error('Server error'),
  })

  const handleApprove = (row: any) => updateStatus({ row, status: 1 })
  const handleReject = (row: any) => { setRejectReason(''); setRejectModal({ mode: 'single', row }) }
  const handleView = (row: any) => setViewModal(row)

  const [bulkApproving, setBulkApproving] = useState(false)
  const [bulkRejecting, setBulkRejecting] = useState(false)

  const runBulkAction = async (status: 1 | 2, reason = '') => {
    if (!selectedRows.length) return
    if (status === 2) { setRejectReason(''); setRejectModal({ mode: 'bulk' }); return }
    const setLoading = status === 1 ? setBulkApproving : setBulkRejecting
    setLoading(true)
    const adminId = localStorage.getItem('user_id')
    const adminName = localStorage.getItem('usr_nm')
    const date = new Date().toISOString().split('T')[0]
    for (const row of selectedRows) {
      await accountingService.updateVoucherStatus({
        vouchervalue: status,
        admin_status_by_id: adminId,
        admin_status_by_name: adminName,
        admin_status_by_date: date,
        rejection_reason: reason,
        voucherdata: { c_number: row.c_number },
      }).catch(() => {})
    }
    const count = selectedRows.length
    setLoading(false)
    setSelectedRows([])
    toast.success(`${count} voucher${count !== 1 ? 's' : ''} approved`)
    qc.invalidateQueries({ queryKey: ['voucher-pending'] })
    qc.invalidateQueries({ queryKey: ['voucher-approved-all'] })
    qc.invalidateQueries({ queryKey: ['voucher-rejected-all'] })
  }

  const confirmReject = async () => {
    const reason = rejectReason.trim()
    if (!reason) { toast.error('Please enter a rejection reason'); return }
    const mode = rejectModal?.mode
    const row = rejectModal?.row
    setRejectModal(null)
    if (mode === 'single' && row) {
      updateStatus({ row, status: 2, rejection_reason: reason })
    } else if (mode === 'bulk') {
      setBulkRejecting(true)
      const adminId = localStorage.getItem('user_id')
      const adminName = localStorage.getItem('usr_nm')
      const date = new Date().toISOString().split('T')[0]
      for (const r of selectedRows) {
        await accountingService.updateVoucherStatus({
          vouchervalue: 2,
          admin_status_by_id: adminId,
          admin_status_by_name: adminName,
          admin_status_by_date: date,
          rejection_reason: reason,
          voucherdata: { c_number: r.c_number },
        }).catch(() => {})
      }
      const count = selectedRows.length
      setBulkRejecting(false)
      setSelectedRows([])
      toast.success(`${count} voucher${count !== 1 ? 's' : ''} rejected`)
      qc.invalidateQueries({ queryKey: ['voucher-pending'] })
      qc.invalidateQueries({ queryKey: ['voucher-approved-all'] })
      qc.invalidateQueries({ queryKey: ['voucher-rejected-all'] })
    }
  }

  const searchList: any[] = isFiltered ? (searched?.data ?? []) : []
  const pending: any[]      = groupVoucherRows(isFiltered ? searchList.filter(r => !r.status || r.status == 0) : (pendingRes?.data ?? []))
  const approvedList: any[] = groupVoucherRows(isFiltered ? searchList.filter(r => r.status == 1)              : (approvedRes?.data ?? []))
  const rejectedList: any[] = groupVoucherRows(isFiltered ? searchList.filter(r => r.status == 2)              : (rejectedRes?.data ?? []))

  const getList = () => tab === 'Pending Approval' ? pending : tab === 'Approved' ? approvedList : rejectedList
  const getMode = () => tab === 'Pending Approval' ? 'pending' : 'view'

  const subRows: any[] = Array.isArray(modalData?.data?.[1]) ? modalData.data[1] : []
  const debitRows = subRows.filter(r => r.account_type === 'Debit Account')
  const creditRows = subRows.filter(r => r.account_type === 'Credit Account')

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Voucher Approvals" subtitle="Review and approve accounting vouchers" />

      {/* Status tabs */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: `Pending (${pending.length})`, key: 'Pending Approval', color: 'text-amber-600' },
          { label: `Approved (${approvedList.length})`, key: 'Approved', color: 'text-emerald-600' },
          { label: `Rejected (${rejectedList.length})`, key: 'Rejected', color: 'text-red-600' },
        ].map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${tab === t.key ? `bg-white shadow-sm ${t.color} border-slate-200` : 'text-slate-500 border-transparent hover:bg-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-slate-500 to-slate-700">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <Label>From Date</Label>
            <Input type="date" max={today} value={filterInput.fromdate} onChange={(e) => setFilterInput(f => ({ ...f, fromdate: e.target.value }))} />
          </div>
          <div>
            <Label>To Date</Label>
            <Input type="date" max={today} value={filterInput.todate} onChange={(e) => setFilterInput(f => ({ ...f, todate: e.target.value }))} />
          </div>
          <Button
            onClick={() => setAppliedFilter({ ...filterInput })}
            disabled={!filterInput.fromdate || !filterInput.todate}
          >
            <Search className="w-4 h-4" /> Search
          </Button>
          {isFiltered && (
            <Button variant="outline" onClick={() => {
              setFilterInput({ fromdate: '', todate: '' })
              setAppliedFilter({ fromdate: '', todate: '' })
            }}>
              <X className="w-4 h-4" /> Clear
            </Button>
          )}
        </div>
      </GlassCard>

      <DataTable
        title={tab}
        columns={buildCols(handleApprove, handleReject, handleView, getMode(), {
          voucherTypes: voucherTypeFilterOpts,
          busList,
          staffOptions: staffFilterOpts,
          entryByOpts,
        }) as any}
        data={getList()}
        loading={loadPending || loadApproved || loadRejected || loadSearch}
        onAction={() => {}}
        actions={[]}
        columnFilters={colFilters}
        onColumnFilterChange={(key, val) => setColFilters(f => ({ ...f, [key]: val }))}
        selectable
        sumKey="debit_total"
        onSelectionChange={(rows) => setSelectedRows(rows)}
        selectionActions={tab === 'Pending Approval' ? (
          <>
            <button
              onClick={() => runBulkAction(1)}
              disabled={bulkApproving || bulkRejecting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              {bulkApproving ? 'Approving…' : 'Approve Selected'}
            </button>
            <button
              onClick={() => runBulkAction(2)}
              disabled={bulkApproving || bulkRejecting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              {bulkRejecting ? 'Rejecting…' : 'Reject Selected'}
            </button>
          </>
        ) : undefined}
      />

      {/* View / Edit Modal — bottom sheet */}
      <AnimatePresence>
        {viewModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setViewModal(null) }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-white rounded-t-3xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">

              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-violet-600 p-5 text-white flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <CreditCard className="w-5 h-5" /> {viewModal.c_number}
                  </h3>
                  <p className="text-purple-200 text-sm mt-0.5">
                    {viewModal.vouchertype} · {viewModal.voucherdate ? formatDate(viewModal.voucherdate) : '—'}
                  </p>
                </div>
                <button onClick={() => setViewModal(null)} className="text-white/70 hover:text-white mt-0.5">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">

                {/* Voucher meta */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {[
                    ['Voucher Type', viewModal.vouchertype],
                    ['Total Amount', viewModal.creditanddebitamount ? formatCurrency(Number(viewModal.creditanddebitamount)) : '—'],
                    ['Entry By', viewModal.entry_by || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wide">{label}</div>
                      <div className="font-semibold text-slate-900 mt-0.5 truncate">{value ?? '—'}</div>
                    </div>
                  ))}
                </div>

                {/* Description */}
                {viewModal.description && (
                  <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Description</div>
                    <div className="text-sm text-slate-800 whitespace-pre-wrap">{viewModal.description}</div>
                  </div>
                )}

                {/* ── VIEW MODE ─────────────────────────────────────────── */}
                {!editMode && (
                  <>
                    {/* Journal entry table */}
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 border-b border-slate-200">
                        <BookOpen className="w-4 h-4 text-slate-500" />
                        <span className="font-bold text-sm text-slate-700">Journal Entry</span>
                        {Math.abs(debitRows.reduce((s,r)=>s+Number(r.amount||0),0) - creditRows.reduce((s,r)=>s+Number(r.amount||0),0)) < 0.01
                          ? <span className="ml-auto text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">✓ Balanced</span>
                          : <span className="ml-auto text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">⚠ Unbalanced</span>
                        }
                      </div>
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/60 border-b border-slate-100">
                            <th className="text-left px-4 py-2 w-8">#</th>
                            <th className="text-left px-4 py-2">Particulars</th>
                            <th className="text-right px-4 py-2 w-32">Dr (₹)</th>
                            <th className="text-right px-4 py-2 w-32">Cr (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {debitRows.map((r, i) => (
                            <tr key={`dr-${i}`} className="hover:bg-red-50/30">
                              <td className="px-4 py-2.5 text-xs text-slate-400">{i + 1}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-800">{r.expensives || '—'}</span>
                                  <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded tracking-wide">DR</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right font-bold text-red-600 tabular-nums">{Number(r.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                              <td className="px-4 py-2.5" />
                            </tr>
                          ))}
                          {creditRows.map((r, i) => (
                            <tr key={`cr-${i}`} className="hover:bg-emerald-50/30">
                              <td className="px-4 py-2.5 text-xs text-slate-400">{debitRows.length + i + 1}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2 pl-6">
                                  <span className="text-slate-400 text-xs italic mr-1">To</span>
                                  <span className="font-semibold text-slate-800">{r.expensives || '—'}</span>
                                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded tracking-wide">CR</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5" />
                              <td className="px-4 py-2.5 text-right font-bold text-emerald-600 tabular-nums">{Number(r.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-slate-200 bg-slate-50">
                            <td colSpan={2} className="px-4 py-2.5 text-right text-sm font-bold text-slate-600">Total</td>
                            <td className="px-4 py-2.5 text-right font-extrabold text-red-700 tabular-nums border-l border-slate-200">
                              {debitRows.reduce((s,r)=>s+Number(r.amount||0),0).toLocaleString('en-IN',{minimumFractionDigits:2})}
                            </td>
                            <td className="px-4 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums border-l border-slate-200">
                              {creditRows.reduce((s,r)=>s+Number(r.amount||0),0).toLocaleString('en-IN',{minimumFractionDigits:2})}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Transaction details — one card per ledger */}
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Transaction Details</p>
                      <div className="space-y-3">
                        {[...debitRows.map((r:any) => ({...r, _side:'dr'})), ...creditRows.map((r:any) => ({...r, _side:'cr'}))].map((r:any, i:number) => {
                          const isDr = r._side === 'dr'
                          return (
                            <div key={i} className={`rounded-xl border-2 overflow-hidden ${isDr ? 'border-red-200' : 'border-emerald-200'}`}>
                              <div className={`flex items-center justify-between px-4 py-2.5 ${isDr ? 'bg-red-50' : 'bg-emerald-50'}`}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded tracking-wide flex-shrink-0 ${isDr ? 'text-red-500 bg-red-100 border border-red-200' : 'text-emerald-600 bg-emerald-100 border border-emerald-200'}`}>{isDr ? 'DR' : 'CR'}</span>
                                  <span className="font-semibold text-slate-800 text-sm truncate">{r.expensives || '—'}</span>
                                </div>
                                <span className={`font-bold text-sm tabular-nums flex-shrink-0 ml-2 ${isDr ? 'text-red-600' : 'text-emerald-600'}`}>
                                  ₹{Number(r.amount||0).toLocaleString('en-IN',{minimumFractionDigits:2})}
                                </span>
                              </div>
                              <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white">
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Value Date</p>
                                  <p className="text-sm font-medium text-slate-700">{r.valueDate ? formatDate(r.valueDate) : <span className="text-slate-300">—</span>}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Vehicle No</p>
                                  <p className="text-sm font-medium text-slate-700">{r.vehicleNo || <span className="text-slate-300">—</span>}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Staff Name</p>
                                  <p className="text-sm font-medium text-slate-700">{r.name || <span className="text-slate-300">—</span>}</p>
                                </div>
                                <div className="md:col-span-3">
                                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Narration</p>
                                  <p className="text-sm text-slate-700">{r.description || <span className="text-slate-300">—</span>}</p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}

                {/* ── EDIT MODE ─────────────────────────────────────────── */}
                {editMode && (
                  <div className="space-y-5">

                    {/* Edit reason — required */}
                    <div className="rounded-xl border-2 border-amber-200 bg-amber-50/40 p-4">
                      <Label className="text-amber-700 font-bold">Reason for Editing <span className="text-red-500">*</span></Label>
                      <textarea autoFocus value={editReason} onChange={e => setEditReason(e.target.value)} rows={2}
                        placeholder="Explain why you are editing this voucher…"
                        className={`mt-1 w-full rounded-xl border px-3 py-2 text-sm shadow-sm resize-none focus:outline-none focus:ring-2 placeholder:text-slate-400 bg-white ${editReason.trim() ? 'border-amber-300 focus:ring-amber-400/30' : 'border-red-300 focus:ring-red-400/30'}`}
                      />
                      {!editReason.trim() && <p className="text-xs text-red-500 mt-1">Required before saving</p>}
                    </div>

                    {/* Voucher Type + Date */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Choose Voucher Type <span className="text-red-500">*</span></Label>
                        <SimpleDropdown value={editForm.vouchertype} placeholder="Select Voucher Type"
                          options={voucherTypeList.map((v: any) => ({ label: v.voucher_type, value: v.voucher_type }))}
                          onChange={v => setEditForm(f => ({ ...f, vouchertype: v }))} />
                      </div>
                      <div>
                        <Label>Voucher Date <span className="text-red-500">*</span></Label>
                        <Input type="date" max={today} value={editForm.voucherdate}
                          onChange={e => setEditForm(f => ({ ...f, voucherdate: e.target.value }))} />
                      </div>
                    </div>

                    {/* Debit / Credit input panels */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                      {/* Debit panel */}
                      <div className="rounded-xl border-2 border-red-200 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-200">
                          <div className="flex items-center gap-2">
                            <span className="text-red-600 font-bold text-sm tracking-wide">Debit Account</span>
                            {editDebits.length > 0 && (
                              <span className="text-[11px] font-bold text-red-500 bg-white border border-red-200 px-2 py-0.5 rounded-full">
                                {editDebits.length} {editDebits.length === 1 ? 'entry' : 'entries'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {editEffectiveCr > editEffectiveDr && (
                              <span className="text-[11px] font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                                Need {(editEffectiveCr - editEffectiveDr).toLocaleString('en-IN')} more
                              </span>
                            )}
                            <span className={`font-bold text-sm tabular-nums ${editPendingDr > 0 ? 'text-red-400' : 'text-red-600'}`}>
                              {editEffectiveDr.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex gap-2 items-end">
                            <div className="flex-1 min-w-0">
                              <Label>Choose Ledger Name <span className="text-red-500">*</span></Label>
                              <LedgerDropdown value={editDebitInput.ledger} ledgers={editDebitLedgers}
                                onChange={l => setEditDebitInput(p => ({ ...p, ledger: l }))} />
                            </div>
                            <div className="w-28 flex-shrink-0">
                              <Label>Amount <span className="text-red-500">*</span></Label>
                              <Input type="number" placeholder="0.00" value={editDebitInput.amount}
                                onChange={e => handleEditDebitAmountChange(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addEditDebit()} />
                            </div>
                            <div className="mt-5 flex-shrink-0">
                              <button type="button" onClick={addEditDebit}
                                disabled={!editDebitInput.ledger || !editDebitInput.amount}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                            </div>
                          </div>
                          {editDebitInput.amount && (
                            <p className={`text-[11px] font-semibold px-1 ${editEffectiveBalanced ? 'text-green-600' : editEffectiveDiff > 0 ? 'text-orange-500' : 'text-red-500'}`}>
                              {editEffectiveBalanced
                                ? `Balanced — ${editEffectiveDr.toLocaleString('en-IN')}`
                                : editEffectiveDiff > 0
                                  ? `Debit exceeds credit by ${editEffectiveDiff.toLocaleString('en-IN')}`
                                  : `Need ${Math.abs(editEffectiveDiff).toLocaleString('en-IN')} more on debit`}
                            </p>
                          )}
                          <ELedgerTable rows={editDebits} side="debit"
                            onRemove={i => setEditDebits(p => p.filter((_, idx) => idx !== i))} />
                        </div>
                      </div>

                      {/* Credit panel */}
                      <div className="rounded-xl border-2 border-emerald-200 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b border-emerald-200">
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-bold text-sm tracking-wide">Credit Account</span>
                            {editCredits.length > 0 && (
                              <span className="text-[11px] font-bold text-emerald-600 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
                                {editCredits.length} {editCredits.length === 1 ? 'entry' : 'entries'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {editEffectiveDr > editEffectiveCr && (
                              <span className="text-[11px] font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                                Need {(editEffectiveDr - editEffectiveCr).toLocaleString('en-IN')} more
                              </span>
                            )}
                            <span className={`font-bold text-sm tabular-nums ${editPendingCr > 0 ? 'text-emerald-400' : 'text-emerald-600'}`}>
                              {editEffectiveCr.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex gap-2 items-end">
                            <div className="flex-1 min-w-0">
                              <Label>Choose Ledger Name <span className="text-red-500">*</span></Label>
                              <LedgerDropdown value={editCreditInput.ledger} ledgers={editCreditLedgers}
                                onChange={l => setEditCreditInput(p => ({ ...p, ledger: l }))} />
                            </div>
                            <div className="w-28 flex-shrink-0">
                              <Label>Amount <span className="text-red-500">*</span></Label>
                              <Input type="number" placeholder="0.00" value={editCreditInput.amount}
                                onChange={e => handleEditCreditAmountChange(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addEditCredit()} />
                            </div>
                            <div className="mt-5 flex-shrink-0">
                              <button type="button" onClick={addEditCredit}
                                disabled={!editCreditInput.ledger || !editCreditInput.amount}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                            </div>
                          </div>
                          {editCreditInput.amount && (
                            <p className={`text-[11px] font-semibold px-1 ${editEffectiveBalanced ? 'text-green-600' : editEffectiveDiff < 0 ? 'text-orange-500' : 'text-red-500'}`}>
                              {editEffectiveBalanced
                                ? `Balanced — ${editEffectiveCr.toLocaleString('en-IN')}`
                                : editEffectiveDiff < 0
                                  ? `Credit exceeds debit by ${Math.abs(editEffectiveDiff).toLocaleString('en-IN')}`
                                  : `Need ${editEffectiveDiff.toLocaleString('en-IN')} more on credit`}
                            </p>
                          )}
                          <ELedgerTable rows={editCredits} side="credit"
                            onRemove={i => setEditCredits(p => p.filter((_, idx) => idx !== i))} />
                        </div>
                      </div>
                    </div>

                    {/* Global balance indicator */}
                    {editEffectiveDr > 0 && !editEffectiveBalanced && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium flex items-center justify-between">
                        <span>Debit ({editEffectiveDr.toLocaleString('en-IN')}) does not equal Credit ({editEffectiveCr.toLocaleString('en-IN')})</span>
                        <span className="font-bold">Diff: {Math.abs(editEffectiveDiff).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {editEffectiveBalanced && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-bold flex items-center justify-between">
                        <span>Balanced</span>
                        <span>{editEffectiveDr.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    {/* Transaction Details */}
                    <div className="border-t border-slate-200 pt-5">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-base font-bold text-slate-800 pb-1 border-b-2 border-blue-500 inline-block">Transaction Details</h3>
                        {(editPreviewDebits.length > 0 || editPreviewCredits.length > 0) && (
                          <button type="button" onClick={() => {
                            const blank = { description: '', valueDate: '', vehicleNo: '', staffValue: '' }
                            setEditDebits(p => p.map(i => ({ ...i, ...blank })))
                            setEditCredits(p => p.map(i => ({ ...i, ...blank })))
                            setEditDebitInput(p => ({ ...p, ...blank }))
                            setEditCreditInput(p => ({ ...p, ...blank }))
                          }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors">
                            <X className="w-3.5 h-3.5" /> Clear All Details
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-4 mt-1">Fill value date, vehicle, staff and narration for each ledger entry.</p>
                      {(editPreviewDebits.length === 0 && editPreviewCredits.length === 0) ? (
                        <div className="py-6 text-center text-sm text-slate-400 italic border border-dashed border-slate-200 rounded-xl">
                          Add debit and credit entries above to fill transaction details.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {editDebits.map((item, i) => (
                            <ELedgerDetailCard key={`edr-${i}`} index={i + 1} item={item} side="debit"
                              busList={busList} staffOptions={staffOptions}
                              onChange={u => updateEditDebitDetail(i, u)}
                              onClear={() => clearEditDetail('debit', i)}
                              onApplyToAll={() => applyEditDetailToAll(item)} />
                          ))}
                          {editDebitInput.ledger && editDebitInput.amount && (
                            <ELedgerDetailCard key="edr-pending" index={editDebits.length + 1} item={editDebitInput} side="debit" isPending
                              busList={busList} staffOptions={staffOptions}
                              onChange={u => setEditDebitInput(p => ({ ...p, ...u }))}
                              onClear={() => clearEditDetail('debit', 'pending')}
                              onApplyToAll={() => applyEditDetailToAll(editDebitInput)} />
                          )}
                          {editCredits.map((item, i) => (
                            <ELedgerDetailCard key={`ecr-${i}`}
                              index={editDebits.length + (editDebitInput.ledger && editDebitInput.amount ? 1 : 0) + i + 1}
                              item={item} side="credit"
                              busList={busList} staffOptions={staffOptions}
                              onChange={u => updateEditCreditDetail(i, u)}
                              onClear={() => clearEditDetail('credit', i)}
                              onApplyToAll={() => applyEditDetailToAll(item)} />
                          ))}
                          {editCreditInput.ledger && editCreditInput.amount && (
                            <ELedgerDetailCard key="ecr-pending"
                              index={editDebits.length + (editDebitInput.ledger && editDebitInput.amount ? 1 : 0) + editCredits.length + 1}
                              item={editCreditInput} side="credit" isPending
                              busList={busList} staffOptions={staffOptions}
                              onChange={u => setEditCreditInput(p => ({ ...p, ...u }))}
                              onClear={() => clearEditDetail('credit', 'pending')}
                              onApplyToAll={() => applyEditDetailToAll(editCreditInput)} />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Voucher Narration */}
                    <div>
                      <Label>Voucher Narration <span className="text-red-500">*</span></Label>
                      <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        rows={2} placeholder="Enter overall voucher description / narration"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-slate-400" />
                    </div>

                    {/* Validation chips */}
                    {(!editReason.trim() || !editForm.vouchertype || !editForm.description.trim() || !editEffectiveBalanced) && (
                      <div className="flex flex-wrap gap-2">
                        {!editReason.trim() && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600">Edit reason required</span>}
                        {!editForm.vouchertype && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-500">Voucher type required</span>}
                        {!editForm.description.trim() && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-500">Narration required</span>}
                        {!editEffectiveBalanced && editEffectiveDr === 0 && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-500">Enter debit and credit amounts</span>}
                        {!editEffectiveBalanced && editEffectiveDr > 0 && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-500">Debit does not equal Credit (diff {Math.abs(editEffectiveDiff).toLocaleString('en-IN')})</span>}
                      </div>
                    )}
                  </div>
                )}

                {/* Audit History Timeline */}
                <div className="border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-sm">
                        <History className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 leading-tight">Activity History</p>
                        <p className="text-[10px] text-slate-400 leading-tight">Full audit trail for this voucher</p>
                      </div>
                    </div>
                    {auditTrail.length > 0 && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full border border-slate-200">
                        {auditTrail.length} {auditTrail.length === 1 ? 'event' : 'events'}
                      </span>
                    )}
                  </div>

                  <ActivityHistory 
                    data={auditTrail} 
                    initialCreator={viewModal?.entry_by} 
                    initialDate={viewModal?.voucherdate} 
                  />
                </div>

                {/* Footer actions */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                  <Button variant="ghost" onClick={() => setViewModal(null)}>Close</Button>
                  <div className="flex gap-3 flex-wrap">
                    {!editMode && (
                      <Button variant="outline" onClick={() => setEditMode(true)}>
                        <Pencil className="w-4 h-4" /> Edit
                      </Button>
                    )}
                    {editMode && (
                      <>
                        <Button variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
                        <Button variant="purple" onClick={() => { if (validateEditForm()) saveEdit() }} disabled={saving}>
                          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Changes'}
                        </Button>
                      </>
                    )}
                    {!editMode && viewModal.status == 0 && (
                      <Button variant="danger" onClick={() => { handleReject(viewModal); setViewModal(null) }}>
                        <XCircle className="w-4 h-4" /> Reject
                      </Button>
                    )}
                    {!editMode && viewModal.status == 0 && (
                      <Button variant="success" onClick={() => { handleApprove(viewModal); setViewModal(null) }}>
                        <CheckCircle className="w-4 h-4" /> Approve
                      </Button>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rejection reason modal */}
      <AnimatePresence>
        {rejectModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Reason for Rejection</h3>
                  <p className="text-sm text-slate-500">
                    {rejectModal.mode === 'bulk'
                      ? `Rejecting ${selectedRows.length} voucher${selectedRows.length !== 1 ? 's' : ''}`
                      : `Voucher ${rejectModal.row?.c_number}`}
                  </p>
                </div>
              </div>
              <textarea
                autoFocus
                rows={4}
                placeholder="Enter rejection reason…"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40 placeholder:text-slate-400"
              />
              <div className="flex justify-end gap-3 pt-1">
                <Button variant="ghost" onClick={() => setRejectModal(null)}>Cancel</Button>
                <Button variant="danger" onClick={confirmReject} disabled={!rejectReason.trim()}>
                  <XCircle className="w-4 h-4" /> Confirm Reject
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
