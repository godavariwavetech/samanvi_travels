import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'
import { ArrowLeft, RefreshCw, Send, Plus, Trash2, X, FileSpreadsheet, FileText, History, Search, ChevronDown, Eye } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader, FYSelector } from '@/components/shared'
import ActivityHistory from '@/components/shared/ActivityHistory'
import { accountingService } from '@/services/accounting.service'
import { mastersService } from '@/services/masters.service'
import { getCurrentFY } from '@/lib/fy'
import { useFYStore } from '@/store/fy.store'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(d: any): string {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '-'
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
}

function fmtAmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function resolveDateStr(e: any): string {
  const map: Record<string, any> = {
    expensive_details: e.trip_date,
    mainvoucher_subt: e.voucherdate,
    fuelentry_subt: e.voucherdate,
    laundrybill_subt: e.i_ts,
  }
  return map[e.source_table] || e.i_ts || e.voucherdate || e.trip_date || ''
}

// ─── InlineRefresh — small icon inside a dropdown trigger that re-hits the
// source API without stealing width from the trigger (same pattern as
// VoucherEntryPage's ledger/vehicle/staff dropdowns) ───────────────────────
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

// ─── SimpleDropdown — portal-based searchable dropdown with an optional
// inline reload button, for plain string-value option lists ────────────────
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
      const panel = document.getElementById('payables-simple-portal-panel')
      if (panel?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      setOpen(false); setSearch('')
    }
    const onScroll = (e: Event) => {
      if (document.getElementById('payables-simple-portal-panel')?.contains(e.target as Node)) return
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
    <div id="payables-simple-portal-panel" style={{
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
        className="flex h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm shadow-sm transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
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

// ─── Modal primitives ─────────────────────────────────────────────────────────
function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
      <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
        <X className="w-5 h-5" />
      </button>
    </div>
  )
}

// Full settle/reverse timeline for one transaction row — payables_settled_by
// only ever tracks the single most recent voucher, so this is the only place
// to see every payment that was ever applied (and undone) against it.
interface PaymentHistoryEntry {
  id: number
  c_number: string
  payment: number
  balance_after: number
  action: 'settled' | 'reversed'
  created_by_name: string | null
  created_at: string
}

function PaymentHistoryModal({ row, data, loading, onClose }: {
  row: TxRow; data: PaymentHistoryEntry[]; loading: boolean; onClose: () => void
}) {
  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title={`Payment History — ${row.expensives}`} onClose={onClose} />
      <div className="p-6 space-y-4">
        <div className="text-xs text-slate-500">
          Original amount <span className="font-bold text-slate-700">₹{fmtAmt(row.amount)}</span>
          {' · '}Ref <span className="font-medium text-slate-700">{row.c_number}</span>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded-xl bg-slate-100 animate-pulse" />)}
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No payments have been recorded against this transaction yet.</p>
        ) : (
          <div className="space-y-2">
            {data.map(entry => (
              <div key={entry.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                entry.action === 'settled' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
              }`}>
                <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0 ${
                  entry.action === 'settled' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>
                  {entry.action === 'settled' ? 'Paid' : 'Reversed'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {entry.action === 'settled' ? 'Payment of' : 'Reversal of'} ₹{fmtAmt(entry.payment)}
                    <span className="font-normal text-slate-500"> via {entry.c_number}</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {fmt(entry.created_at)}{entry.created_by_name ? ` · by ${entry.created_by_name}` : ''}
                    {' · balance after: '}₹{fmtAmt(entry.balance_after)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ModalOverlay>
  )
}

function DebitCreditCards({ entries }: { entries: any[] }) {
  const debitEntries = entries.filter(e => e.amount_type === 'Debit Account' || e.account_type === 'Debit Account')
  const creditEntries = entries.filter(e => e.amount_type === 'Credit Account' || e.account_type === 'Credit Account')
  const debitTotal = debitEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
  const creditTotal = creditEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
  const getLedgerName = (e: any) => e.temple_name || e.expensives || 'Unknown'

  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="bg-blue-600 text-white px-3 py-2 rounded-t-lg flex justify-between items-center">
          <span className="font-bold text-sm">Debit Account</span>
          <span className="font-bold text-sm">₹{fmtAmt(debitTotal)}</span>
        </div>
        <div className="border border-t-0 border-slate-200 rounded-b-lg p-2 max-h-44 overflow-y-auto">
          {debitEntries.length === 0
            ? <p className="text-xs text-slate-400 text-center py-3">No debit entries</p>
            : debitEntries.map((e, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-700">{getLedgerName(e)}</span>
                <span className="text-sm text-slate-700 ml-2">₹{fmtAmt(Number(e.amount))}</span>
              </div>
            ))}
        </div>
      </div>
      <div>
        <div className="bg-emerald-600 text-white px-3 py-2 rounded-t-lg flex justify-between items-center">
          <span className="font-bold text-sm">Credit Account</span>
          <span className="font-bold text-sm">₹{fmtAmt(creditTotal)}</span>
        </div>
        <div className="border border-t-0 border-slate-200 rounded-b-lg p-2 max-h-44 overflow-y-auto">
          {creditEntries.length === 0
            ? <p className="text-xs text-slate-400 text-center py-3">No credit entries</p>
            : creditEntries.map((e, i) => (
              <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-700">{getLedgerName(e)}</span>
                <span className="text-sm text-slate-700 ml-2">₹{fmtAmt(Number(e.amount))}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function VoucherModal({ data, refNo, onClose }: { data: any; refNo: string; onClose: () => void }) {
  const primary = data?.primary_data || {}
  const entries = data?.all_entries || []
  const vDate = primary.parent_date || primary.voucherdate || primary.i_ts
  const vType = primary.parent_vouchertype || primary.vouchertype || 'Receipt'
  const desc = primary.parent_description || primary.description || 'Transaction'
  const valueDate = primary.parent_valueDate || primary.valueDate
  const vehicleNo = primary.parent_vehicleNo || primary.vehicleNo || primary.bus_no || ''
  const name = primary.parent_name || primary.name || ''
  return (
    <ModalOverlay onClose={onClose}>
      <ModalHeader title={refNo} onClose={onClose} />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Reference Number</Label><Input value={data?.c_number || refNo} readOnly className="bg-slate-50" /></div>
          <div><Label>Voucher Type</Label><Input value={vType} readOnly className="bg-slate-50" /></div>
          <div><Label>Voucher Date</Label><Input value={vDate ? new Date(vDate).toISOString().split('T')[0] : ''} readOnly className="bg-slate-50" /></div>
          <div><Label>Value Date</Label><Input value={valueDate ? new Date(valueDate).toISOString().split('T')[0] : ''} readOnly className="bg-slate-50" /></div>
          <div><Label>Vehicle No</Label><Input value={vehicleNo} readOnly className="bg-slate-50" /></div>
          <div><Label>Name</Label><Input value={name} readOnly className="bg-slate-50" /></div>
        </div>
        <div>
          <Label>Description</Label>
          <textarea className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm resize-none" rows={2} readOnly value={desc} />
        </div>
        <DebitCreditCards entries={entries} />
      </div>
    </ModalOverlay>
  )
}

function FuelModal({ data, refNo, onClose }: { data: any; refNo: string; onClose: () => void }) {
  const primary = data?.primary_data || {}
  const entries = data?.all_entries || []
  const fDate = primary.parent_date || primary.i_ts
  const vehicle = primary.parent_vehicle || primary.vehicleNo || primary.bus_no || ''
  const qty = primary.parent_quantity || primary.quantity || ''
  const price = primary.parent_price_per_liter || primary.price_per_liter || ''
  const driver1 = primary.parent_driver1 || primary.driver1 || primary.name || ''
  const driver2 = primary.parent_driver2 || primary.driver2 || ''
  const service = primary.parent_service || primary.service || ''
  const kmpl = primary.parent_kmpl || primary.kmpl || ''
  const totalBill = primary.parent_total_bill || primary.amount || ''
  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-blue-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
        <h3 className="font-bold text-lg">Fuel Entry Details — {refNo}</h3>
        <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {([['Date', fmt(fDate)], ['Vehicle', vehicle], ['Service', service], ['Driver 1', driver1], ['Driver 2', driver2], ['Quantity', qty ? `${qty} L` : ''], ['Price/L', price ? `₹${price}` : ''], ['Total Bill', totalBill ? `₹${fmtAmt(Number(totalBill))}` : ''], ['KMPL', String(kmpl)]] as [string, string][]).map(([label, value]) => (
              <div key={label}><span className="font-medium text-slate-500">{label}: </span><span className="text-slate-800">{value || 'N/A'}</span></div>
            ))}
          </div>
        </div>
        <DebitCreditCards entries={entries} />
      </div>
    </ModalOverlay>
  )
}

function LaundryModal({ data, refNo, onClose }: { data: any; refNo: string; onClose: () => void }) {
  const entries = data?.all_entries || []
  const primary = data?.primary_data || {}
  const debitRow = entries.find((r: any) => Number(r.white_qty) > 0 || Number(r.blanket_qty) > 0 || Number(r.pillow_qty) > 0 || Number(r.cover_qty) > 0 || Number(r.curtain_qty) > 0 || !!r.vehicleNo) || entries.find((r: any) => r.account_type === 'Debit Account') || {}
  const num = (v: any) => Number(v || 0)
  const vehicle = debitRow.vehicleNo || primary.parent_vehicleNo || '-'
  const totalAmount = num(primary.parent_total_amount || debitRow.total || primary.amount)
  const debitEntries = entries.filter((e: any) => e.account_type === 'Debit Account' || e.amount_type === 'Debit Account')
  const creditEntries = entries.filter((e: any) => e.account_type === 'Credit Account' || e.amount_type === 'Credit Account')
  const getLedgerName = (e: any) => e.temple_name || e.expensives || 'Unknown'
  return (
    <ModalOverlay onClose={onClose}>
      <div className="px-6 py-4 rounded-t-2xl flex items-center justify-between" style={{ background: 'linear-gradient(90deg,#7b5bf2,#5ac8fa)' }}>
        <h3 className="font-bold text-white text-lg">Laundry Bill Details — {refNo}</h3>
        <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="bg-sky-50 rounded-xl overflow-hidden">
          <div className="bg-sky-500 text-white px-4 py-2 text-sm font-bold">Vehicle Details</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-sky-100">{['Vehicle No', 'Blankets', 'Pillows', 'Whites', 'Covers', 'Curtains', 'Total'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-bold text-sky-700">{h}</th>)}</tr></thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2">{vehicle}</td>
                  <td className="px-3 py-2">{num(debitRow.blanket_qty)} (₹{num(debitRow.blanket_amount).toFixed(0)})</td>
                  <td className="px-3 py-2">{num(debitRow.pillow_qty)} (₹{num(debitRow.pillow_amount).toFixed(0)})</td>
                  <td className="px-3 py-2">{num(debitRow.white_qty)} (₹{num(debitRow.white_amount).toFixed(0)})</td>
                  <td className="px-3 py-2">{num(debitRow.cover_qty)} (₹{num(debitRow.cover_amount).toFixed(0)})</td>
                  <td className="px-3 py-2">{num(debitRow.curtain_qty)} (₹{num(debitRow.curtain_amount).toFixed(0)})</td>
                  <td className="px-3 py-2 font-bold">₹{totalAmount.toFixed(0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl overflow-hidden shadow-sm">
            <div className="flex justify-between items-center px-3 py-2 text-white text-sm font-bold" style={{ background: '#7b42ff' }}>
              <span>Debit Account</span><span>₹{fmtAmt(debitEntries.reduce((s: number, e: any) => s + Number(e.amount || 0), 0))}</span>
            </div>
            <div className="p-2 border border-t-0 border-slate-200">
              {debitEntries.length === 0 ? <p className="text-xs text-slate-400 text-center py-2">No debit entries</p>
                : debitEntries.map((e: any, i: number) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0 text-sm">
                    <span>{getLedgerName(e)}</span><span>₹{fmtAmt(Number(e.amount))}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="rounded-xl overflow-hidden shadow-sm">
            <div className="flex justify-between items-center px-3 py-2 text-white text-sm font-bold" style={{ background: '#00b26f' }}>
              <span>Credit Account</span><span>₹{fmtAmt(creditEntries.reduce((s: number, e: any) => s + Number(e.amount || 0), 0))}</span>
            </div>
            <div className="p-2 border border-t-0 border-slate-200">
              {creditEntries.length === 0 ? <p className="text-xs text-slate-400 text-center py-2">No credit entries</p>
                : creditEntries.map((e: any, i: number) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0 text-sm">
                    <span>{getLedgerName(e)}</span><span>₹{fmtAmt(Number(e.amount))}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface TxRow {
  id: number
  c_id: number
  c_number: string
  vouchertype: string
  amount_type: string
  account_type: string
  amount: number
  balance: number
  isedited: number
  ledger_id: number
  expensives: string
  trip_date?: string
  voucherdate?: string
  i_ts?: string
  vehicleNo?: string
  bus_no?: string
  description?: string
  source_table?: string
  opp_ledgers?: string
  valueDate?: string
  name?: string
  payablesremarks: string
  sameAsAmount: boolean
  temppayment: number
  tempbalance: number
  originalBalance: number
  selected: boolean
}

// `ledger` carries the full ledger-master row (child/staticname/mandal_name/etc.) —
// the backend's insert needs these group-hierarchy fields, not just id+name.
interface DebitEntry {
  ledger: any
  amount: number
}

interface CreditEntry {
  ledger: any
  amount: number
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]
const currentFY = getCurrentFY()

export default function PayablesViewPage() {
  const qc = useQueryClient()
  const userId = localStorage.getItem('user_id') ?? ''
  const selectedFY = useFYStore(s => s.selectedFY)
  const fyMin = selectedFY.fromDate
  const fyMax = selectedFY.startYear === currentFY.startYear ? today : selectedFY.toDate
  const isFromBalanceSheet = localStorage.getItem('bs_ledger_name') === 'balacesheeet'

  const [ledgerData] = useState(() => {
    try { return JSON.parse(localStorage.getItem('reportViewData') || 'null') } catch { return null }
  })

  const ledgerId: number = isFromBalanceSheet
    ? (ledgerData?.entries?.[0]?.id ?? null)
    : (ledgerData?.entries?.id ?? null)
  const ledgerName: string = isFromBalanceSheet
    ? (ledgerData?.entries?.[0]?.name ?? ledgerData?.entries?.[0]?.temple_name ?? '')
    : (ledgerData?.entries?.name ?? ledgerData?.entries?.temple_name ?? '')

  // Set when arriving via "Edit in Payables" from an existing voucher in
  // Voucher Approvals — pre-fills the form below with that voucher's own
  // field values instead of opening blank.
  const editVoucher: {
    c_number: string; voucherdate: string; valueDate: string; vehicleNo: string
    name: string; staff_type: string; staff_type_id: string; description: string
    creditEntries: { ledger_id: number; amount: number }[]
    entry_by?: string; i_ts?: string
  } | null = ledgerData?.editVoucher ?? null

  // Angular's date filter form is commented out — always start with empty dates (load all records)
  const [filter, setFilter] = useState({ fromdate: '', todate: '' })
  const [applied, setApplied] = useState({ fromdate: '', todate: '' })

  // Clamp any explicitly chosen dates into the newly selected financial year's
  // bounds — blank stays blank, since that means "no filter, show all".
  useEffect(() => {
    setFilter(f => ({
      fromdate: f.fromdate && f.fromdate < fyMin ? fyMin : f.fromdate && f.fromdate > fyMax ? fyMax : f.fromdate,
      todate:   f.todate   && f.todate   < fyMin ? fyMin : f.todate   && f.todate   > fyMax ? fyMax : f.todate,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fyMin, fyMax])
  const [rows, setRows] = useState<TxRow[]>([])
  const [creditEntries, setCreditEntries] = useState<CreditEntry[]>([])
  const [voucherForm, setVoucherForm] = useState(() => ({
    vouchertype: '' as any,
    voucher_type_id: '',
    voucherdate: editVoucher?.voucherdate || new Date().toISOString().split('T')[0],
    valueDate: editVoucher?.valueDate || '',
    vehicleNo: editVoucher?.vehicleNo || '',
    name: editVoucher?.name || '',
    staff_type: editVoucher?.staff_type || '',
    staff_type_id: editVoucher?.staff_type_id || '',
    description: editVoucher?.description || '',
  }))
  const [creditAddForm, setCreditAddForm] = useState({ ledger_id: '', amount: '' })

  // Clamp the voucher entry sub-form's dates into the newly selected financial year's bounds
  useEffect(() => {
    setVoucherForm(f => ({
      ...f,
      voucherdate: f.voucherdate < fyMin ? fyMin : f.voucherdate > fyMax ? fyMax : f.voucherdate,
      valueDate:   f.valueDate && f.valueDate < fyMin ? fyMin : f.valueDate && f.valueDate > fyMax ? fyMax : f.valueDate,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fyMin, fyMax])
  const [modal, setModal] = useState<{ open: boolean; data: any; sourceTable: string; refNo: string; loading: boolean }>({
    open: false, data: null, sourceTable: '', refNo: '', loading: false,
  })
  const [historyModal, setHistoryModal] = useState<{ open: boolean; row: TxRow | null; data: PaymentHistoryEntry[]; loading: boolean }>({
    open: false, row: null, data: [], loading: false,
  })

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: searchData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['payables-search', applied, ledgerId],
    queryFn: () => accountingService.getSearchData({
      fromdate: applied.fromdate,
      todate: applied.todate,
      ledger_id: ledgerId,
      ledger_name: ledgerName,
      user_id: userId,
    }),
    enabled: !!ledgerId,
  })

  const { data: expenseData, refetch: refetchExpenseLedgers, isFetching: expenseLedgersFetching } = useQuery({
    queryKey: ['expense-trip-ledger'],
    queryFn: () => accountingService.getExpenseTripLedger(),
  })

  const { data: voucherTypesData } = useQuery({
    queryKey: ['voucher-types-payables'],
    queryFn: () => accountingService.getVoucherTypes({
      role_type: localStorage.getItem('role_type'),
      district_id: localStorage.getItem('district_id'),
    }),
  })

  const { data: busData, refetch: refetchBuses, isFetching: busesFetching } = useQuery({
    queryKey: ['buses-payables'],
    queryFn: () => mastersService.getBuses(),
  })

  const { data: employeesData, refetch: refetchEmployees, isFetching: employeesFetching } = useQuery({
    queryKey: ['employees-dropdown-payables'],
    queryFn: () => accountingService.getEmployeesDropdown(),
  })

  // Original transaction rows this voucher settled — used to re-select them
  // and restore their payment/balance when editing from Voucher Approvals.
  const { data: settledRowsData } = useQuery({
    queryKey: ['payables-settled-rows', editVoucher?.c_number],
    queryFn: () => accountingService.getPayablesSettledRows({ c_number: editVoucher!.c_number }),
    enabled: !!editVoucher?.c_number,
  })
  const settledRows: any[] = useMemo(() => settledRowsData?.data ?? [], [settledRowsData])

  // Full edit history for this voucher — same audit trail Voucher Approvals/
  // Ledger Wise already show, so edits made here are traceable too.
  const { data: auditRes } = useQuery({
    queryKey: ['payables-voucher-audit', editVoucher?.c_number],
    queryFn: () => accountingService.getVoucherAudit(editVoucher!.c_number),
    enabled: !!editVoucher?.c_number,
  })
  const auditTrail: any[] = auditRes?.data ?? []
  const [editReason, setEditReason] = useState('')

  const expenseList: any[] = useMemo(() => expenseData?.data ?? [], [expenseData])
  // Exclude the ledger already being viewed/settled — it can't be its own opposite-side credit entry
  const creditLedgerOptions = useMemo(
    () => expenseList.filter((e: any) => Number(e.id) !== Number(ledgerId)),
    [expenseList, ledgerId]
  )

  // Pre-fill the Credit Account entries from the voucher being edited, once
  // the full ledger-master records (needed for resubmission) are available.
  const editCreditsApplied = useRef(false)
  useEffect(() => {
    if (!editVoucher || editCreditsApplied.current || expenseList.length === 0) return
    const restored: CreditEntry[] = editVoucher.creditEntries
      .map(c => {
        const ledger = expenseList.find((e: any) => Number(e.id) === Number(c.ledger_id))
        return ledger ? { ledger, amount: c.amount } : null
      })
      .filter((c): c is CreditEntry => c !== null)
    if (restored.length > 0) {
      setCreditEntries(restored)
      editCreditsApplied.current = true
    }
  }, [editVoucher, expenseList])

  // Derived debit entries based on selected rows and their CURRENT payment values
  const debitEntries = useMemo(() => {
    const map = new Map<number, DebitEntry>()
    rows.filter(r => r.selected && r.temppayment > 0).forEach(r => {
      const matchingExpense = expenseList.find((e: any) => Number(e.id) === Number(r.ledger_id))
      if (matchingExpense) {
        const key = Number(matchingExpense.id)
        const existing = map.get(key)
        if (existing) {
          existing.amount += r.temppayment
        } else {
          map.set(key, { ledger: matchingExpense, amount: r.temppayment })
        }
      }
    })
    return Array.from(map.values())
  }, [rows, expenseList])

  const voucherTypes: any[] = useMemo(() => {
    const all: any[] = voucherTypesData?.data ?? []
    return all.filter((v: any) => v.voucher_type?.toLowerCase() === 'payment')
  }, [voucherTypesData])

  // Payables vouchers are always "Payment" — auto-select it and lock the field
  useEffect(() => {
    if (voucherTypes.length === 0 || voucherForm.voucher_type_id) return
    setVoucherForm(f => ({ ...f, voucher_type_id: String(voucherTypes[0].id), vouchertype: voucherTypes[0] }))
  }, [voucherTypes, voucherForm.voucher_type_id])
  const busList: any[] = useMemo(() => busData?.data ?? [], [busData])
  const employeesList: any[] = useMemo(() => {
    const res = employeesData?.data
    if (!res) return []
    const employees = (res[0] || []).map((e: any) => ({ name: e.fullName, type: e.type, staff_id: e.staff_id }))
    const helpers = (res[1] || []).map((h: any) => ({ name: h.helper_name, type: h.type, staff_id: h.staff_id }))
    const drivers = (res[2] || []).map((d: any) => ({ name: d.driver_name || d.drivername, type: d.type, staff_id: d.staff_id }))
    return [...employees, ...helpers, ...drivers].filter(e => e.name)
  }, [employeesData])

  // ── Process transactions ──────────────────────────────────────────────────
  useEffect(() => {
    if (!searchData) return
    // The edit-prefill merge below only ever runs once (settledMergeApplied) —
    // it intentionally doesn't re-run on every render so it doesn't clobber
    // in-progress typing. But this effect has no such guard, so a refetch of
    // searchData mid-edit (e.g. clicking Refresh) was rebuilding `rows` from
    // scratch and silently discarding that merge — the pre-filled payment
    // amount would revert to the row's raw (non-edit-specific) balance,
    // looking like the amount randomly changing. Once an edit session has
    // been initialized, leave it alone.
    if (editVoucher && settledMergeApplied.current) return
    const data = searchData?.data ?? searchData
    const tx = data?.transactions ?? {}
    const all = [
      ...(tx.expensive_details ?? []),
      ...(tx.mainvoucher_subt ?? []),
      ...(tx.fuelentry_subt ?? []),
      ...(tx.laundrybill_subt ?? []),
    ]
    const built: TxRow[] = all
      .filter((r: any) => {
        const edited = Number(r.isedited ?? 0)
        return (edited === 0 || edited === 1) && r.vouchertype !== 'Payment'
      })
      .map((r: any) => {
        const edited = Number(r.isedited ?? 0)
        const amt = Math.abs(Number(r.amount ?? 0))
        const origBalance = edited === 0 ? amt : Math.abs(Number(r.balance ?? amt))
        return {
          id: Number(r.id ?? 0),
          c_id: Number(r.c_id ?? 0),
          c_number: r.c_number ?? '-',
          vouchertype: r.vouchertype ?? '-',
          amount_type: r.amount_type ?? r.account_type ?? '',
          account_type: r.account_type ?? r.amount_type ?? '',
          amount: amt,
          balance: origBalance,
          isedited: edited,
          ledger_id: Number(r.ledger_id ?? 0),
          expensives: r.expensives ?? r.temple_name ?? '-',
          trip_date: r.trip_date,
          voucherdate: r.voucherdate,
          i_ts: r.i_ts,
          vehicleNo: r.vehicleNo ?? r.bus_no ?? '',
          bus_no: r.bus_no ?? '',
          description: r.description ?? '',
          source_table: r.source_table ?? '',
          opp_ledgers: r.opp_ledgers ?? '',
          valueDate: r.valueDate ?? '',
          name: r.name ?? '',
          payablesremarks: r.payablesremarks ?? '',
          sameAsAmount: false,
          temppayment: 0,
          tempbalance: 0,
          originalBalance: origBalance,
          selected: false,
        }
      })
    setRows(built)
    // Editing an existing voucher restores its own credit entries via a
    // dedicated effect once expenseList loads — don't clear them here.
    if (!editVoucher) setCreditEntries([])
  }, [searchData, editVoucher])

  // Re-select and pre-fill the rows this voucher originally settled, once
  // both the base row list and the settled-rows lookup have loaded. Rows
  // that were fully paid (isedited=2) are excluded from the normal fetch —
  // those are reconstructed here from the settled-rows data so they're still
  // visible to review/re-select.
  const settledMergeApplied = useRef(false)
  useEffect(() => {
    if (!editVoucher || settledMergeApplied.current || !searchData || settledRowsData === undefined) return
    settledMergeApplied.current = true
    if (settledRows.length === 0) return

    setRows(prev => {
      const settledByKey = new Map(settledRows.map((s: any) => [`${s.source_table}-${s.id}`, s]))
      const matchedKeys = new Set<string>()

      const updated = prev.map(r => {
        const key = `${r.source_table}-${r.id}`
        const s = settledByKey.get(key)
        if (!s) return r
        matchedKeys.add(key)
        const balance = Number(s.balance) || 0
        // The amount available to THIS voucher specifically — its own share
        // plus whatever's still unpaid. NOT the row's full original amount:
        // when another still-valid voucher also holds a share of this row,
        // that portion isn't this voucher's to claim. The backend computes
        // this from the row's settle/reverse history (available_balance);
        // payment+balance is kept only as a fallback for older data without
        // a history trail, where it happens to equal the full amount anyway.
        const preVoucherBalance = s.available_balance != null ? Number(s.available_balance) : ((Number(s.payment) || 0) + balance)
        // s.payment is the row's TOTAL payment across every voucher that's
        // ever settled it, not just this one's — what belongs in the
        // Payment box is only what THIS voucher itself contributed, which is
        // the gap between what was available to it and what's left unpaid.
        const ownPayment = preVoucherBalance - balance
        return {
          ...r,
          balance: preVoucherBalance,
          originalBalance: preVoucherBalance,
          selected: true,
          temppayment: ownPayment,
          tempbalance: balance,
          sameAsAmount: ownPayment === preVoucherBalance && ownPayment > 0,
        }
      })

      const extra: TxRow[] = settledRows
        .filter((s: any) => !matchedKeys.has(`${s.source_table}-${s.id}`))
        .map((s: any) => {
          const amt = Math.abs(Number(s.amount ?? 0))
          const balance = Number(s.balance) || 0
          // Same reasoning as above — the amount available to THIS voucher,
          // not the row's full original amount.
          const preVoucherBalance = s.available_balance != null ? Number(s.available_balance) : ((Number(s.payment) || 0) + balance)
          // s.payment is the row's running total across every voucher, not
          // just this one's own contribution — see the matched-rows branch above.
          const ownPayment = preVoucherBalance - balance
          return {
            id: Number(s.id ?? 0),
            c_id: Number(s.c_id ?? 0),
            c_number: s.c_number ?? '-',
            vouchertype: s.vouchertype ?? '-',
            amount_type: s.amount_type ?? s.account_type ?? '',
            account_type: s.account_type ?? s.amount_type ?? '',
            amount: amt,
            balance: preVoucherBalance,
            isedited: Number(s.isedited ?? 0),
            ledger_id: Number(s.ledger_id ?? 0),
            expensives: s.expensives ?? s.temple_name ?? '-',
            trip_date: s.trip_date,
            voucherdate: s.voucherdate,
            i_ts: s.i_ts,
            vehicleNo: s.vehicleNo ?? s.bus_no ?? '',
            bus_no: s.bus_no ?? '',
            description: s.description ?? '',
            source_table: s.source_table ?? '',
            opp_ledgers: s.opp_ledgers ?? '',
            valueDate: s.valueDate ?? '',
            name: s.name ?? '',
            payablesremarks: s.payablesremarks ?? '',
            sameAsAmount: ownPayment === preVoucherBalance && ownPayment > 0,
            temppayment: ownPayment,
            tempbalance: balance,
            originalBalance: preVoucherBalance,
            selected: true,
          }
        })

      return [...updated, ...extra]
    })
  }, [editVoucher, searchData, settledRowsData, settledRows])

  // ── Row helpers ───────────────────────────────────────────────────────────
  const isCreditAcct = (r: TxRow) =>
    r.amount_type === 'Credit Account' || r.account_type === 'Credit Account'

  const displayAmt = (r: TxRow): number => {
    if (!isCreditAcct(r)) return 0
    return r.isedited === 0 ? r.amount : r.balance
  }

  const updateRow = (idx: number, fields: Partial<TxRow>) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...fields } : r))

  const handleSameAsAmount = (idx: number) => {
    const r = rows[idx]
    const nowChecked = !r.sameAsAmount
    const rawAmt = r.isedited === 0 ? r.amount : r.balance
    if (nowChecked) {
      updateRow(idx, { sameAsAmount: true, temppayment: rawAmt, tempbalance: 0 })
    } else {
      updateRow(idx, { sameAsAmount: false, temppayment: 0, tempbalance: rawAmt, selected: false })
    }
  }

  const handlePaymentInput = (idx: number, val: string) => {
    const r = rows[idx]
    const rawAmt = r.isedited === 0 ? r.amount : r.balance
    let payment = parseFloat(val) || 0
    if (payment < 0) payment = 0
    if (payment > rawAmt) payment = rawAmt
    updateRow(idx, {
      temppayment: payment,
      tempbalance: rawAmt - payment,
      sameAsAmount: payment === rawAmt && payment > 0,
      selected: payment > 0 ? r.selected : false,
    })
  }

  const handleSelectRow = (idx: number) => {
    const r = rows[idx]
    const nowSelected = !r.selected
    updateRow(idx, { selected: nowSelected })
  }

  const allSameAsAmount = rows.length > 0 && rows.filter(r => isCreditAcct(r)).length > 0
    && rows.filter(r => isCreditAcct(r)).every(r => r.sameAsAmount)

  const rowsWithPayment = rows.filter(r => r.temppayment > 0)
  const allSelected = rowsWithPayment.length > 0 && rowsWithPayment.every(r => r.selected)

  const handleSameAsAll = () => {
    const creditRows = rows.filter(r => isCreditAcct(r))
    const shouldCheckAll = !creditRows.every(r => r.sameAsAmount)
    setRows(prev => prev.map(r => {
      if (!isCreditAcct(r)) return r
      const rawAmt = r.isedited === 0 ? r.amount : r.balance
      return shouldCheckAll
        ? { ...r, sameAsAmount: true, temppayment: rawAmt, tempbalance: 0 }
        : { ...r, sameAsAmount: false, temppayment: 0, tempbalance: rawAmt, selected: false }
    }))
  }

  const handleSelectAll = () => {
    const target = !allSelected
    setRows(prev => prev.map(r => ({
      ...r,
      selected: r.temppayment > 0 ? target : false,
    })))
  }

  const openRefNoModal = (entry: TxRow) => {
    const sourceTable = entry.source_table || ''
    setModal({ open: false, data: null, sourceTable, refNo: entry.c_number || '', loading: true })
    accountingService.getRefDetails({
      c_number: entry.c_number,
      source_table: sourceTable,
      user_id: userId,
    }).then((res: any) => {
      if (res?.data?.success && res.data.all_entries?.length) {
        setModal({
          open: true,
          data: { source_table: res.data.source_table, primary_data: res.data.primary_data, all_entries: res.data.all_entries, c_number: res.data.c_number },
          sourceTable: res.data.source_table || sourceTable,
          refNo: entry.c_number || '',
          loading: false,
        })
      } else {
        toast.error('No details found for this reference number')
        setModal(m => ({ ...m, loading: false }))
      }
    }).catch(() => {
      toast.error('Error loading reference details')
      setModal(m => ({ ...m, loading: false }))
    })
  }

  const openHistoryModal = (row: TxRow) => {
    setHistoryModal({ open: true, row, data: [], loading: true })
    accountingService.getPayablesPaymentHistory({ source_table: row.source_table || '', source_id: row.id })
      .then((res: any) => {
        setHistoryModal(m => ({ ...m, data: res?.data ?? [], loading: false }))
      })
      .catch(() => {
        toast.error('Error loading payment history')
        setHistoryModal(m => ({ ...m, loading: false }))
      })
  }

  const addCreditEntry = () => {
    if (!creditAddForm.ledger_id) { toast.warning('Select a ledger'); return }
    if (!creditAddForm.amount) { toast.warning('Enter an amount'); return }
    const led = expenseList.find((e: any) => String(e.id) === creditAddForm.ledger_id)
    if (!led) { toast.warning('Invalid ledger'); return }
    const amt = parseFloat(creditAddForm.amount)
    if (amt <= 0) { toast.warning('Amount must be greater than 0'); return }
    setCreditEntries(prev => [...prev, { ledger: led, amount: amt }])
    setCreditAddForm({ ledger_id: '', amount: '' })
    toast.success('Credit entry added')
  }

  // ── Totals ───────────────────────────────────────────────────────────────
  const { grandAmount, grandPayment, grandBalance } = useMemo(() => {
    let grandAmount = 0, grandPayment = 0, grandBalance = 0
    for (const r of rows) {
      grandAmount += displayAmt(r)
      grandPayment += r.temppayment || 0
      grandBalance += r.tempbalance || 0
    }
    return { grandAmount, grandPayment, grandBalance }
  }, [rows])

  const { selectedAmount, selectedPayment, selectedBalance } = useMemo(() => {
    let selectedAmount = 0, selectedPayment = 0, selectedBalance = 0
    for (const r of rows.filter(r => r.selected)) {
      // Angular calculateSelectedTotals uses raw isedited-conditional amount (not credit-only)
      selectedAmount += Number(r.isedited === 0 ? r.amount : r.balance) || 0
      selectedPayment += r.temppayment || 0
      selectedBalance += r.tempbalance || 0
    }
    return { selectedAmount, selectedPayment, selectedBalance }
  }, [rows])

  const debitTotal = useMemo(() => debitEntries.reduce((s, d) => s + d.amount, 0), [debitEntries])
  const creditTotal = useMemo(() => creditEntries.reduce((s, c) => s + c.amount, 0), [creditEntries])

  // Auto-fill the credit amount with whatever's still needed to match the debit total,
  // so the user doesn't have to type the same amount that's already shown on the debit side.
  useEffect(() => {
    const needed = debitTotal - creditTotal
    setCreditAddForm(f => ({ ...f, amount: needed > 0 ? String(needed) : '' }))
  }, [debitTotal, creditTotal])

  // A ledger + amount typed into the Credit Account row counts even before the
  // user clicks "+" — same "pending entry" pattern Voucher Entry already uses,
  // so you don't have to click Add just to satisfy validation.
  const pendingCreditEntry = useMemo<CreditEntry | null>(() => {
    if (!creditAddForm.ledger_id || !creditAddForm.amount) return null
    const led = expenseList.find((e: any) => String(e.id) === creditAddForm.ledger_id)
    const amt = parseFloat(creditAddForm.amount)
    if (!led || !(amt > 0)) return null
    return { ledger: led, amount: amt }
  }, [creditAddForm, expenseList])
  const effectiveCreditEntries = useMemo(
    () => pendingCreditEntry ? [...creditEntries, pendingCreditEntry] : creditEntries,
    [creditEntries, pendingCreditEntry]
  )
  const effectiveCreditTotal = useMemo(() => effectiveCreditEntries.reduce((s, c) => s + c.amount, 0), [effectiveCreditEntries])

  // ── Live validation — shown as badges instead of waiting for a Submit click ──
  const selectedRowCount = rows.filter(r => r.selected).length
  const balanced = debitEntries.length > 0 && effectiveCreditEntries.length > 0 && Math.abs(debitTotal - effectiveCreditTotal) < 0.01
  const validationIssues = useMemo(() => {
    const issues: string[] = []
    if (selectedRowCount === 0) issues.push('Select at least one transaction')
    if (!voucherForm.voucherdate) issues.push('Voucher date required')
    if (!voucherForm.description.trim()) issues.push('Description required')
    if (debitEntries.length === 0) issues.push('No debit entries — select a transaction above')
    if (effectiveCreditEntries.length === 0) issues.push('Add a credit entry')
    if (debitEntries.length > 0 && effectiveCreditEntries.length > 0 && !balanced) {
      issues.push(`Dr ₹${fmtAmt(debitTotal)} ≠ Cr ₹${fmtAmt(effectiveCreditTotal)}`)
    }
    return issues
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRowCount, voucherForm.voucherdate, voucherForm.description, debitEntries, effectiveCreditEntries, debitTotal, effectiveCreditTotal, balanced])
  const canSubmit = validationIssues.length === 0

  // ── Submit (create) ─────────────────────────────────────────────────────
  const { mutate: submitVoucher, isPending: submitting } = useMutation({
    mutationFn: (payload: unknown) => accountingService.submitPayablesVoucher(payload),
    onSuccess: (res: any) => {
      if (res?.status === 200) {
        toast.success('Voucher submitted successfully!')
        refetch()
        setCreditEntries([])
        setCreditAddForm({ ledger_id: '', amount: '' })
        setVoucherForm(f => ({ ...f, description: '', voucher_type_id: '', vouchertype: '', valueDate: '', vehicleNo: '', name: '', staff_type: '', staff_type_id: '' }))
      }
 else {
        toast.error(res?.message || 'Failed to submit voucher')
      }
    },
    onError: () => toast.error('Server error while submitting'),
  })

  // ── Submit (edit existing voucher) ──────────────────────────────────────
  // Updates the SAME c_number in place (old rows soft-superseded, audit
  // entry written) instead of submitVoucher's always-creates-new behaviour.
  const { mutate: updateVoucher, isPending: updating } = useMutation({
    mutationFn: (payload: unknown) => accountingService.updatePayablesVoucher(payload),
    onSuccess: (res: any) => {
      if (res?.status === 200) {
        toast.success('Voucher updated!')
        refetch()
        qc.invalidateQueries({ queryKey: ['payables-settled-rows', editVoucher?.c_number] })
        qc.invalidateQueries({ queryKey: ['payables-voucher-audit', editVoucher?.c_number] })
        setEditReason('')
        // This page only opens in edit mode from a new tab spawned by Voucher
        // Approvals (window.open in openInPayables) — closing it here returns
        // the user to that Approvals tab instead of leaving a dead-end tab open.
        setTimeout(() => window.close(), 900)
      } else {
        toast.error(res?.message || 'Failed to update voucher')
      }
    },
    onError: () => toast.error('Server error while updating'),
  })

  const handleSubmit = () => {
    if (!canSubmit) return
    const selectedRows = rows.filter(r => r.selected)
    const selectedLedgersData = selectedRows.map(r => ({
      ...r,
      isedited: r.temppayment >= r.originalBalance ? 2 : 1,
      payment: r.temppayment,
      balance: r.tempbalance,
    }))

    const basePayload = {
      expensedetails: {
        ...voucherForm,
        voucher_type_id: voucherForm.voucher_type_id,
        staff_type: voucherForm.staff_type,
        staff_type_id: voucherForm.staff_type_id,
      },
      // Field names below match what payablessubmitvoucherentrysubtable(seconddata)
      // actually reads on the backend — NOT the same shape as our DebitEntry/CreditEntry types.
      patientsTstdts: debitEntries.map(d => ({
        debitaccount: 'Debit Account',
        d_test_amount: d.amount,
        d_test_name: d.ledger,
      })),
      creditaddrowdts: effectiveCreditEntries.map(c => ({
        creditaccount: 'Credit Account',
        creditamount: c.amount,
        creditledger: c.ledger,
      })),
      creditanddebitamount: debitTotal,
      user_id: userId,
      named: localStorage.getItem('usr_nm'),
      selectedledgerdata: selectedLedgersData,
    }

    if (editVoucher) {
      const userName = localStorage.getItem('usr_nm') || ''
      const todayStr = new Date().toISOString().split('T')[0]

      // Lightweight diff for the audit trail — header fields plus which
      // transactions/credit ledgers are settling this voucher now.
      type ChangeRow = { side: string; idx: number; ledger: string; field: string; old: string; nw: string }
      const changes: ChangeRow[] = []
      const hdr = (field: string, old: string, nw: string) => { if ((old || '') !== (nw || '')) changes.push({ side: 'header', idx: 0, ledger: '', field, old: old || '', nw: nw || '' }) }
      hdr('Voucher Date', editVoucher.voucherdate, voucherForm.voucherdate)
      hdr('Value Date', editVoucher.valueDate, voucherForm.valueDate)
      hdr('Vehicle', editVoucher.vehicleNo, voucherForm.vehicleNo)
      hdr('Narration', editVoucher.description, voucherForm.description)
      const oldCreditTotal = editVoucher.creditEntries.reduce((s, c) => s + c.amount, 0)
      if (Math.abs(oldCreditTotal - creditTotal) > 0.01) hdr('Credit Total', String(oldCreditTotal), String(creditTotal))
      const oldSettledTotal = settledRows.reduce((s, r: any) => s + (Number(r.payment) || 0), 0)
      const newSettledTotal = selectedLedgersData.reduce((s, r) => s + (r.payment || 0), 0)
      if (Math.abs(oldSettledTotal - newSettledTotal) > 0.01) hdr('Settled Total', String(oldSettledTotal), String(newSettledTotal))
      selectedLedgersData.forEach((r, i) => {
        changes.push({ side: 'DR', idx: i + 1, ledger: r.expensives || '', field: 'Payment', old: '', nw: fmtAmt(r.payment || 0) })
      })
      effectiveCreditEntries.forEach((c, i) => {
        changes.push({ side: 'CR', idx: i + 1, ledger: c.ledger.temple_name, field: 'Amount', old: '', nw: fmtAmt(c.amount) })
      })

      updateVoucher({
        ...basePayload,
        c_number: editVoucher.c_number,
        entry_by: editVoucher.entry_by || userName,
        i_ts: editVoucher.i_ts || todayStr,
        updatedby_id: userId,
        updatedby_name: userName,
        updatedby_date: todayStr,
        changes_note: JSON.stringify({ reason: editReason.trim(), changes }),
      })
    } else {
      submitVoucher(basePayload)
    }
  }

  const handleStaffChange = (val: string) => {
    const staff = employeesList.find(e => e.name === val)
    setVoucherForm(f => ({
      ...f,
      name: val,
      staff_type: staff?.type ?? '',
      staff_type_id: staff?.staff_id ?? '',
    }))
  }

  // ── Exports ──────────────────────────────────────────────────────────────
  const title = ledgerName ? `${ledgerName} — Payables Report` : 'Payables Report'

  const exportToExcel = () => {
    const headers = ['Sl No', 'Date', 'Ref No', 'Voucher Type', 'Vehicle No', 'Description', 'Amount', 'Payment', 'Balance', 'Remarks']
    const dataRows = rows.map((r, i) => [
      i + 1,
      fmt(resolveDateStr(r)),
      r.c_number || '-',
      r.vouchertype || '-',
      r.vehicleNo || r.bus_no || '-',
      r.description || '-',
      displayAmt(r).toFixed(2),
      (r.temppayment || 0).toFixed(2),
      isCreditAcct(r) ? (r.tempbalance || 0).toFixed(2) : '-',
      r.payablesremarks || '',
    ])
    const totalRow = ['', '', '', '', '', 'Grand Total', grandAmount.toFixed(2), grandPayment.toFixed(2), grandBalance.toFixed(2), '']
    const data = [headers, ...dataRows, totalRow]
    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = data[0].map((_: any, i: number) => ({ wch: Math.max(...data.map(r => String(r[i] ?? '').length)) + 2 }))
    const wb: XLSX.WorkBook = { Sheets: { Payables: ws }, SheetNames: ['Payables'] }
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.xlsx`; a.click()
    URL.revokeObjectURL(url)
  }

  const exportToPDF = () => {
    const doc = new jsPDF('landscape')
    doc.setFontSize(14)
    doc.text(title, 14, 15)
    const headers = ['Sl No', 'Date', 'Ref No', 'Voucher Type', 'Vehicle No', 'Description', 'Amount', 'Payment', 'Balance', 'Remarks']
    const body: any[][] = rows.map((r, i) => [
      (i + 1).toString(),
      fmt(resolveDateStr(r)),
      r.c_number || '-',
      r.vouchertype || '-',
      r.vehicleNo || r.bus_no || '-',
      r.description || '-',
      { content: displayAmt(r).toFixed(2), styles: { halign: 'right' as const } },
      { content: (r.temppayment || 0).toFixed(2), styles: { halign: 'right' as const } },
      { content: isCreditAcct(r) ? (r.tempbalance || 0).toFixed(2) : '-', styles: { halign: 'right' as const } },
      r.payablesremarks || '',
    ])
    body.push(['', '', '', '', '', { content: 'Grand Total', styles: { fontStyle: 'bold' as const, halign: 'right' as const } },
      { content: grandAmount.toFixed(2), styles: { fontStyle: 'bold' as const, halign: 'right' as const } },
      { content: grandPayment.toFixed(2), styles: { fontStyle: 'bold' as const, halign: 'right' as const } },
      { content: grandBalance.toFixed(2), styles: { fontStyle: 'bold' as const, halign: 'right' as const } },
      '',
    ])
    autoTable(doc, {
      head: [headers],
      body,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 22 },
        2: { cellWidth: 22 },
        3: { cellWidth: 24 },
        4: { cellWidth: 24 },
        5: { cellWidth: 50 },
        6: { cellWidth: 22, halign: 'right' },
        7: { cellWidth: 22, halign: 'right' },
        8: { cellWidth: 22, halign: 'right' },
        9: { cellWidth: 30 },
      },
    })
    doc.save(`${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`)
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const TH = ({ children, cls = '' }: { children: React.ReactNode; cls?: string }) => (
    <th className={`px-3 py-3 text-left text-sm font-bold text-white whitespace-nowrap bg-blue-600 border-r border-blue-500 last:border-0 ${cls}`}>
      {children}
    </th>
  )

  const showSelectedTotals = selectedAmount > 0 || selectedPayment > 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Ref No Modals */}
      {modal.open && modal.data && (
        modal.sourceTable === 'laundrybill_subt'
          ? <LaundryModal data={modal.data} refNo={modal.refNo} onClose={() => setModal(m => ({ ...m, open: false }))} />
          : modal.sourceTable === 'fuelentry_subt'
            ? <FuelModal data={modal.data} refNo={modal.refNo} onClose={() => setModal(m => ({ ...m, open: false }))} />
            : <VoucherModal data={modal.data} refNo={modal.refNo} onClose={() => setModal(m => ({ ...m, open: false }))} />
      )}

      {/* Payment History Modal */}
      {historyModal.open && historyModal.row && (
        <PaymentHistoryModal
          row={historyModal.row}
          data={historyModal.data}
          loading={historyModal.loading}
          onClose={() => setHistoryModal(m => ({ ...m, open: false }))}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => window.close()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Close
        </button>
        <PageHeader
          title={`Payables${ledgerName ? ` — ${ledgerName}` : ''}`}
          subtitle="Track and record outstanding payable transactions"
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={exportToExcel}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-40"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button
            onClick={exportToPDF}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-40"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </div>

      {editVoucher && (
        <GlassCard className="p-4 space-y-4" colorBar="bg-gradient-to-r from-purple-500 to-indigo-500">
          <div className="flex items-center gap-3 text-sm text-purple-800">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 whitespace-nowrap">
              Editing {editVoucher.c_number}
            </span>
            Voucher date, value date, vehicle, staff, description and the credit entry below were pre-filled from this voucher — select the transaction(s) to pay below to complete the edit.
          </div>
          <div>
            <Label>Reason for editing <span className="text-slate-400 font-normal text-xs">(optional, recorded in history)</span></Label>
            <Input
              value={editReason}
              onChange={e => setEditReason(e.target.value)}
              placeholder="e.g. corrected payment amount"
            />
          </div>

          {/* Activity History */}
          <div className="border-t border-purple-100 pt-4">
            <div className="flex items-center justify-between mb-3">
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
            <ActivityHistory data={auditTrail} initialCreator={editVoucher.entry_by} initialDate={editVoucher.i_ts} />
          </div>
        </GlassCard>
      )}

      {!ledgerId && (
        <GlassCard className="p-8 text-center text-slate-400 text-sm">
          No ledger selected. Open this page from the Balance Sheet by clicking the Payables button on a ledger row.
        </GlassCard>
      )}

      {ledgerId > 0 && (
        <>
          {/* Date Filter */}
          <GlassCard className="p-5" colorBar="bg-gradient-to-r from-blue-500 to-indigo-500">
            <FYSelector className="mb-4 pb-4 border-b border-slate-100" />
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <Label>From Date</Label>
                <Input type="date" min={fyMin} max={fyMax} value={filter.fromdate}
                  onChange={e => setFilter(f => ({ ...f, fromdate: e.target.value }))} />
              </div>
              <div>
                <Label>To Date</Label>
                <Input type="date" min={fyMin} max={fyMax} value={filter.todate}
                  onChange={e => setFilter(f => ({ ...f, todate: e.target.value }))} />
              </div>
              <Button onClick={() => setApplied({ ...filter })}>
                <RefreshCw className="w-4 h-4" /> Load
              </Button>
              <Button onClick={() => refetch()} disabled={isFetching} className="bg-slate-600 hover:bg-slate-700">
                <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
          </GlassCard>

          {/* Transactions Table */}
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />)}
            </div>
          ) : rows.length === 0 ? (
            <GlassCard className="p-10 text-center text-slate-400 text-sm">
              No payable transactions found for this ledger in the selected date range.
            </GlassCard>
          ) : (
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <TH cls="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span>Sl No</span>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={handleSelectAll}
                            disabled={rowsWithPayment.length === 0}
                            className="w-4 h-4 accent-white cursor-pointer disabled:opacity-40"
                            title={allSelected ? 'Deselect all' : 'Select all'}
                          />
                        </div>
                      </TH>
                      <TH>Date</TH>
                      <TH>Ref No</TH>
                      <TH>Voucher Type</TH>
                      <TH>Vehicle No</TH>
                      <TH>Description</TH>
                      <TH cls="text-right">Amount</TH>
                      <TH cls="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span>Same as Amt</span>
                          <input
                            type="checkbox"
                            checked={allSameAsAmount}
                            onChange={handleSameAsAll}
                            disabled={rows.filter(r => isCreditAcct(r)).length === 0}
                            className="w-4 h-4 accent-white cursor-pointer disabled:opacity-40"
                            title={allSameAsAmount ? 'Clear all amounts' : 'Fill all amounts'}
                          />
                        </div>
                      </TH>
                      <TH cls="text-right">Payment</TH>
                      <TH cls="text-right">Balance</TH>
                      <TH>Remarks</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const isCredit = isCreditAcct(row)
                      const amt = displayAmt(row)
                      return (
                        <tr
                          key={idx}
                          className={row.selected
                            ? 'bg-blue-50'
                            : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                          }
                        >
                          <td className="px-3 py-3 border-b border-slate-100 text-center text-slate-500 text-sm">
                            {row.temppayment > 0 && (
                              <input
                                type="checkbox"
                                checked={row.selected}
                                onChange={() => handleSelectRow(idx)}
                                className="w-4 h-4 accent-blue-600 cursor-pointer mr-1"
                              />
                            )}
                            {idx + 1}
                          </td>
                          <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap text-slate-600 text-sm">
                            {fmt(resolveDateStr(row))}
                          </td>
                          <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap">
                            {row.c_number && row.c_number !== '-' ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => openHistoryModal(row)}
                                  title="View payment history for this transaction"
                                  className="text-blue-600 hover:text-blue-800 font-medium text-sm underline underline-offset-2 transition-colors"
                                >
                                  {row.c_number}
                                </button>
                                <button
                                  onClick={() => openRefNoModal(row)}
                                  disabled={modal.loading}
                                  title="View voucher details"
                                  className="text-slate-300 hover:text-blue-500 transition-colors flex-shrink-0"
                                >
                                  {modal.loading && modal.refNo === row.c_number ? <span className="text-xs">…</span> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap text-slate-700 text-sm">{row.vouchertype || 'Journal'}</td>
                          <td className="px-3 py-3 border-b border-slate-100 whitespace-nowrap text-slate-600 text-sm">{row.vehicleNo || row.bus_no || '-'}</td>
                          <td className="px-3 py-3 border-b border-slate-100 max-w-[200px] truncate text-slate-500 text-sm">{row.description || '-'}</td>
                          <td className="px-3 py-3 border-b border-slate-100 text-right tabular-nums text-slate-800 text-sm">
                            {isCredit ? fmtAmt(amt) : '0.00'}
                          </td>
                          <td className="px-3 py-3 border-b border-slate-100 text-center">
                            <input
                              type="checkbox"
                              checked={row.sameAsAmount}
                              onChange={() => handleSameAsAmount(idx)}
                              className="w-4 h-4 accent-emerald-600 cursor-pointer"
                            />
                          </td>
                          <td className="px-3 py-3 border-b border-slate-100">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={row.temppayment || ''}
                              onChange={e => handlePaymentInput(idx, e.target.value)}
                              placeholder="Payment"
                              style={{ border: 'none', background: 'transparent' }}
                              className="w-28 h-8 px-2 text-right text-sm focus:outline-none tabular-nums"
                            />
                          </td>
                          <td className={`px-3 py-3 border-b border-slate-100 text-right font-bold tabular-nums text-sm ${(row.tempbalance ?? 0) < 0 ? 'text-red-500' : 'text-slate-800'}`}>
                            {fmtAmt(row.tempbalance ?? 0)}
                          </td>
                          <td className="px-3 py-3 border-b border-slate-100">
                            <input
                              type="text"
                              value={row.payablesremarks}
                              onChange={e => updateRow(idx, { payablesremarks: e.target.value })}
                              placeholder="Remarks"
                              style={{ border: 'none', background: 'transparent' }}
                              className="w-32 h-8 px-2 text-sm focus:outline-none"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    {showSelectedTotals && (
                      <tr className="bg-blue-100 border-t-2 border-blue-300">
                        <td colSpan={6} className="px-3 py-3 text-right text-sm font-bold text-blue-700 uppercase tracking-wide">
                          Selected Total:
                        </td>
                        <td className="px-3 py-3 text-right text-blue-700 font-bold tabular-nums text-sm">{fmtAmt(selectedAmount)}</td>
                        <td colSpan={2} className="px-3 py-3 text-right text-blue-700 font-bold tabular-nums text-sm">{fmtAmt(selectedPayment)}</td>
                        <td className="px-3 py-3 text-right text-blue-700 font-bold tabular-nums text-sm">{fmtAmt(selectedBalance)}</td>
                        <td />
                      </tr>
                    )}
                    <tr className="bg-amber-50 border-t-2 border-amber-200">
                      <td colSpan={6} className="px-3 py-3 text-right text-sm font-bold text-amber-700 uppercase tracking-wide">
                        Grand Total:
                      </td>
                      <td className="px-3 py-3 text-right text-amber-700 font-bold tabular-nums text-sm">{fmtAmt(grandAmount)}</td>
                      <td colSpan={2} className="px-3 py-3 text-right text-amber-700 font-bold tabular-nums text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={handleSelectAll}
                            disabled={rowsWithPayment.length === 0}
                            className="w-4 h-4 accent-amber-600 cursor-pointer disabled:opacity-40"
                            title={allSelected ? 'Deselect all' : 'Select all'}
                          />
                          {fmtAmt(grandPayment)}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-amber-700 font-bold tabular-nums text-sm">{fmtAmt(grandBalance)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </GlassCard>
          )}

          {/* Voucher Entry Form */}
          {rows.length > 0 && (
            <GlassCard className="p-6 space-y-6" colorBar="bg-gradient-to-r from-emerald-500 to-teal-500">
              <h3 className="text-base font-bold text-slate-800">Voucher Entry</h3>

              {/* Transaction Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Voucher Type <span className="text-red-500">*</span></Label>
                  <Input value="Payment" readOnly className="bg-slate-50 cursor-not-allowed text-slate-600 font-medium" />
                </div>
                <div>
                  <Label>Voucher Date <span className="text-red-500">*</span></Label>
                  <Input type="date" min={fyMin} max={fyMax} value={voucherForm.voucherdate}
                    onChange={e => setVoucherForm(f => ({ ...f, voucherdate: e.target.value }))} />
                </div>
                <div>
                  <Label>Value Date</Label>
                  <Input type="date" min={fyMin} max={fyMax} value={voucherForm.valueDate}
                    onChange={e => setVoucherForm(f => ({ ...f, valueDate: e.target.value }))} />
                </div>
                <div>
                  <Label>Vehicle No</Label>
                  <SimpleDropdown
                    value={voucherForm.vehicleNo}
                    placeholder="Select vehicle"
                    searchable
                    options={busList.map((b: any) => ({ label: b.bus_no, value: b.bus_no }))}
                    onChange={v => setVoucherForm(f => ({ ...f, vehicleNo: v }))}
                    onRefresh={() => refetchBuses()}
                    refreshing={busesFetching}
                  />
                </div>
                <div>
                  <Label>Staff Name</Label>
                  <SimpleDropdown
                    value={voucherForm.name}
                    placeholder="Select staff"
                    searchable
                    options={employeesList.map((emp: any) => ({ label: `${emp.name} (${emp.type})`, value: emp.name }))}
                    onChange={handleStaffChange}
                    onRefresh={() => refetchEmployees()}
                    refreshing={employeesFetching}
                  />
                </div>
                <div>
                  <Label>Description <span className="text-red-500">*</span></Label>
                  <textarea
                    rows={3}
                    placeholder="Enter transaction description"
                    value={voucherForm.description}
                    onChange={e => setVoucherForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                  />
                </div>
              </div>

              {/* Debit / Credit Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Debit Account — auto-populated from selected rows */}
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded">DR</span>
                    Debit Account
                    <span className="ml-auto text-xs font-semibold text-slate-500">₹{fmtAmt(debitTotal)}</span>
                  </h4>
                  {debitEntries.length === 0 ? (
                    <p className="text-sm text-slate-400 italic py-2">
                      Enter a payment amount and select a transaction row above to auto-populate debit entries.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">S.No</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Ledger Name</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-slate-600">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {debitEntries.map((d, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="px-3 py-2 text-xs text-slate-600">{i + 1}</td>
                              <td className="px-3 py-2 text-xs text-slate-800">{d.ledger?.temple_name}</td>
                              <td className="px-3 py-2 text-xs text-right tabular-nums text-slate-800">₹{fmtAmt(d.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Credit Account — manual entry */}
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-600 text-xs font-bold px-2 py-0.5 rounded">CR</span>
                    Credit Account
                    <span className="ml-auto text-xs font-semibold text-slate-500">₹{fmtAmt(effectiveCreditTotal)}</span>
                  </h4>
                  <div className="flex gap-2 mb-3">
                    <SimpleDropdown
                      value={creditAddForm.ledger_id}
                      placeholder="Select Ledger"
                      searchable
                      options={creditLedgerOptions.map((e: any) => ({ label: e.temple_name ?? e.name, value: String(e.id) }))}
                      onChange={v => setCreditAddForm(f => ({ ...f, ledger_id: v }))}
                      onRefresh={() => refetchExpenseLedgers()}
                      refreshing={expenseLedgersFetching}
                    />
                    <input
                      type="number" min="0" step="0.01" placeholder="Amount"
                      value={creditAddForm.amount}
                      onChange={e => setCreditAddForm(f => ({ ...f, amount: e.target.value }))}
                      className="w-28 h-9 px-3 text-right text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <button
                      onClick={addCreditEntry}
                      className="h-9 w-9 flex items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {effectiveCreditEntries.length === 0 ? (
                    <p className="text-sm text-slate-400 italic py-2">No credit entries added yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                        <thead>
                          <tr className="bg-slate-100">
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">S.No</th>
                            <th className="px-3 py-2 text-left text-xs font-bold text-slate-600">Ledger Name</th>
                            <th className="px-3 py-2 text-right text-xs font-bold text-slate-600">Amount</th>
                            <th className="px-3 py-2 text-center text-xs font-bold text-slate-600">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creditEntries.map((c, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="px-3 py-2 text-xs text-slate-600">{i + 1}</td>
                              <td className="px-3 py-2 text-xs text-slate-800">{c.ledger?.temple_name}</td>
                              <td className="px-3 py-2 text-xs text-right tabular-nums text-slate-800">₹{fmtAmt(c.amount)}</td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={() => setCreditEntries(prev => prev.filter((_, j) => j !== i))}
                                  className="text-red-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                          {pendingCreditEntry && (
                            <tr className="bg-emerald-50/60 italic">
                              <td className="px-3 py-2 text-xs text-slate-400">{creditEntries.length + 1}</td>
                              <td className="px-3 py-2 text-xs text-emerald-700">
                                {pendingCreditEntry.ledger?.temple_name}
                                <span className="ml-1.5 text-[10px] font-semibold not-italic text-emerald-500 bg-emerald-100 px-1.5 py-0.5 rounded">pending</span>
                              </td>
                              <td className="px-3 py-2 text-xs text-right tabular-nums text-emerald-700">₹{fmtAmt(pendingCreditEntry.amount)}</td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  onClick={addCreditEntry}
                                  title="Add to list"
                                  className="text-emerald-500 hover:text-emerald-700 transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Totals summary + Submit */}
              {(debitEntries.length > 0 || effectiveCreditEntries.length > 0) && (
                <div className={`flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-medium border ${Math.abs(debitTotal - effectiveCreditTotal) < 0.01 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  <span>Dr: ₹{fmtAmt(debitTotal)}</span>
                  <span className="text-slate-400">|</span>
                  <span>Cr: ₹{fmtAmt(effectiveCreditTotal)}</span>
                  {Math.abs(debitTotal - effectiveCreditTotal) > 0.01 && (
                    <span className="ml-auto text-xs">Difference: ₹{fmtAmt(Math.abs(debitTotal - effectiveCreditTotal))}</span>
                  )}
                </div>
              )}

              <div className="flex flex-col items-end gap-3 pt-2 border-t border-slate-100">
                {validationIssues.length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-end">
                    {validationIssues.map(issue => (
                      <span key={issue} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-600">
                        {issue}
                      </span>
                    ))}
                  </div>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || updating || !canSubmit}
                  className="px-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting || updating
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> {editVoucher ? 'Updating…' : 'Submitting…'}</>
                    : <><Send className="w-4 h-4" /> {editVoucher ? 'Update Voucher' : 'Submit Voucher'}</>}
                </Button>
              </div>
            </GlassCard>
          )}
        </>
      )}
    </motion.div>
  )
}
