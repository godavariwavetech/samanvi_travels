import { useState, useMemo, useEffect } from 'react'
import { motion } from 'motion/react'
import { ArrowLeft, RefreshCw, Send, Plus, Trash2, X, FileSpreadsheet, FileText } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader } from '@/components/shared'
import { accountingService } from '@/services/accounting.service'
import { mastersService } from '@/services/masters.service'
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

export default function PayablesViewPage() {
  const userId = localStorage.getItem('user_id') ?? ''
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

  // Angular's date filter form is commented out — always start with empty dates (load all records)
  const [filter, setFilter] = useState({ fromdate: '', todate: '' })
  const [applied, setApplied] = useState({ fromdate: '', todate: '' })
  const [rows, setRows] = useState<TxRow[]>([])
  const [creditEntries, setCreditEntries] = useState<CreditEntry[]>([])
  const [voucherForm, setVoucherForm] = useState({
    vouchertype: '' as any,
    voucher_type_id: '',
    voucherdate: new Date().toISOString().split('T')[0],
    valueDate: '',
    vehicleNo: '',
    name: '',
    staff_type: '',
    staff_type_id: '',
    description: '',
  })
  const [creditAddForm, setCreditAddForm] = useState({ ledger_id: '', amount: '' })
  const [modal, setModal] = useState<{ open: boolean; data: any; sourceTable: string; refNo: string; loading: boolean }>({
    open: false, data: null, sourceTable: '', refNo: '', loading: false,
  })

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: searchData, isLoading, refetch } = useQuery({
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

  const { data: expenseData } = useQuery({
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

  const { data: busData } = useQuery({
    queryKey: ['buses-payables'],
    queryFn: () => mastersService.getBuses(),
  })

  const { data: employeesData } = useQuery({
    queryKey: ['employees-dropdown-payables'],
    queryFn: () => accountingService.getEmployeesDropdown(),
  })

  const expenseList: any[] = useMemo(() => expenseData?.data ?? [], [expenseData])
  // Exclude the ledger already being viewed/settled — it can't be its own opposite-side credit entry
  const creditLedgerOptions = useMemo(
    () => expenseList.filter((e: any) => Number(e.id) !== Number(ledgerId)),
    [expenseList, ledgerId]
  )

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
    setCreditEntries([])
  }, [searchData])

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

  // ── Submit ───────────────────────────────────────────────────────────────
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

  const handleSubmit = () => {
    if (!canSubmit) return
    const selectedRows = rows.filter(r => r.selected)
    const selectedLedgersData = selectedRows.map(r => ({
      ...r,
      isedited: r.temppayment >= r.originalBalance ? 2 : 1,
      payment: r.temppayment,
      balance: r.tempbalance,
    }))

    submitVoucher({
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
    })
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

      {!ledgerId && (
        <GlassCard className="p-8 text-center text-slate-400 text-sm">
          No ledger selected. Open this page from the Balance Sheet by clicking the Payables button on a ledger row.
        </GlassCard>
      )}

      {ledgerId > 0 && (
        <>
          {/* Date Filter */}
          <GlassCard className="p-5" colorBar="bg-gradient-to-r from-blue-500 to-indigo-500">
            <div className="flex items-end gap-4 flex-wrap">
              <div>
                <Label>From Date</Label>
                <Input type="date" max={today} value={filter.fromdate}
                  onChange={e => setFilter(f => ({ ...f, fromdate: e.target.value }))} />
              </div>
              <div>
                <Label>To Date</Label>
                <Input type="date" max={today} value={filter.todate}
                  onChange={e => setFilter(f => ({ ...f, todate: e.target.value }))} />
              </div>
              <Button onClick={() => setApplied({ ...filter })}>
                <RefreshCw className="w-4 h-4" /> Load
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
                              <button
                                onClick={() => openRefNoModal(row)}
                                disabled={modal.loading}
                                className="text-blue-600 hover:text-blue-800 font-medium text-sm underline underline-offset-2 transition-colors"
                              >
                                {modal.loading && modal.refNo === row.c_number ? '…' : row.c_number}
                              </button>
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
                      <td colSpan={2} className="px-3 py-3 text-right text-amber-700 font-bold tabular-nums text-sm">{fmtAmt(grandPayment)}</td>
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
                  <Input type="date" max={today} value={voucherForm.voucherdate}
                    onChange={e => setVoucherForm(f => ({ ...f, voucherdate: e.target.value }))} />
                </div>
                <div>
                  <Label>Value Date</Label>
                  <Input type="date" max={today} value={voucherForm.valueDate}
                    onChange={e => setVoucherForm(f => ({ ...f, valueDate: e.target.value }))} />
                </div>
                <div>
                  <Label>Vehicle No</Label>
                  <select
                    value={voucherForm.vehicleNo}
                    onChange={e => setVoucherForm(f => ({ ...f, vehicleNo: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">Select vehicle</option>
                    {busList.map((b: any, i: number) => (
                      <option key={i} value={b.bus_no}>{b.bus_no}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Staff Name</Label>
                  <select
                    value={voucherForm.name}
                    onChange={e => handleStaffChange(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    <option value="">Select staff</option>
                    {employeesList.map((emp: any, i: number) => (
                      <option key={i} value={emp.name}>{emp.name} ({emp.type})</option>
                    ))}
                  </select>
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
                    <select
                      value={creditAddForm.ledger_id}
                      onChange={e => setCreditAddForm(f => ({ ...f, ledger_id: e.target.value }))}
                      className="flex-1 h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      <option value="">Select Ledger</option>
                      {creditLedgerOptions.map((e: any) => (
                        <option key={e.id} value={e.id}>{e.temple_name ?? e.name}</option>
                      ))}
                    </select>
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
                  disabled={submitting || !canSubmit}
                  className="px-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting
                    ? <><RefreshCw className="w-4 h-4 animate-spin" /> Submitting…</>
                    : <><Send className="w-4 h-4" /> Submit Voucher</>}
                </Button>
              </div>
            </GlassCard>
          )}
        </>
      )}
    </motion.div>
  )
}
