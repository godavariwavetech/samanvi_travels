import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { CreditCard, Save, ChevronDown, Search, Plus, Trash2, X, CopyCheck, Pencil, Check, RefreshCw, History } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader, DualScrollTable, LedgerGroupTag, useLedgerGroupOf } from '@/components/shared'
import { accountingService } from '@/services/accounting.service'
import { mastersService } from '@/services/masters.service'
import { getCurrentFY, getFYList, type FinancialYear } from '@/lib/fy'
import { useFYStore } from '@/store/fy.store'
import { formatCurrency, formatDate, ledgerGroupName, todayISO } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────
interface Ledger { id: number; temple_name: string; ledger_id: number; [key: string]: any }
interface LineItem {
  ledger: Ledger | null
  amount: string
  description: string
  valueDate: string
  vehicleNo: string
  staffValue: string  // "id|type|name" packed string
}
interface SelectedStaff { id: number; type: string; name: string }

const emptyDetail = { description: '', valueDate: '', vehicleNo: '', staffValue: '' }

function parseStaff(staffValue: string): SelectedStaff | null {
  if (!staffValue) return null
  const [id, type, name] = staffValue.split('|')
  return { id: parseInt(id) || 0, type: type ?? '', name: name ?? '' }
}

const splitLedgerNames = (s: string | null | undefined): string[] =>
  s ? String(s).split('|').map(x => x.trim()).filter(Boolean) : []

// ── InlineRefresh — small icon sat inside a dropdown trigger, re-hits the
// source API without stealing width from the trigger itself ───────────────
function InlineRefresh({ onRefresh, refreshing, title }: {
  onRefresh: () => void
  refreshing?: boolean
  title?: string
}) {
  return (
    <span
      role="button" tabIndex={0} title={title ?? 'Refresh'}
      onClick={e => { e.stopPropagation(); if (!refreshing) onRefresh() }}
      onMouseDown={e => e.stopPropagation()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (!refreshing) onRefresh() } }}
      className="flex flex-shrink-0 items-center justify-center p-1 -m-1 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
    </span>
  )
}

// ── LedgerDropdown — portal-based, immune to overflow:hidden parents ───────
function LedgerDropdown({ value, ledgers, onChange, onRefresh, refreshing }: {
  value: Ledger | null
  ledgers: Ledger[]
  onChange: (l: Ledger | null) => void
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const PANEL_MAX_H = 280

  const openDropdown = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(true)
    setSearch('')
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const panel = document.getElementById('ledger-portal-panel')
      if (panel?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      setOpen(false); setSearch('')
    }
    const onScroll = (e: Event) => {
      const panel = document.getElementById('ledger-portal-panel')
      if (panel?.contains(e.target as Node)) return
      setOpen(false); setSearch('')
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const filtered = ledgers.filter(l =>
    `${l.temple_name ?? ''} ${ledgerGroupName(l)}`.toLowerCase().includes(search.toLowerCase())
  )
  const groupOf = (l: Ledger) => ledgerGroupName(l)
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0
  const openUpward = rect ? spaceBelow < PANEL_MAX_H + 8 : false

  const panel = open && rect && createPortal(
    <div id="ledger-portal-panel" style={{
      position: 'fixed',
      top: openUpward ? undefined : rect.bottom + 4,
      bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
      left: rect.left, width: rect.width, maxHeight: PANEL_MAX_H, zIndex: 99999,
    }} className="rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 flex-shrink-0">
        <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
        <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search ledger…"
          className="flex-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 bg-transparent" />
      </div>
      <ul className="overflow-y-auto flex-1">
        <li onMouseDown={() => { onChange(null); setOpen(false) }}
          className="px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 cursor-pointer">— None —</li>
        {filtered.length === 0 && <li className="px-4 py-3 text-sm text-slate-400 text-center">No ledgers found</li>}
        {filtered.map(l => (
          <li key={l.id} onMouseDown={() => { onChange(l); setOpen(false); setSearch('') }}
            title={l.temple_name}
            className={`px-4 py-2 text-sm cursor-pointer transition-colors flex flex-col gap-0.5 ${
              value?.id === l.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-800 hover:bg-slate-50'
            }`}>
            <span className="truncate">{l.temple_name}</span>
            {groupOf(l) && (
              <span className={`text-[10px] font-medium truncate ${
                value?.id === l.id ? 'text-blue-500' : 'text-slate-400'
              }`}>{groupOf(l)}</span>
            )}
          </li>
        ))}
      </ul>
    </div>,
    document.body
  )

  return (
    <div className="flex-1 min-w-0">
      <button ref={btnRef} type="button" onClick={openDropdown} title={value?.temple_name}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
        <span className="flex flex-col items-start min-w-0 flex-1 text-left">
          <span className={value ? 'text-slate-900 font-medium truncate w-full' : 'text-slate-400 truncate w-full'}>
            {value?.temple_name || 'Select Ledger'}
          </span>
          {value && groupOf(value) && (
            <span className="text-[10px] font-medium text-slate-400 truncate w-full">
              {groupOf(value)}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {onRefresh && <InlineRefresh onRefresh={onRefresh} refreshing={refreshing} title="Refresh ledgers" />}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {panel}
    </div>
  )
}

// ── SimpleDropdown — portal-based dropdown for plain string options ────────
function SimpleDropdown({ value, options, placeholder = 'Select…', searchable, onChange, onRefresh, refreshing }: {
  value: string
  options: { label: string; value: string }[]
  placeholder?: string
  searchable?: boolean
  onChange: (v: string) => void
  onRefresh?: () => void
  refreshing?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [rect, setRect] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const PANEL_MAX_H = 240

  const openDropdown = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(true)
    setSearch('')
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const panel = document.getElementById('simple-portal-panel')
      if (panel?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      setOpen(false); setSearch('')
    }
    const onScroll = (e: Event) => {
      if (document.getElementById('simple-portal-panel')?.contains(e.target as Node)) return
      setOpen(false); setSearch('')
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const spaceBelow = rect ? window.innerHeight - rect.bottom : 0
  const openUpward = rect ? spaceBelow < PANEL_MAX_H + 8 : false
  const filtered = searchable
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options

  const panel = open && rect && createPortal(
    <div id="simple-portal-panel" style={{
      position: 'fixed',
      top: openUpward ? undefined : rect.bottom + 4,
      bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
      left: rect.left, width: rect.width, maxHeight: PANEL_MAX_H, zIndex: 99999,
    }} className="rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col">
      {searchable && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 flex-shrink-0">
          <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search…"
            className="flex-1 text-sm text-slate-800 outline-none placeholder:text-slate-400 bg-transparent" />
        </div>
      )}
      <div className="overflow-y-auto flex-1">
        {filtered.length === 0 && <div className="px-4 py-3 text-sm text-slate-400 text-center">No options found</div>}
        {filtered.map(opt => (
          <div key={opt.value} onMouseDown={() => { onChange(opt.value); setOpen(false); setSearch('') }}
            className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
              value === opt.value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-800 hover:bg-slate-50'
            }`}>{opt.label}</div>
        ))}
      </div>
    </div>,
    document.body
  )

  return (
    <div className="flex-1 min-w-0">
      <button ref={btnRef} type="button" onClick={openDropdown}
        className="flex h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm shadow-sm transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
        <span className={value ? 'text-slate-900 font-medium truncate' : 'text-slate-400 truncate'}>
          {options.find(o => o.value === value)?.label || placeholder}
        </span>
        <span className="flex items-center gap-1 flex-shrink-0">
          {onRefresh && <InlineRefresh onRefresh={onRefresh} refreshing={refreshing} title="Refresh options" />}
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>
      {panel}
    </div>
  )
}

// ── Committed ledger rows table ────────────────────────────────────────────
// `offset` shifts the displayed "#" so it matches the same row's number in
// the Transaction Details cards below — those number debit entries first,
// then continue the count into credit entries, rather than restarting at 1
// per side. Without this, the same ledger added twice (with different
// amounts) couldn't be reliably matched to its own detail card by number.
function LedgerTable({ rows, side, offset = 0, onRemove, onEditAmount }: {
  rows: LineItem[]
  side: 'debit' | 'credit'
  offset?: number
  onRemove: (i: number) => void
  onEditAmount: (i: number, amount: string) => void
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editVal, setEditVal] = useState('')

  if (rows.length === 0) return null
  const isDr = side === 'debit'

  const startEdit = (i: number, current: string) => { setEditingIndex(i); setEditVal(current) }
  const commitEdit = (i: number) => {
    const trimmed = editVal.trim()
    if (trimmed && parseFloat(trimmed) > 0) onEditAmount(i, trimmed)
    setEditingIndex(null)
  }

  return (
    <div className={`border-t pt-3 ${isDr ? 'border-red-100' : 'border-emerald-100'}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className={`sticky top-0 z-10 bg-white text-xs font-semibold border-b ${isDr ? 'text-red-400 border-red-100' : 'text-emerald-500 border-emerald-100'}`}>
            <th className="text-left pb-1.5 w-6">#</th>
            <th className="text-left pb-1.5">Ledger Account</th>
            <th className="text-right pb-1.5 pr-1">Amount (₹)</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b last:border-0 ${isDr ? 'border-red-50' : 'border-emerald-50'}`}>
              <td className="py-2 text-xs text-slate-400">{offset + i + 1}</td>
              <td className="py-2 font-medium text-slate-800 truncate max-w-[220px]">{row.ledger?.temple_name}<LedgerGroupTag group={ledgerGroupName(row.ledger)} /></td>
              <td className="py-2 text-right pr-1">
                {editingIndex === i ? (
                  <input
                    type="number" autoFocus value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onBlur={() => commitEdit(i)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit(i)
                      if (e.key === 'Escape') setEditingIndex(null)
                    }}
                    className={`w-24 text-right font-bold rounded-lg border px-1.5 py-0.5 outline-none focus:ring-2 ${
                      isDr ? 'border-red-300 focus:ring-red-400/30 text-red-600' : 'border-emerald-300 focus:ring-emerald-400/30 text-emerald-600'
                    }`}
                  />
                ) : (
                  <span className={`font-bold ${isDr ? 'text-red-600' : 'text-emerald-600'}`}>
                    {parseFloat(row.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </td>
              <td className="py-2 pl-1">
                <div className="flex items-center gap-2">
                  {editingIndex === i ? (
                    <button type="button" onClick={() => commitEdit(i)} className="text-emerald-500 hover:text-emerald-600 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button type="button" onClick={() => startEdit(i, row.amount)} className="text-slate-300 hover:text-blue-500 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button type="button" onClick={() => onRemove(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Per-ledger transaction detail card ────────────────────────────────────
function LedgerDetailCard({
  index, item, side, isPending, busList, staffOptions, onChange, onClear, onApplyToAll,
  onRefreshVehicles, vehiclesRefreshing, onRefreshStaff, staffRefreshing,
}: {
  index: number
  item: LineItem
  side: 'debit' | 'credit'
  isPending?: boolean
  busList: { label: string; value: string }[]
  staffOptions: { label: string; value: string }[]
  onChange: (updates: Partial<LineItem>) => void
  onClear: () => void
  onApplyToAll: () => void
  onRefreshVehicles?: () => void
  vehiclesRefreshing?: boolean
  onRefreshStaff?: () => void
  staffRefreshing?: boolean
}) {
  const isDr = side === 'debit'
  return (
    <div className={`rounded-xl border-2 overflow-hidden ${isDr ? 'border-red-200' : 'border-emerald-200'}`}>
      {/* Card header */}
      <div className={`flex items-center justify-between px-4 py-2.5 ${isDr ? 'bg-red-50' : 'bg-emerald-50'}`}>
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span className="text-xs text-slate-400 font-medium w-5 flex-shrink-0">{index}.</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded tracking-wide flex-shrink-0 ${
            isDr ? 'text-red-500 bg-red-100 border border-red-200' : 'text-emerald-600 bg-emerald-100 border border-emerald-200'
          }`}>{isDr ? 'DR' : 'CR'}</span>
          <span className="font-semibold text-slate-800 text-sm truncate min-w-0">
            {item.ledger?.temple_name ?? <span className="text-slate-400 italic text-xs">Ledger not selected</span>}
            {item.ledger && <LedgerGroupTag group={ledgerGroupName(item.ledger)} />}
          </span>
          {isPending && (
            <span className="text-[10px] text-slate-400 italic bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">pending</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`font-bold text-sm tabular-nums ${isDr ? 'text-red-600' : 'text-emerald-600'}`}>
            ₹{parseFloat(item.amount || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
          <button
            type="button" onClick={onApplyToAll}
            title="Apply these details to all transaction cards"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <CopyCheck className="w-3 h-3" /> Apply to all
          </button>
          <button
            type="button" onClick={onClear}
            title="Clear details for this entry"
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-slate-50 border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      {/* Card form */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white">
        <div>
          <Label>Value Date</Label>
          <div className="flex items-center gap-1">
            <Input
              type="date" max={today}
              value={item.valueDate}
              onChange={e => onChange({ valueDate: e.target.value })}
              onClick={e => (e.target as HTMLInputElement).showPicker?.()}
            />
            {item.valueDate && (
              <button type="button" onClick={() => onChange({ valueDate: '' })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div>
          <Label>Vehicle No</Label>
          <div className="flex items-center gap-1">
            <div className="flex-1 min-w-0">
              <SimpleDropdown
                value={item.vehicleNo}
                placeholder="Select Vehicle"
                options={busList}
                searchable
                onChange={v => onChange({ vehicleNo: v })}
                onRefresh={onRefreshVehicles}
                refreshing={vehiclesRefreshing}
              />
            </div>
            {item.vehicleNo && (
              <button type="button" onClick={() => onChange({ vehicleNo: '' })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div>
          <Label>Staff Name</Label>
          <div className="flex items-center gap-1">
            <div className="flex-1 min-w-0">
              <SimpleDropdown
                value={item.staffValue}
                placeholder="Select Staff"
                options={staffOptions}
                searchable
                onChange={v => onChange({ staffValue: v })}
                onRefresh={onRefreshStaff}
                refreshing={staffRefreshing}
              />
            </div>
            {item.staffValue && (
              <button type="button" onClick={() => onChange({ staffValue: '' })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="md:col-span-3">
          <Label>Narration</Label>
          <textarea
            value={item.description}
            onChange={e => onChange({ description: e.target.value })}
            rows={1}
            placeholder="Enter narration for this entry…"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-slate-400"
          />
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
const today     = todayISO()
const currentFY = getCurrentFY()

export default function VoucherEntryPage() {
  const qc = useQueryClient()
  const { selectedFY, setFY } = useFYStore()
  const fyList = getFYList(4)   // current + 4 previous years

  const [form, setForm] = useState({
    vouchertype: '',
    voucherdate: selectedFY.startYear === currentFY.startYear ? today : selectedFY.fromDate,
    description: '',
  })

  // Holds the FY the user wants to switch to — triggers confirmation modal when data exists
  const [pendingFY, setPendingFY] = useState<FinancialYear | null>(null)
  const [debitInput, setDebitInput]   = useState<LineItem>({ ledger: null, amount: '', ...emptyDetail })
  const [creditInput, setCreditInput] = useState<LineItem>({ ledger: null, amount: '', ...emptyDetail })
  const [debits, setDebits]   = useState<LineItem[]>([])
  const [credits, setCredits] = useState<LineItem[]>([])

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: ledgersRes, refetch: refetchLedgers, isFetching: ledgersFetching } = useQuery({
    queryKey: ['ledger-names'],
    queryFn: () => accountingService.getLedgerName(),
  })
  const ledgerGroupOf = useLedgerGroupOf()
  const { data: voucherTypesRes } = useQuery({
    queryKey: ['voucher-types'],
    queryFn: () => accountingService.getVoucherTypes({}),
  })
  const { data: busesRes, refetch: refetchBuses, isFetching: busesFetching } = useQuery({
    queryKey: ['buses'],
    queryFn: () => mastersService.getBuses(),
  })
  const { data: employeesRes, refetch: refetchEmployees, isFetching: employeesFetching } = useQuery({
    queryKey: ['employees-voucher'],
    queryFn: () => accountingService.getEmployeesDropdown(),
  })
  // Same query key the approvals page uses for pending vouchers — submitting a
  // new voucher here invalidates it, so this list refreshes right after save.
  const { data: recentVouchersRes, refetch: refetchRecentVouchers, isFetching: recentVouchersFetching } = useQuery({
    queryKey: ['voucher-pending'],
    queryFn: () => accountingService.getVoucherEntries(),
  })

  // ── Derived data ──────────────────────────────────────────────────────────
  const ledgerList: Ledger[] = ledgersRes?.data ?? []
  const voucherTypeList: any[] = voucherTypesRes?.data ?? []
  const busList = (busesRes?.data ?? []).map((b: any) => ({ label: b.bus_no, value: b.bus_no }))
  const recentVouchers: any[] = (recentVouchersRes?.data ?? []).slice(0, 5)
  const allStaff = (employeesRes?.data ?? []).flat().map((s: any) => ({
    id: s.staff_id,
    type: s.type as string,
    name: (s.fullName || s.helper_name || s.driver_name || '—') as string,
  }))
  const staffOptions = allStaff.map((s: { id: any; type: string; name: string }) => ({
    label: `${s.name} (${s.type})`,
    value: `${s.id}|${s.type}|${s.name}`,
  }))

  // ── Balance calculations ──────────────────────────────────────────────────
  const totalDr = debits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const totalCr = credits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
  const pendingDr    = parseFloat(debitInput.amount)  || 0
  const pendingCr    = parseFloat(creditInput.amount) || 0
  const effectiveDr  = totalDr + pendingDr
  const effectiveCr  = totalCr + pendingCr
  const effectiveDiff = effectiveDr - effectiveCr
  const effectiveBalanced = effectiveDr > 0 && Math.abs(effectiveDiff) < 0.001
  const pendingDrValid = !debitInput.amount  || (!!debitInput.ledger  && !!debitInput.amount)
  const pendingCrValid = !creditInput.amount || (!!creditInput.ledger && !!creditInput.amount)
  const canSave = effectiveBalanced && pendingDrValid && pendingCrValid
  const isWithinCurrentFY = form.voucherdate >= selectedFY.fromDate && form.voucherdate <= selectedFY.toDate

  // Ledgers used on the credit side (including the pending credit input) — blocked from debit dropdown
  const creditLockedIds = new Set<number>([
    ...credits.map(r => r.ledger?.id).filter(Boolean) as number[],
    ...(creditInput.ledger ? [creditInput.ledger.id] : []),
  ])
  // Ledgers used on the debit side (including the pending debit input) — blocked from credit dropdown
  const debitLockedIds = new Set<number>([
    ...debits.map(r => r.ledger?.id).filter(Boolean) as number[],
    ...(debitInput.ledger ? [debitInput.ledger.id] : []),
  ])
  const debitLedgers  = ledgerList.filter(l => !creditLockedIds.has(l.id))
  const creditLedgers = ledgerList.filter(l => !debitLockedIds.has(l.id))

  // Preview includes pending input rows when ledger is selected
  const previewDebits  = [...debits,  ...(debitInput.ledger  && debitInput.amount  ? [debitInput]  : [])]
  const previewCredits = [...credits, ...(creditInput.ledger && creditInput.amount ? [creditInput] : [])]
  const showPreview = previewDebits.length > 0 || previewCredits.length > 0

  // Tracks whether each side's current input value was auto-filled (safe to
  // overwrite on the next keystroke) vs manually typed (must not overwrite).
  const creditAutoFilled = useRef(false)
  const debitAutoFilled  = useRef(false)

  // ── Amount auto-fill ──────────────────────────────────────────────────────
  // Overwrites the other side only when it is empty OR was auto-filled.
  // Once the user types in a side manually that side is locked until cleared.
  const handleDebitAmountChange = (val: string) => {
    debitAutoFilled.current = false
    setDebitInput(p => ({ ...p, amount: val }))
    if (!creditInput.amount || creditAutoFilled.current) {
      const numVal = parseFloat(val) || 0
      if (numVal > 0) {
        const needed = numVal + totalDr - totalCr
        setCreditInput(p => ({ ...p, amount: needed > 0 ? String(needed) : '' }))
        creditAutoFilled.current = true
      } else {
        setCreditInput(p => ({ ...p, amount: '' }))
        creditAutoFilled.current = false
      }
    }
  }

  const handleCreditAmountChange = (val: string) => {
    creditAutoFilled.current = false
    setCreditInput(p => ({ ...p, amount: val }))
    if (!debitInput.amount || debitAutoFilled.current) {
      const numVal = parseFloat(val) || 0
      if (numVal > 0) {
        const needed = numVal + totalCr - totalDr
        setDebitInput(p => ({ ...p, amount: needed > 0 ? String(needed) : '' }))
        debitAutoFilled.current = true
      } else {
        setDebitInput(p => ({ ...p, amount: '' }))
        debitAutoFilled.current = false
      }
    }
  }

  // ── Add row handlers ──────────────────────────────────────────────────────
  const addDebit = () => {
    if (!debitInput.ledger || !debitInput.amount) return
    const newDebits = [...debits, debitInput]
    setDebits(newDebits)
    debitAutoFilled.current = false
    const newDrTotal = newDebits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
    const pendingCrAmt   = parseFloat(creditInput.amount) || 0
    const effectiveCr    = totalCr + pendingCrAmt
    const debitStillNeeded = effectiveCr - newDrTotal
    if (debitStillNeeded > 0) {
      // Credit side exceeds debit — prefill the next debit input with the gap
      setDebitInput({ ledger: null, amount: String(debitStillNeeded), ...emptyDetail })
      debitAutoFilled.current = true
    } else {
      // Debit meets or exceeds credit — clear debit, prefill credit with what it still owes
      setDebitInput({ ledger: null, amount: '', ...emptyDetail })
      const creditNeeded = newDrTotal - totalCr
      if (creditNeeded > 0) {
        setCreditInput(p => ({ ...p, amount: String(creditNeeded) }))
        creditAutoFilled.current = true
      } else {
        setCreditInput(p => ({ ...p, amount: '' }))
        creditAutoFilled.current = false
      }
    }
  }

  const addCredit = () => {
    if (!creditInput.ledger || !creditInput.amount) return
    const newCredits = [...credits, creditInput]
    setCredits(newCredits)
    creditAutoFilled.current = false
    const newCrTotal = newCredits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
    const pendingDrAmt    = parseFloat(debitInput.amount) || 0
    const effectiveDr     = totalDr + pendingDrAmt
    const creditStillNeeded = effectiveDr - newCrTotal
    if (creditStillNeeded > 0) {
      // Debit side exceeds credit — prefill the next credit input with the gap
      setCreditInput({ ledger: null, amount: String(creditStillNeeded), ...emptyDetail })
      creditAutoFilled.current = true
    } else {
      // Credit meets or exceeds debit — clear credit, prefill debit with what it still owes
      setCreditInput({ ledger: null, amount: '', ...emptyDetail })
      const debitNeeded = newCrTotal - totalDr
      if (debitNeeded > 0) {
        setDebitInput(p => ({ ...p, amount: String(debitNeeded) }))
        debitAutoFilled.current = true
      } else {
        setDebitInput(p => ({ ...p, amount: '' }))
        debitAutoFilled.current = false
      }
    }
  }

  // ── Per-ledger detail update handlers ─────────────────────────────────────
  const updateDebitDetail = (i: number, updates: Partial<LineItem>) =>
    setDebits(prev => prev.map((item, idx) => idx === i ? { ...item, ...updates } : item))

  const updateCreditDetail = (i: number, updates: Partial<LineItem>) =>
    setCredits(prev => prev.map((item, idx) => idx === i ? { ...item, ...updates } : item))

  // ── Remove / amount-edit handlers ─────────────────────────────────────────
  // Changing a committed row's amount (or removing it) changes its side's
  // total, so whichever side now falls short of the other must have the
  // shortfall auto-filled into its own pending input to stay balanced.
  const rebalancePending = (drTotal: number, crTotal: number) => {
    const diff = drTotal - crTotal
    if (diff > 0) {
      setCreditInput(p => ({ ...p, amount: String(diff) }))
      creditAutoFilled.current = true
      setDebitInput(p => ({ ...p, amount: '' }))
      debitAutoFilled.current = false
    } else if (diff < 0) {
      setDebitInput(p => ({ ...p, amount: String(-diff) }))
      debitAutoFilled.current = true
      setCreditInput(p => ({ ...p, amount: '' }))
      creditAutoFilled.current = false
    } else {
      setDebitInput(p => ({ ...p, amount: '' }))
      debitAutoFilled.current = false
      setCreditInput(p => ({ ...p, amount: '' }))
      creditAutoFilled.current = false
    }
  }

  const removeDebit = (i: number) => {
    const newDebits = debits.filter((_, idx) => idx !== i)
    setDebits(newDebits)
    const newDrTotal = newDebits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
    rebalancePending(newDrTotal, totalCr)
  }

  const removeCredit = (i: number) => {
    const newCredits = credits.filter((_, idx) => idx !== i)
    setCredits(newCredits)
    const newCrTotal = newCredits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)
    rebalancePending(totalDr, newCrTotal)
  }

  const editDebitAmount = (i: number, amount: string) => {
    updateDebitDetail(i, { amount })
    const newDrTotal = debits.reduce((s, r, idx) => s + (parseFloat(idx === i ? amount : r.amount) || 0), 0)
    rebalancePending(newDrTotal, totalCr)
  }

  const editCreditAmount = (i: number, amount: string) => {
    updateCreditDetail(i, { amount })
    const newCrTotal = credits.reduce((s, r, idx) => s + (parseFloat(idx === i ? amount : r.amount) || 0), 0)
    rebalancePending(totalDr, newCrTotal)
  }

  const clearDetail = (side: 'debit' | 'credit', i: number | 'pending') => {
    if (side === 'debit') {
      if (i === 'pending') setDebitInput(p => ({ ...p, ...emptyDetail }))
      else setDebits(prev => prev.map((item, idx) => idx === i ? { ...item, ...emptyDetail } : item))
    } else {
      if (i === 'pending') setCreditInput(p => ({ ...p, ...emptyDetail }))
      else setCredits(prev => prev.map((item, idx) => idx === i ? { ...item, ...emptyDetail } : item))
    }
  }

  const applyDetailToAll = (source: LineItem) => {
    const detail = { description: source.description, valueDate: source.valueDate, vehicleNo: source.vehicleNo, staffValue: source.staffValue }
    setDebits(prev => prev.map(item => ({ ...item, ...detail })))
    setCredits(prev => prev.map(item => ({ ...item, ...detail })))
    setDebitInput(p => ({ ...p, ...detail }))
    setCreditInput(p => ({ ...p, ...detail }))
  }

  const clearAllDetails = () => {
    setDebits(prev => prev.map(item => ({ ...item, ...emptyDetail })))
    setCredits(prev => prev.map(item => ({ ...item, ...emptyDetail })))
    setDebitInput(p => ({ ...p, ...emptyDetail }))
    setCreditInput(p => ({ ...p, ...emptyDetail }))
  }

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetForm = (dateOverride?: string) => {
    creditAutoFilled.current = false
    debitAutoFilled.current  = false
    setForm({ vouchertype: '', voucherdate: dateOverride ?? today, description: '' })
    setDebitInput({ ledger: null, amount: '', ...emptyDetail })
    setCreditInput({ ledger: null, amount: '', ...emptyDetail })
    setDebits([])
    setCredits([])
  }

  // ── FY change ─────────────────────────────────────────────────────────────
  const hasData = debits.length > 0 || credits.length > 0
    || !!debitInput.amount || !!creditInput.amount
    || form.description.trim().length > 0

  const applyFYChange = (fy: FinancialYear) => {
    setFY(fy)
    // Default date: today for current FY, start of FY for historical
    const newDate = fy.startYear === currentFY.startYear ? today : fy.fromDate
    resetForm(newDate)
    setPendingFY(null)
  }

  const handleFYChange = (fy: FinancialYear) => {
    if (fy.startYear === selectedFY.startYear) return
    if (hasData) { setPendingFY(fy); return }
    applyFYChange(fy)
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const { mutate: postVoucher, isPending } = useMutation({
    mutationFn: () => {
      const selectedType = voucherTypeList.find(v => v.voucher_type === form.vouchertype)
        ?? { voucher_type: form.vouchertype, id: null }

      const allDebits  = [...debits,  ...(debitInput.ledger  && debitInput.amount  ? [debitInput]  : [])]
      const allCredits = [...credits, ...(creditInput.ledger && creditInput.amount ? [creditInput] : [])]
      const drTotal = allDebits.reduce((s, r)  => s + (parseFloat(r.amount) || 0), 0)
      const crTotal = allCredits.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0)

      // For mainvoucher_t: use first ledger that has details, else empty
      const firstWithStaff = [...allDebits, ...allCredits].find(e => e.staffValue)
      const primaryStaff = parseStaff(firstWithStaff?.staffValue ?? '')
      const firstWithVehicle = [...allDebits, ...allCredits].find(e => e.vehicleNo)
      const firstWithDate = [...allDebits, ...allCredits].find(e => e.valueDate)

      const payload = {
        expensedetails: {
          vouchertype: selectedType,
          voucher_type_id: selectedType.id,
          voucherdate: form.voucherdate,
          description: form.description,
          valueDate: firstWithDate?.valueDate ?? '',
          vehicleNo: firstWithVehicle?.vehicleNo ?? '',
          name: primaryStaff?.name ?? '',
          staff_type: primaryStaff?.type ?? '',
          staff_type_id: String(primaryStaff?.id ?? ''),
        },
        patientsTstdts: allDebits.filter(d => d.ledger).map(d => {
          const staff = parseStaff(d.staffValue)
          return {
            d_test_name: d.ledger,
            d_test_amount: parseFloat(d.amount) || 0,
            temple_name: d.ledger!.temple_name,
            debitaccount: 'Debit Account',
            description: d.description,
            valueDate: d.valueDate,
            vehicleNo: d.vehicleNo,
            name: staff?.name ?? '',
            staff_type: staff?.type ?? '',
            staff_type_id: String(staff?.id ?? ''),
          }
        }),
        creditaddrowdts: allCredits.filter(c => c.ledger).map(c => {
          const staff = parseStaff(c.staffValue)
          return {
            creditledger: c.ledger,
            creditamount: parseFloat(c.amount) || 0,
            temple_name: c.ledger!.temple_name,
            creditaccount: 'Credit Account',
            description: c.description,
            valueDate: c.valueDate,
            vehicleNo: c.vehicleNo,
            name: staff?.name ?? '',
            staff_type: staff?.type ?? '',
            staff_type_id: String(staff?.id ?? ''),
          }
        }),
        creditanddebitamount: drTotal + crTotal,
        user_id: localStorage.getItem('user_id'),
        named: localStorage.getItem('usr_nm'),
      }
      return accountingService.submitVoucher(payload)
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Voucher saved successfully!')
        qc.invalidateQueries({ queryKey: ['voucher-pending'] })
        resetForm()
      } else {
        toast.error(res.message ?? 'Failed to save voucher')
      }
    },
    onError: () => toast.error('Server error'),
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Accountant Data" subtitle="Voucher entry, approvals and financial reports" />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-purple-500 to-pink-500">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-500" /> Voucher Entry
          </h2>
          <button
            type="button" onClick={() => resetForm()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors"
          >
            <X className="w-4 h-4" /> Clear Entire Voucher
          </button>
        </div>

        {/* Financial Year selector */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-600 flex-shrink-0">Financial Year</span>
          <div className="flex flex-wrap gap-2">
            {fyList.map(fy => {
              const isSel     = fy.startYear === selectedFY.startYear
              const isCurrent = fy.startYear === currentFY.startYear
              return (
                <button
                  key={fy.startYear}
                  type="button"
                  onClick={() => handleFYChange(fy)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                    isSel
                      ? isCurrent
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-orange-400 text-white border-orange-400'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                  }`}
                >
                  {fy.shortLabel}
                  {isCurrent && <span className="ml-1 opacity-75 text-[9px]">Current</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Voucher Type + Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label>Choose Voucher Type <span className="text-red-500">*</span></Label>
            <SimpleDropdown
              value={form.vouchertype}
              placeholder="Select Voucher Type"
              options={voucherTypeList.map(v => ({ label: v.voucher_type, value: v.voucher_type }))}
              onChange={v => setForm(f => ({ ...f, vouchertype: v }))}
            />
          </div>
          <div>
            <Label>Voucher Date <span className="text-red-500">*</span></Label>
            <div className="relative">
              <Input
                type="date"
                min={selectedFY.fromDate}
                max={selectedFY.startYear === currentFY.startYear ? today : selectedFY.toDate}
                value={form.voucherdate}
                onChange={e => setForm(f => ({ ...f, voucherdate: e.target.value }))}
                onClick={e => (e.target as HTMLInputElement).showPicker?.()}
                className="peer"
              />
              {/* FY badge — appears only while the date input is focused */}
              <span className={`
                absolute -top-6 right-0 text-[10px] font-bold px-2 py-0.5 rounded-full
                opacity-0 peer-focus:opacity-100 transition-opacity pointer-events-none
                ${isWithinCurrentFY ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}
              `}>
                {selectedFY.label} · {selectedFY.fromDate.slice(5, 7)}/{selectedFY.fromDate.slice(0, 4)} – {selectedFY.toDate.slice(5, 7)}/{selectedFY.toDate.slice(0, 4)}
              </span>
            </div>
          </div>
        </div>

        {/* Debit / Credit panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">

          {/* Debit panel */}
          <div className="rounded-xl border-2 border-red-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-200">
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-bold text-sm tracking-wide">Debit Account</span>
                {debits.length > 0 && (
                  <span className="text-[11px] font-bold text-red-500 bg-white border border-red-200 px-2 py-0.5 rounded-full">
                    {debits.length} {debits.length === 1 ? 'entry' : 'entries'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {effectiveCr > effectiveDr && (
                  <span className="text-[11px] font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                    Need ₹{(effectiveCr - effectiveDr).toLocaleString('en-IN')} more
                  </span>
                )}
                <span className={`font-bold text-sm tabular-nums ${pendingDr > 0 ? 'text-red-400' : 'text-red-600'}`}>
                  ₹{effectiveDr.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1 min-w-0">
                  <Label>Choose Ledger Name <span className="text-red-500">*</span></Label>
                  <LedgerDropdown value={debitInput.ledger} ledgers={debitLedgers}
                    onChange={l => setDebitInput(p => ({ ...p, ledger: l }))}
                    onRefresh={() => refetchLedgers()} refreshing={ledgersFetching} />
                </div>
                <div className="w-32">
                  <Label>Amount <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="0.00" value={debitInput.amount}
                    onChange={e => handleDebitAmountChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addDebit()} />
                </div>
                <div className="mt-5">
                  <button type="button" onClick={addDebit}
                    disabled={!debitInput.ledger || !debitInput.amount}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>
              {debitInput.amount && (
                <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-1 ${
                  effectiveBalanced ? 'text-green-600' : effectiveDiff > 0 ? 'text-orange-500' : 'text-red-500'
                }`}>
                  <span className="text-base leading-none">{effectiveBalanced ? '✓' : '⚠'}</span>
                  {effectiveBalanced
                    ? `Balanced — ₹${effectiveDr.toLocaleString('en-IN')}`
                    : effectiveDiff > 0
                    ? `Debit exceeds credit by ₹${effectiveDiff.toLocaleString('en-IN')}`
                    : `Need ₹${Math.abs(effectiveDiff).toLocaleString('en-IN')} more on debit`}
                </div>
              )}
              <LedgerTable rows={debits} side="debit"
                onRemove={removeDebit}
                onEditAmount={editDebitAmount} />
            </div>
          </div>

          {/* Credit panel */}
          <div className="rounded-xl border-2 border-emerald-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 border-b border-emerald-200">
              <div className="flex items-center gap-2">
                <span className="text-emerald-600 font-bold text-sm tracking-wide">Credit Account</span>
                {credits.length > 0 && (
                  <span className="text-[11px] font-bold text-emerald-600 bg-white border border-emerald-200 px-2 py-0.5 rounded-full">
                    {credits.length} {credits.length === 1 ? 'entry' : 'entries'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {effectiveDr > effectiveCr && (
                  <span className="text-[11px] font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded">
                    Need ₹{(effectiveDr - effectiveCr).toLocaleString('en-IN')} more
                  </span>
                )}
                <span className={`font-bold text-sm tabular-nums ${pendingCr > 0 ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  ₹{effectiveCr.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex gap-2 items-end">
                <div className="flex-1 min-w-0">
                  <Label>Choose Ledger Name <span className="text-red-500">*</span></Label>
                  <LedgerDropdown value={creditInput.ledger} ledgers={creditLedgers}
                    onChange={l => setCreditInput(p => ({ ...p, ledger: l }))}
                    onRefresh={() => refetchLedgers()} refreshing={ledgersFetching} />
                </div>
                <div className="w-32">
                  <Label>Amount <span className="text-red-500">*</span></Label>
                  <Input type="number" placeholder="0.00" value={creditInput.amount}
                    onChange={e => handleCreditAmountChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCredit()} />
                </div>
                <div className="mt-5">
                  <button type="button" onClick={addCredit}
                    disabled={!creditInput.ledger || !creditInput.amount}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>
              {creditInput.amount && (
                <div className={`flex items-center gap-1.5 text-[11px] font-semibold px-1 ${
                  effectiveBalanced ? 'text-green-600' : effectiveDiff < 0 ? 'text-orange-500' : 'text-red-500'
                }`}>
                  <span className="text-base leading-none">{effectiveBalanced ? '✓' : '⚠'}</span>
                  {effectiveBalanced
                    ? `Balanced — ₹${effectiveCr.toLocaleString('en-IN')}`
                    : effectiveDiff < 0
                    ? `Credit exceeds debit by ₹${Math.abs(effectiveDiff).toLocaleString('en-IN')}`
                    : `Need ₹${effectiveDiff.toLocaleString('en-IN')} more on credit`}
                </div>
              )}
              <LedgerTable rows={credits} side="credit"
                offset={debits.length + (debitInput.ledger && debitInput.amount ? 1 : 0)}
                onRemove={removeCredit}
                onEditAmount={editCreditAmount} />
            </div>
          </div>

        </div>

        {/* Global balance indicator */}
        {effectiveDr > 0 && !effectiveBalanced && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 font-medium flex items-center justify-between">
            <span>⚠ Debit (₹{effectiveDr.toLocaleString('en-IN')}) ≠ Credit (₹{effectiveCr.toLocaleString('en-IN')})</span>
            <span className="font-bold">Diff: ₹{Math.abs(effectiveDiff).toLocaleString('en-IN')}</span>
          </div>
        )}
        {effectiveBalanced && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-bold flex items-center justify-between">
            <span>✓ Balanced</span>
            <span>₹{effectiveDr.toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Transaction Details — one card per ledger */}
        <div className="border-t border-slate-200 pt-5 mt-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-bold text-slate-800 pb-1 border-b-2 border-blue-500 inline-block">
              Transaction Details
            </h3>
            {(previewDebits.length > 0 || previewCredits.length > 0) && (
              <button
                type="button" onClick={clearAllDetails}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear All Details
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-4 mt-1">
            Fill value date, vehicle, staff and narration for each ledger entry.
          </p>

          {(previewDebits.length === 0 && previewCredits.length === 0) ? (
            <div className="py-6 text-center text-sm text-slate-400 italic border border-dashed border-slate-200 rounded-xl">
              Add debit and credit ledger entries above to fill transaction details.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Committed debit entries */}
              {debits.map((item, i) => (
                <LedgerDetailCard
                  key={`dr-${i}`}
                  index={i + 1}
                  item={item}
                  side="debit"
                  busList={busList}
                  staffOptions={staffOptions}
                  onRefreshVehicles={() => refetchBuses()} vehiclesRefreshing={busesFetching}
                  onRefreshStaff={() => refetchEmployees()} staffRefreshing={employeesFetching}
                  onChange={updates => updateDebitDetail(i, updates)}
                  onClear={() => clearDetail('debit', i)}
                  onApplyToAll={() => applyDetailToAll(item)}
                />
              ))}
              {/* Pending debit input (shown if ledger selected) */}
              {debitInput.ledger && debitInput.amount && (
                <LedgerDetailCard
                  key="dr-pending"
                  index={debits.length + 1}
                  item={debitInput}
                  side="debit"
                  isPending
                  busList={busList}
                  staffOptions={staffOptions}
                  onRefreshVehicles={() => refetchBuses()} vehiclesRefreshing={busesFetching}
                  onRefreshStaff={() => refetchEmployees()} staffRefreshing={employeesFetching}
                  onChange={updates => setDebitInput(p => ({ ...p, ...updates }))}
                  onClear={() => clearDetail('debit', 'pending')}
                  onApplyToAll={() => applyDetailToAll(debitInput)}
                />
              )}
              {/* Committed credit entries */}
              {credits.map((item, i) => (
                <LedgerDetailCard
                  key={`cr-${i}`}
                  index={debits.length + (debitInput.ledger && debitInput.amount ? 1 : 0) + i + 1}
                  item={item}
                  side="credit"
                  busList={busList}
                  staffOptions={staffOptions}
                  onRefreshVehicles={() => refetchBuses()} vehiclesRefreshing={busesFetching}
                  onRefreshStaff={() => refetchEmployees()} staffRefreshing={employeesFetching}
                  onChange={updates => updateCreditDetail(i, updates)}
                  onClear={() => clearDetail('credit', i)}
                  onApplyToAll={() => applyDetailToAll(item)}
                />
              ))}
              {/* Pending credit input (shown if ledger selected) */}
              {creditInput.ledger && creditInput.amount && (
                <LedgerDetailCard
                  key="cr-pending"
                  index={debits.length + (debitInput.ledger && debitInput.amount ? 1 : 0) + credits.length + 1}
                  item={creditInput}
                  side="credit"
                  isPending
                  busList={busList}
                  staffOptions={staffOptions}
                  onRefreshVehicles={() => refetchBuses()} vehiclesRefreshing={busesFetching}
                  onRefreshStaff={() => refetchEmployees()} staffRefreshing={employeesFetching}
                  onChange={updates => setCreditInput(p => ({ ...p, ...updates }))}
                  onClear={() => clearDetail('credit', 'pending')}
                  onApplyToAll={() => applyDetailToAll(creditInput)}
                />
              )}
            </div>
          )}

          {/* Voucher-level narration */}
          <div className="mt-4">
            <Label>Voucher Narration <span className="text-red-500">*</span></Label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Enter overall voucher description / narration"
              rows={2}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-500/30 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Save */}
        <div className="mt-6 flex flex-col items-end gap-3">
          {(!form.vouchertype || !form.description.trim() || !canSave) && (
            <div className="flex flex-wrap gap-2 justify-end">
              {!form.vouchertype && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-500">
                  Voucher type required
                </span>
              )}
              {!form.description.trim() && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-500">
                  Voucher narration required
                </span>
              )}
              {!effectiveBalanced && effectiveDr === 0 && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-500">
                  Enter debit &amp; credit amounts
                </span>
              )}
              {!effectiveBalanced && effectiveDr > 0 && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-500">
                  Debit ≠ Credit (diff ₹{Math.abs(effectiveDiff).toLocaleString('en-IN')})
                </span>
              )}
              {effectiveBalanced && (!pendingDrValid || !pendingCrValid) && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-500">
                  Select ledger for entered amount
                </span>
              )}
            </div>
          )}
          <Button
            variant="purple"
            onClick={() => postVoucher()}
            disabled={isPending || !canSave || !form.vouchertype || !form.description.trim()}
          >
            <Save className="w-4 h-4" />
            {isPending ? 'Saving…' : 'Save Voucher'}
          </Button>
        </div>

      </GlassCard>

      {/* ── Recent Vouchers ───────────────────────────────────────────────── */}
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-indigo-500">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" /> Recent Vouchers
          </h2>
          <button
            type="button" onClick={() => refetchRecentVouchers()} disabled={recentVouchersFetching}
            title="Refresh"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${recentVouchersFetching ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>

        {recentVouchers.length === 0 ? (
          <div className="py-6 text-center text-sm text-slate-400 italic border border-dashed border-slate-200 rounded-xl">
            No vouchers entered yet.
          </div>
        ) : (
          <DualScrollTable tableClassName="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead>
                <tr className="sticky top-0 z-10 bg-white text-xs font-semibold text-slate-400 border-b border-slate-100">
                  <th className="text-left pb-2">Rf. No.</th>
                  <th className="text-left pb-2">Type</th>
                  <th className="text-left pb-2">Date</th>
                  <th className="text-left pb-2">Dr. Ledger</th>
                  <th className="text-left pb-2">Cr. Ledger</th>
                  <th className="text-right pb-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentVouchers.map((v: any) => (
                  <tr key={v.c_number} className="border-b last:border-0 border-slate-50">
                    <td className="py-2 pr-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 whitespace-nowrap">
                        {v.c_number}
                      </span>
                    </td>
                    <td className="py-2 pr-2 font-medium text-slate-700 whitespace-nowrap">{v.vouchertype}</td>
                    <td className="py-2 pr-2 whitespace-nowrap text-slate-600">{v.voucherdate ? formatDate(v.voucherdate) : '—'}</td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-col gap-0.5">
                        {splitLedgerNames(v.debit_ledger_name).map((l, i) => (
                          <span key={i} className="text-xs font-medium text-red-700 whitespace-nowrap">{l}<LedgerGroupTag group={ledgerGroupOf({ name: l })} /></span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-col gap-0.5">
                        {splitLedgerNames(v.credit_ledger_name).map((l, i) => (
                          <span key={i} className="text-xs font-medium text-emerald-700 whitespace-nowrap">{l}<LedgerGroupTag group={ledgerGroupOf({ name: l })} /></span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 text-right font-bold text-slate-800 whitespace-nowrap">
                      {formatCurrency(Number(v.debit_total ?? v.creditanddebitamount ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DualScrollTable>
        )}
      </GlassCard>

      {/* ── FY Change Confirmation Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {pendingFY && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl max-w-sm w-full shadow-2xl mx-4 overflow-hidden">
              <div className="bg-gradient-to-r from-orange-400 to-orange-500 px-6 py-4">
                <h3 className="text-white font-bold text-lg">Change Financial Year?</h3>
                <p className="text-orange-100 text-sm mt-0.5">Switching to {pendingFY.label}</p>
              </div>
              <div className="px-6 py-5">
                <p className="text-slate-600 text-sm">
                  You have unsaved data in the current voucher. Changing the financial year will
                  <span className="font-semibold text-red-600"> clear all entered data</span>.
                </p>
                <p className="text-slate-400 text-xs mt-2">
                  New date range: {pendingFY.fromDate} → {pendingFY.toDate}
                </p>
              </div>
              <div className="px-6 pb-5 flex items-center justify-end gap-3">
                <button onClick={() => setPendingFY(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                  Cancel
                </button>
                <button onClick={() => applyFYChange(pendingFY)}
                  className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors">
                  Yes, Clear &amp; Switch
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
