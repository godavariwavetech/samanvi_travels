import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { BookMarked, Search, X, ExternalLink, CreditCard, BookOpen, History, ChevronDown, RefreshCw } from 'lucide-react'
import ActivityHistory from '@/components/shared/ActivityHistory'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { GlassCard, Button, Input, Label, PageHeader, ColumnFilterDropdown, FYSelector, DualScrollTable, ExportMenu, ReportColumnPicker, REPORT_EXTRA_COLS, toggleInSet, reportQuantity, reportRate, LedgerGroupTag, useLedgerGroupOf } from '@/components/shared'
import { ledgerGroupName, todayISO } from '@/lib/utils'
import { accountingService } from '@/services/accounting.service'
import { balStr, balCls } from '@/lib/ledgerFormat'
import { useFYStore } from '@/store/fy.store'
import { getCurrentFY } from '@/lib/fy'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(d: any): string {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '-'
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(-2)}`
}

// dd/mm/yy — used only in the PDF export, which needs the narrower format
function fmtShort(d: any): string {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '-'
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${String(dt.getFullYear()).slice(-2)}`
}

// dd-mm-yyyy, hyphen-separated — used in export filenames, which can't contain slashes
function fmtFileDate(d: any): string {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '-'
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`
}

function fmtAmt(n: number): string {
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtN(n: number): string { return n.toFixed(2) }

// Opening/closing balance specifically use the conventional debit=red,
// credit=green scheme — distinct from balCls' neutral per-transaction
// running balance coloring used elsewhere on this page.
function obCbCls(b: number): string {
  return b >= 0 ? 'text-red-500' : 'text-emerald-600'
}

function resolveDate(e: any): Date {
  const map: Record<string, any> = {
    expensive_details: e.trip_date,
    mainvoucher_subt: e.voucherdate,
    fuelentry_subt: e.voucherdate,
    laundrybill_subt: e.i_ts,
  }
  const v = map[e.source_table] || e.i_ts || e.voucherdate || e.trip_date
  return v ? new Date(v) : new Date()
}

function resolveDisplayDate(e: any): string {
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="bg-white rounded-t-3xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {children}
      </motion.div>
    </motion.div>
  )
}

function DebitCreditCards({ entries }: { entries: any[] }) {
  const debitEntries = entries.filter(e => e.amount_type === 'Debit Account' || e.account_type === 'Debit Account')
  const creditEntries = entries.filter(e => e.amount_type === 'Credit Account' || e.account_type === 'Credit Account')
  const debitTotal = debitEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
  const creditTotal = creditEntries.reduce((s, e) => s + Number(e.amount || 0), 0)

  const getLedgerName = (e: any) => e.temple_name || e.expensives || 'Unknown'
  const getHierarchy = (e: any) => {
    const parts = [e.ledger_static_name, e.ledger_mandal_name, e.ledger_subchild_name, e.ledger_name].filter(Boolean)
    return parts.length ? parts.join(' > ') : getLedgerName(e)
  }

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
              <div key={i} className="flex justify-between items-start py-1.5 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{getLedgerName(e)}</p>
                  <p className="text-xs text-slate-400">{getHierarchy(e)}</p>
                </div>
                <span className="text-sm text-slate-700 ml-2 shrink-0">₹{fmtAmt(Number(e.amount))}</span>
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
              <div key={i} className="flex justify-between items-start py-1.5 border-b border-slate-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{getLedgerName(e)}</p>
                  <p className="text-xs text-slate-400">{getHierarchy(e)}</p>
                </div>
                <span className="text-sm text-slate-700 ml-2 shrink-0">₹{fmtAmt(Number(e.amount))}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

// ─── Voucher Modal ────────────────────────────────────────────────────────────
function VoucherModal({ data, refNo, onClose, auditTrail }: { data: any; refNo: string; onClose: () => void; auditTrail: any[] }) {
  const primary = data?.primary_data || {}
  const entries = data?.all_entries || []
  const vDate = primary.parent_date || primary.voucherdate || primary.i_ts
  const vType = primary.parent_vouchertype || primary.vouchertype || 'Receipt'
  const desc = primary.parent_description || primary.description || ''
  const entryBy = primary.entry_by || primary.parent_entry_by || ''
  const totalAmount = primary.creditanddebitamount || primary.parent_creditanddebitamount

  const debitRows = entries.filter((e: any) => e.amount_type === 'Debit Account' || e.account_type === 'Debit Account')
  const creditRows = entries.filter((e: any) => e.amount_type === 'Credit Account' || e.account_type === 'Credit Account')
  const totalDr = debitRows.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
  const totalCr = creditRows.reduce((s: number, e: any) => s + Number(e.amount || 0), 0)
  const isBalanced = Math.abs(totalDr - totalCr) < 0.01
  const getLedgerName = (e: any) => e.expensives || e.temple_name || '—'
  const groupOf = useLedgerGroupOf()

  return (
    <ModalOverlay onClose={onClose}>
      {/* Purple gradient header */}
      <div className="bg-gradient-to-r from-purple-500 to-violet-600 p-5 text-white flex items-start justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> {refNo}
          </h3>
          <p className="text-purple-200 text-sm mt-0.5">{vType} · {vDate ? fmt(vDate) : '—'}</p>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white mt-0.5">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-5">
        {/* Meta cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {([
            ['Voucher Type', vType],
            ['Total Amount', totalAmount ? `₹${fmtAmt(Number(totalAmount))}` : '—'],
            ['Entry By', entryBy || '—'],
          ] as [string, string][]).map(([label, value]) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-500 font-bold uppercase tracking-wide">{label}</div>
              <div className="font-semibold text-slate-900 mt-0.5 truncate">{value ?? '—'}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        {desc && (
          <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-3">
            <div className="text-xs text-slate-500 font-bold uppercase tracking-wide mb-1">Description</div>
            <div className="text-sm text-slate-800 whitespace-pre-wrap">{desc}</div>
          </div>
        )}

        {/* Journal entry table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50 border-b border-slate-200">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-sm text-slate-700">Journal Entry</span>
            {isBalanced
              ? <span className="ml-auto text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2.5 py-0.5 rounded-full">✓ Balanced</span>
              : <span className="ml-auto text-xs font-semibold text-orange-500 bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full">⚠ Unbalanced</span>
            }
          </div>
          <DualScrollTable tableClassName="overflow-auto max-h-64">
          <table className="w-full text-sm">
            <thead>
              <tr className="sticky top-0 z-10 text-[11px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50/60 border-b border-slate-100">
                <th className="text-left px-4 py-2 w-8">#</th>
                <th className="text-left px-4 py-2">Particulars</th>
                <th className="text-right px-4 py-2 w-32">Dr (₹)</th>
                <th className="text-right px-4 py-2 w-32">Cr (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {debitRows.map((r: any, i: number) => (
                <tr key={`dr-${i}`} className="hover:bg-red-50/30">
                  <td className="px-4 py-2.5 text-xs text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{getLedgerName(r)}<LedgerGroupTag group={groupOf({ id: r.ledger_id, name: getLedgerName(r) })} /></span>
                      <span className="text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded tracking-wide">DR</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-red-600 tabular-nums">{fmtAmt(Number(r.amount || 0))}</td>
                  <td className="px-4 py-2.5" />
                </tr>
              ))}
              {creditRows.map((r: any, i: number) => (
                <tr key={`cr-${i}`} className="hover:bg-emerald-50/30">
                  <td className="px-4 py-2.5 text-xs text-slate-400">{debitRows.length + i + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 pl-6">
                      <span className="text-slate-400 text-xs italic mr-1">To</span>
                      <span className="font-semibold text-slate-800">{getLedgerName(r)}<LedgerGroupTag group={groupOf({ id: r.ledger_id, name: getLedgerName(r) })} /></span>
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded tracking-wide">CR</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5" />
                  <td className="px-4 py-2.5 text-right font-bold text-emerald-600 tabular-nums">{fmtAmt(Number(r.amount || 0))}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={2} className="px-4 py-2.5 text-right text-sm font-bold text-slate-600">Total</td>
                <td className="px-4 py-2.5 text-right font-extrabold text-red-700 tabular-nums border-l border-slate-200">{fmtAmt(totalDr)}</td>
                <td className="px-4 py-2.5 text-right font-extrabold text-emerald-700 tabular-nums border-l border-slate-200">{fmtAmt(totalCr)}</td>
              </tr>
            </tfoot>
          </table>
          </DualScrollTable>
        </div>

        {/* Transaction detail cards */}
        {entries.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">Transaction Details</p>
            <div className="space-y-3">
              {[...debitRows.map((r: any) => ({ ...r, _side: 'dr' })), ...creditRows.map((r: any) => ({ ...r, _side: 'cr' }))].map((r: any, i: number) => {
                const isDr = r._side === 'dr'
                return (
                  <div key={i} className={`rounded-xl border-2 overflow-hidden ${isDr ? 'border-red-200' : 'border-emerald-200'}`}>
                    <div className={`flex items-center justify-between px-4 py-2.5 ${isDr ? 'bg-red-50' : 'bg-emerald-50'}`}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded tracking-wide flex-shrink-0 ${isDr ? 'text-red-500 bg-red-100 border border-red-200' : 'text-emerald-600 bg-emerald-100 border border-emerald-200'}`}>{isDr ? 'DR' : 'CR'}</span>
                        <span className="font-semibold text-slate-800 text-sm truncate">{getLedgerName(r)}<LedgerGroupTag group={groupOf({ id: r.ledger_id, name: getLedgerName(r) })} /></span>
                      </div>
                      <span className={`font-bold text-sm tabular-nums flex-shrink-0 ml-2 ${isDr ? 'text-red-600' : 'text-emerald-600'}`}>
                        ₹{fmtAmt(Number(r.amount || 0))}
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Value Date</p>
                        <p className="text-sm font-medium text-slate-700">{r.valueDate ? fmt(r.valueDate) : <span className="text-slate-300">—</span>}</p>
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
        )}

        {/* Activity History */}
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
          <ActivityHistory data={auditTrail} initialCreator={entryBy} initialDate={vDate} />
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ─── Fuel Modal ───────────────────────────────────────────────────────────────
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
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 space-y-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <h4 className="font-bold text-slate-700 mb-3 text-sm">Fuel Entry Information</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            {([
              ['Date', fmt(fDate)],
              ['Vehicle', vehicle],
              ['Service', service],
              ['Driver 1', driver1],
              ['Driver 2', driver2],
              ['Quantity', qty ? `${qty} L` : ''],
              ['Price/L', price ? `₹${price}` : ''],
              ['Total Bill', totalBill ? `₹${fmtAmt(Number(totalBill))}` : ''],
              ['KMPL', kmpl],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <span className="font-medium text-slate-500">{label}: </span>
                <span className="text-slate-800">{value || 'N/A'}</span>
              </div>
            ))}
          </div>
        </div>
        <DebitCreditCards entries={entries} />
      </div>
    </ModalOverlay>
  )
}

// ─── Laundry Modal ────────────────────────────────────────────────────────────
function LaundryModal({ data, refNo, onClose }: { data: any; refNo: string; onClose: () => void }) {
  const entries = data?.all_entries || []
  const primary = data?.primary_data || {}

  const debitRow = entries.find((r: any) =>
    Number(r.white_qty) > 0 || Number(r.blanket_qty) > 0 ||
    Number(r.pillow_qty) > 0 || Number(r.cover_qty) > 0 ||
    Number(r.curtain_qty) > 0 || !!r.vehicleNo
  ) || entries.find((r: any) => r.account_type === 'Debit Account') || {}

  const num = (v: any) => Number(v || 0)
  const vehicle = debitRow.vehicleNo || primary.parent_vehicleNo || '-'
  const totalAmount = num(primary.parent_total_amount || debitRow.total || primary.amount)

  const debitEntries = entries.filter((e: any) => e.account_type === 'Debit Account' || e.amount_type === 'Debit Account')
  const creditEntries = entries.filter((e: any) => e.account_type === 'Credit Account' || e.amount_type === 'Credit Account')
  const getLedgerName = (e: any) => e.temple_name || e.expensives || 'Unknown'
  const groupOf = useLedgerGroupOf()

  return (
    <ModalOverlay onClose={onClose}>
      <div
        className="px-6 py-4 rounded-t-2xl flex items-center justify-between"
        style={{ background: 'linear-gradient(90deg,#7b5bf2,#5ac8fa)' }}
      >
        <h3 className="font-bold text-white text-lg">Laundry Bill Details — {refNo}</h3>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="p-6 space-y-4">
        <div className="bg-sky-50 rounded-xl overflow-hidden">
          <div className="bg-sky-500 text-white px-4 py-2 text-sm font-bold">Vehicle Details</div>
          <DualScrollTable tableClassName="overflow-auto max-h-64">
            <table className="w-full text-sm">
              <thead>
                <tr className="sticky top-0 z-10 bg-sky-100">
                  {['Vehicle No', 'Blankets', 'Pillows', 'Whites', 'Covers', 'Curtains', 'Total'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-bold text-sky-700">{h}</th>
                  ))}
                </tr>
              </thead>
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
          </DualScrollTable>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl overflow-hidden shadow-sm">
            <div
              className="flex justify-between items-center px-3 py-2 text-white text-sm font-bold"
              style={{ background: '#7b42ff' }}
            >
              <span>Debit Account</span>
              <span>₹{fmtAmt(debitEntries.reduce((s: number, e: any) => s + Number(e.amount || 0), 0))}</span>
            </div>
            <div className="p-2 border border-t-0 border-slate-200">
              {debitEntries.length === 0
                ? <p className="text-xs text-slate-400 text-center py-2">No debit entries</p>
                : debitEntries.map((e: any, i: number) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0 text-sm">
                    <span>{getLedgerName(e)}<LedgerGroupTag group={groupOf({ id: e.ledger_id, name: getLedgerName(e) })} /></span>
                    <span>₹{fmtAmt(Number(e.amount))}</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="rounded-xl overflow-hidden shadow-sm">
            <div
              className="flex justify-between items-center px-3 py-2 text-white text-sm font-bold"
              style={{ background: '#00b26f' }}
            >
              <span>Credit Account</span>
              <span>₹{fmtAmt(creditEntries.reduce((s: number, e: any) => s + Number(e.amount || 0), 0))}</span>
            </div>
            <div className="p-2 border border-t-0 border-slate-200">
              {creditEntries.length === 0
                ? <p className="text-xs text-slate-400 text-center py-2">No credit entries</p>
                : creditEntries.map((e: any, i: number) => (
                  <div key={i} className="flex justify-between py-1.5 border-b border-slate-100 last:border-0 text-sm">
                    <span>{getLedgerName(e)}<LedgerGroupTag group={groupOf({ id: e.ledger_id, name: getLedgerName(e) })} /></span>
                    <span>₹{fmtAmt(Number(e.amount))}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </ModalOverlay>
  )
}

// ─── Small icon button inside a dropdown trigger that re-hits the options API
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

// ─── Searchable ledger filter dropdown (portal-based) ──────────────────────
function LedgerSelectDropdown({ value, ledgers, onChange, onRefresh, refreshing }: {
  value: string
  ledgers: any[]
  onChange: (id: string) => void
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
    setOpen(true); setSearch('')
  }
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const panel = document.getElementById('lw-ldg-panel')
      if (panel?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      setOpen(false); setSearch('')
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const filtered = ledgers.filter(l => `${l.temple_name ?? l.ledger_name ?? ''} ${ledgerGroupName(l)}`.toLowerCase().includes(search.toLowerCase()))
  const groupOf = (l: any) => ledgerGroupName(l)
  const selected = ledgers.find(l => String(l.id) === String(value))
  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUpward = rect ? spaceBelow < PANEL_MAX_H + 8 : false

  const panel = open && rect && createPortal(
    <div id="lw-ldg-panel" style={{
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
        <li onMouseDown={() => { onChange(''); setOpen(false) }}
          className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${!value ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-400 hover:bg-slate-50'}`}>
          All Ledgers
        </li>
        {filtered.length === 0 && <li className="px-4 py-3 text-sm text-slate-400 text-center">No ledgers found</li>}
        {filtered.map(l => (
          <li key={l.id} onMouseDown={() => { onChange(String(l.id)); setOpen(false); setSearch('') }}
            className={`px-4 py-2 text-sm cursor-pointer transition-colors flex flex-col gap-0.5 ${
              String(value) === String(l.id) ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-800 hover:bg-slate-50'
            }`}>
            <span className="truncate">{l.temple_name || l.ledger_name}</span>
            {groupOf(l) && (
              <span className={`text-[10px] font-medium truncate ${String(value) === String(l.id) ? 'text-blue-500' : 'text-slate-400'}`}>
                {groupOf(l)}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>, document.body
  )

  return (
    <div className="w-56">
      <button ref={btnRef} type="button" onClick={openDropdown}
        className="flex min-h-10 w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30">
        <span className="flex flex-col items-start min-w-0 flex-1 text-left">
          <span className={selected ? 'text-slate-900 font-medium truncate w-full' : 'text-slate-400 truncate w-full'}>
            {selected ? (selected.temple_name || selected.ledger_name) : 'All Ledgers'}
          </span>
          {selected && groupOf(selected) && (
            <span className="text-[10px] font-medium text-slate-400 truncate w-full">{groupOf(selected)}</span>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
const today = todayISO()
const currentFY = getCurrentFY()

export default function LedgerWisePage() {
  const selectedFY = useFYStore(s => s.selectedFY)
  const fyMin = selectedFY.fromDate
  const fyMax = selectedFY.startYear === currentFY.startYear ? today : selectedFY.toDate
  const location = useLocation()
  const inboundLedgerId = (location.state as any)?.ledgerId as number | undefined
  const autoApplied = useRef(false)

  const [filter, setFilter] = useState({
    ledger_id: inboundLedgerId ? String(inboundLedgerId) : '',
    fromdate: selectedFY.fromDate,
    todate: selectedFY.toDate,
  })
  const [applied, setApplied] = useState<typeof filter | null>(null)

  // Selecting a financial year snaps the range to that year's full span and,
  // if a search is already showing, re-runs it immediately — otherwise the FY
  // tabs look like they do nothing once a ledger's been searched.
  useEffect(() => {
    setFilter(f => ({ ...f, fromdate: fyMin, todate: fyMax }))
    setApplied(a => a ? { ...a, fromdate: fyMin, todate: fyMax } : a)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fyMin, fyMax])
  const [modal, setModal] = useState<{ open: boolean; entry: any; data: any; loading: boolean }>({
    open: false, entry: null, data: null, loading: false,
  })

  const { data: ledgersRes, isFetching: ledgersFetching, refetch: refetchLedgers } = useQuery({
    queryKey: ['ledger-names'],
    queryFn: () => accountingService.getLedgerName(),
  })

  const { data: searchRes, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['ledger-wise', applied],
    queryFn: () => accountingService.getSearchData({
      fromdate: applied!.fromdate,
      todate: applied!.todate,
      ledger_id: applied!.ledger_id || null,
      ledger_name: '',
      user_id: localStorage.getItem('user_id'),
    }),
    enabled: !!applied,
  })

  const ledgerList: any[] = ledgersRes?.data ?? []
  const raw = searchRes?.data

  const voucherCNum = modal.open && !modal.loading && modal.data &&
    !['fuelentry_subt', 'laundrybill_subt'].includes(modal.data.source_table)
    ? (modal.data.c_number || modal.entry?.c_number || null) : null

  const { data: auditRes } = useQuery({
    queryKey: ['ledger-voucher-audit', voucherCNum],
    queryFn: () => accountingService.getVoucherAudit(voucherCNum!),
    enabled: !!voucherCNum,
  })
  const auditTrail: any[] = auditRes?.data ?? []

  // Auto-apply filter when navigated from P&L with a ledger pre-selected
  useEffect(() => {
    if (!inboundLedgerId || ledgerList.length === 0 || autoApplied.current) return
    autoApplied.current = true
    setApplied({ ledger_id: String(inboundLedgerId), fromdate: filter.fromdate, todate: filter.todate })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerList.length])

  const openingBalance = useMemo(() => {
    if (!raw?.opening_balance || !applied?.fromdate) return 0
    const ob = raw.opening_balance
    if (ob.type === 'Debit') return Math.abs(Number(ob.amount))
    if (ob.type === 'Credit') return -Math.abs(Number(ob.amount))
    return 0
  }, [raw, applied])

  const showOB = !!raw?.opening_balance && !!applied?.fromdate

  const transactions = useMemo(() => {
    if (!raw?.transactions) return []
    const tx = raw.transactions
    const all = [
      ...(tx.expensive_details ?? []),
      ...(tx.mainvoucher_subt ?? []),
      ...(tx.fuelentry_subt ?? []),
      ...(tx.laundrybill_subt ?? []),
    ].map(r => ({ ...r, amount: Math.abs(Number(r.amount ?? 0)) }))
    return all.sort((a, b) => resolveDate(a).getTime() - resolveDate(b).getTime())
  }, [raw])

  const { rows, closingBalance } = useMemo(() => {
    let running = openingBalance
    const rows = transactions.map(tx => {
      const amount = Math.abs(Number(tx.amount ?? 0))
      const isDebit = tx.amount_type === 'Debit Account' || tx.account_type === 'Debit Account'
      const isCredit = tx.amount_type === 'Credit Account' || tx.account_type === 'Credit Account'
      if (isDebit) running += amount
      else if (isCredit) running -= amount
      return { ...tx, debit: isDebit ? amount : 0, credit: isCredit ? amount : 0, runningBalance: running }
    })
    return { rows, closingBalance: running }
  }, [transactions, openingBalance])

  const txDebit = rows.reduce((s, r) => s + r.debit, 0)
  const txCredit = rows.reduce((s, r) => s + r.credit, 0)
  const debitCount = rows.filter(r => r.debit > 0).length
  const creditCount = rows.filter(r => r.credit > 0).length
  const totalDebit = txDebit
  const totalCredit = txCredit
  const grandDebit = (openingBalance > 0 ? openingBalance : 0) + txDebit + (closingBalance < 0 ? Math.abs(closingBalance) : 0)
  const grandCredit = (openingBalance < 0 ? Math.abs(openingBalance) : 0) + txCredit + (closingBalance > 0 ? closingBalance : 0)

  const selectedLedger = ledgerList.find(l => String(l.id) === String(applied?.ledger_id))
  // Always carry the applied date range into the title — it previously only
  // showed up when no specific ledger was selected, so a single-ledger export
  // had no from/to date in its filename.
  let reportTitle = 'Ledger Wise Report'
  if (applied) {
    const range = `${fmt(applied.fromdate)} to ${fmt(applied.todate)}`
    reportTitle = selectedLedger
      ? `${selectedLedger.temple_name || selectedLedger.ledger_name} Ledger Report (${range})`
      : `Transactions ${range}`
  }

  // Export filename — built from raw ISO dates and a collapsed-underscore
  // ledger name rather than munging reportTitle's "(dd/mm/yyyy to dd/mm/yyyy)"
  // through a single-char replace, which left double/triple underscores.
  const fileBaseName = (() => {
    const ledgerPart = (selectedLedger ? (selectedLedger.temple_name || selectedLedger.ledger_name) : 'AllLedgers')
      .replace(/[^a-z0-9]+/gi, '_')
    const range = applied ? `${fmtFileDate(applied.fromdate)}_to_${fmtFileDate(applied.todate)}` : 'AllDates'
    return `LedgerWise_${ledgerPart}_${range}`
  })()

  const handleSearch = () => setApplied({ ...filter })
  const handleClear = () => {
    setFilter({ ledger_id: '', fromdate: selectedFY.fromDate, todate: selectedFY.toDate })
    setApplied(null)
  }

  const openRef = useCallback(async (entry: any) => {
    setModal({ open: true, entry, data: null, loading: true })
    try {
      const res = await accountingService.getRefDetails({
        c_number: entry.c_number,
        source_table: entry.source_table,
        user_id: localStorage.getItem('user_id'),
      })
      if (res?.data?.success && res.data.all_entries?.length) {
        setModal(m => ({ ...m, data: res.data, loading: false }))
      } else {
        setModal(m => ({ ...m, loading: false }))
      }
    } catch {
      setModal(m => ({ ...m, loading: false }))
    }
  }, [])

  const closeModal = () => setModal({ open: false, entry: null, data: null, loading: false })

  // ─── Optional columns ──────────────────────────────────────────────────────
  // Trip Date, Quantity and Rate, ticked on and off above the table the way
  // Voucher Approvals' "Show columns" works; all three start visible.
  const [extraCols, setExtraCols] = useState<Set<string>>(new Set(REPORT_EXTRA_COLS))
  const showCol = (c: string) => extraCols.has(c)
  const extraCount = extraCols.size

  // ─── Column filters ────────────────────────────────────────────────────────
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({})
  const activeFilterCount = Object.values(colFilters).filter(v => v && v.length > 0).length

  const FILTER_KEYS = ['c_number', 'date', 'vouchertype', 'opp_ledgers', 'valueDate', 'vehicleNo', 'tripDate', 'quantity', 'rate', 'name', 'description', 'debitAmount', 'creditAmount'] as const

  const colValue = useCallback((row: any, key: string): string => {
    switch (key) {
      case 'c_number': return row.c_number || '-'
      case 'date': return fmt(resolveDisplayDate(row))
      case 'vouchertype': return row.vouchertype || 'N/A'
      case 'opp_ledgers': return row.opp_ledgers || 'N/A'
      case 'valueDate': return fmt(row.valueDate)
      case 'vehicleNo': return (row.vehicleNo || row.bus_no) || '-'
      case 'tripDate': return row.trip_date ? fmt(row.trip_date) : '-'
      case 'quantity': return reportQuantity(row) || '-'
      case 'rate': return reportRate(row) || '-'
      case 'name': return row.name || '-'
      case 'description': return row.description || '-'
      case 'debitAmount': return row.debit > 0 ? fmtAmt(row.debit) : '-'
      case 'creditAmount': return row.credit > 0 ? fmtAmt(row.credit) : '-'
      default: return ''
    }
  }, [])

  const filterColOptions = useMemo(() => {
    const result: Record<string, string[]> = {}
    FILTER_KEYS.forEach(key => {
      result[key] = Array.from(new Set(rows.map(r => colValue(r, key)))).sort()
    })
    return result
  }, [rows, colValue])

  const displayRows = useMemo(() => {
    if (!activeFilterCount) return rows
    return rows.filter(row => {
      for (const [key, vals] of Object.entries(colFilters)) {
        if (!vals || vals.length === 0) continue
        if (!vals.includes(colValue(row, key))) return false
      }
      return true
    })
  }, [rows, colFilters, activeFilterCount, colValue])

  // The Total row on screen and in both downloads sums the rows shown - the
  // column filters applied - and the downloads carry only those rows. Opening,
  // Closing and Grand Total stay the ledger's own figures for the period.
  const shownDebit = displayRows.reduce((s, r) => s + r.debit, 0)
  const shownCredit = displayRows.reduce((s, r) => s + r.credit, 0)

  // Opp-Ledger is a comma-joined string of names (possibly several) — map each
  // back to its parent group via the ledger master list for the exports.
  const nameToGroup = useMemo(() => {
    const m = new Map<string, string>()
    ledgerList.forEach(l => { if (l.temple_name) m.set(String(l.temple_name).trim().toLowerCase(), ledgerGroupName(l)) })
    return m
  }, [ledgerList])

  const oppLedgerGroup = useCallback((oppLedgers: string): string => {
    if (!oppLedgers) return ''
    const names = oppLedgers.split(',').map((s: string) => s.trim()).filter(Boolean)
    const groups = [...new Set(names.map(n => nameToGroup.get(n.toLowerCase()) || '').filter(Boolean))]
    return groups.join(' / ')
  }, [nameToGroup])

  const downloadDate = () => fmtFileDate(new Date())

  // ─── Excel Export ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    // The ticked optional columns go out too, after Vehicle No. as on screen.
    const extras = REPORT_EXTRA_COLS.filter(showCol)
    const pad = extras.map(() => '')
    const extraValues = (r: any) => extras.map((c) => c === 'Trip Date' ? (r.trip_date ? fmt(r.trip_date) : '-') : c === 'Quantity' ? (reportQuantity(r) || '-') : (reportRate(r) || '-'))
    const data: any[][] = [
      ['Sl No.', 'Ref No.', 'Date', 'Voucher', 'Opp-Ledger', 'Group', 'Value Date', 'Vehicle No.', ...extras, 'Name', 'Description', 'Dr Amount', 'Cr Amount', 'R Balance'],
    ]
    if (showOB) {
      data.push(['', '', '', '', 'Opening Balance', '', '', '', ...pad, '', '',
        openingBalance >= 0 ? openingBalance : 0,
        openingBalance < 0 ? Math.abs(openingBalance) : 0,
        balStr(openingBalance),
      ])
    }
    displayRows.forEach((r, i) => {
      data.push([
        i + 1, r.c_number || '-', fmt(resolveDisplayDate(r)), r.vouchertype || 'N/A',
        r.opp_ledgers || 'N/A', oppLedgerGroup(r.opp_ledgers), fmt(r.valueDate), (r.vehicleNo || r.bus_no) || '-',
        ...extraValues(r),
        r.name || '-', r.description || '-',
        r.debit, r.credit, balStr(r.runningBalance ?? 0),
      ])
    })
    data.push(['', '', '', '', 'Total', '', '', '', ...pad, '', '', shownDebit, shownCredit, ''])
    data.push(['', '', '', '', 'Closing Balance', '', '', '', ...pad, '', '',
      closingBalance < 0 ? Math.abs(closingBalance) : 0,
      closingBalance >= 0 ? closingBalance : 0,
      balStr(closingBalance),
    ])
    data.push(['', '', '', '', 'Grand Total', '', '', '', ...pad, '', '', grandDebit, grandCredit, ''])

    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = data[0].map((_: any, ci: number) => ({
      wch: Math.max(...data.map(r => String(r[ci] ?? '').length)) + 2,
    }))
    // Dr/Cr Amount columns (10, 11) hold real numbers — format them so Excel
    // treats them as numeric (right-aligned, summable via the status bar).
    for (let r = 1; r < data.length; r++) {
      for (const c of [10 + extras.length, 11 + extras.length]) {
        const cellRef = XLSX.utils.encode_cell({ r, c })
        const cell = ws[cellRef]
        if (cell && typeof cell.v === 'number') cell.z = '#,##0.00'
      }
    }
    const wb: XLSX.WorkBook = { Sheets: { Report: ws }, SheetNames: ['Report'] }
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileBaseName}_${downloadDate()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── PDF Export ────────────────────────────────────────────────────────────
  // Width the main table is balanced to (see columnStyles below) — reused to
  // compute a left/right margin that centers both the summary cards and the
  // table itself on the page instead of hugging the left edge.
  const TABLE_WIDTH_MM = 257

  const exportPDF = () => {
    const doc = new jsPDF('landscape')
    const pageWidth = doc.internal.pageSize.getWidth()
    const marginX = Math.max((pageWidth - TABLE_WIDTH_MM) / 2, 14)

    // App name + report title, both centered at the top of the page
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Samanvi Travels', pageWidth / 2, 14, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(reportTitle, pageWidth / 2, 21, { align: 'center' })

    // Summary cards — mirrors the Opening/Debit/Credit/Closing strip shown
    // above the table on screen, rendered as one centered row of cells.
    const cardStyle = (fill: [number, number, number], text: [number, number, number]) => ({
      fillColor: fill, textColor: text, halign: 'center' as const, fontStyle: 'bold' as const, fontSize: 9,
    })
    autoTable(doc, {
      startY: 26,
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      tableWidth: TABLE_WIDTH_MM,
      body: [[
        { content: `Opening Balance\n${showOB ? balStr(openingBalance) : '-'}`, styles: cardStyle([224, 242, 254], [3, 105, 161]) },
        { content: `Total Debit\n${fmtN(txDebit)} (${debitCount})`, styles: cardStyle([254, 226, 226], [185, 28, 28]) },
        { content: `Total Credit\n${fmtN(txCredit)} (${creditCount})`, styles: cardStyle([209, 250, 229], [4, 120, 87]) },
        { content: `Closing Balance\n${balStr(closingBalance)}`, styles: cardStyle([254, 243, 199], [180, 83, 9]) },
      ]],
      styles: { cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.2 },
      columnStyles: { 0: { cellWidth: TABLE_WIDTH_MM / 4 }, 1: { cellWidth: TABLE_WIDTH_MM / 4 }, 2: { cellWidth: TABLE_WIDTH_MM / 4 }, 3: { cellWidth: TABLE_WIDTH_MM / 4 } },
    })
    const cardsEndY = (doc as any).lastAutoTable.finalY + 6

    // jspdf-autotable's columnStyles only apply to the body section, so header
    // cells need their alignment set explicitly to match each column's data.
    const colAlign = ['center', 'center', 'center', 'center', 'left', 'center', 'center', 'center', 'left', 'right', 'right', 'right'] as const
    const headers = ['Sl No.', 'Ref No.', 'Date', 'Voucher', 'Opp-Ledger', 'Value Date', 'Vehicle No.', 'Name', 'Description', 'Dr Amount', 'Cr Amount', 'R Balance']
      .map((h, i) => ({ content: h, styles: { halign: colAlign[i] } }))
    const body: any[] = []

    if (showOB) {
      body.push(['', '', '', '',
        { content: 'Opening Balance', styles: { fontStyle: 'bold', halign: 'right' } },
        '', '', '', '',
        { content: openingBalance >= 0 ? fmtN(openingBalance) : '0.00', styles: { halign: 'right' } },
        { content: openingBalance < 0 ? fmtN(Math.abs(openingBalance)) : '0.00', styles: { halign: 'right' } },
        { content: balStr(openingBalance), styles: { halign: 'right' } },
      ])
    }

    displayRows.forEach((r, i) => {
      body.push([
        String(i + 1), r.c_number || '-', fmtShort(resolveDisplayDate(r)), r.vouchertype || 'N/A',
        r.opp_ledgers || 'N/A', fmtShort(r.valueDate), (r.vehicleNo || r.bus_no) || '-',
        r.name || '-', r.description || '-',
        { content: fmtN(r.debit), styles: { halign: 'right' } },
        { content: fmtN(r.credit), styles: { halign: 'right' } },
        { content: balStr(r.runningBalance ?? 0), styles: { halign: 'right' } },
      ])
    })

    body.push(['', '', '', '',
      { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } }, '', '', '', '',
      { content: fmtN(shownDebit), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmtN(shownCredit), styles: { fontStyle: 'bold', halign: 'right' } }, '',
    ])
    body.push(['', '', '', '',
      { content: 'Closing Balance', styles: { fontStyle: 'bold', halign: 'right' } }, '', '', '', '',
      { content: closingBalance < 0 ? fmtN(Math.abs(closingBalance)) : '0.00', styles: { halign: 'right' } },
      { content: closingBalance >= 0 ? fmtN(closingBalance) : '0.00', styles: { halign: 'right' } },
      { content: balStr(closingBalance), styles: { halign: 'right' } },
    ])
    body.push(['', '', '', '',
      { content: 'Grand Total', styles: { fontStyle: 'bold', halign: 'right' } }, '', '', '', '',
      { content: fmtN(grandDebit), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmtN(grandCredit), styles: { fontStyle: 'bold', halign: 'right' } }, '',
    ])

    autoTable(doc, {
      head: [headers], body, startY: cardsEndY, theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 7, cellPadding: 2 },
      margin: { left: marginX, right: marginX },
      tableWidth: TABLE_WIDTH_MM,
      columnStyles: {
        // Widths sum to ~257mm (TABLE_WIDTH_MM) — margin above centers that
        // on the page instead of the table hugging the left edge. The Group
        // column's freed width went to Opp-Ledger.
        0: { cellWidth: 8, halign: 'center' },  1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 17, halign: 'center' }, 3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 46, halign: 'left' },   5: { cellWidth: 17, halign: 'center' },
        6: { cellWidth: 16, halign: 'center' }, 7: { cellWidth: 18, halign: 'center' },
        8: { cellWidth: 34, halign: 'left' },   9: { cellWidth: 22, halign: 'right' },
        10: { cellWidth: 22, halign: 'right' }, 11: { cellWidth: 26, halign: 'right' },
      },
    })
    doc.save(`${fileBaseName}_${downloadDate()}.pdf`)
  }

  // ─── Table helpers ─────────────────────────────────────────────────────────
  const TH = ({ children, cls = '', filterKey }: { children: React.ReactNode; cls?: string; filterKey?: string }) => (
    <th className={`sticky top-0 z-10 px-3 py-2.5 text-left text-xs font-bold text-white whitespace-nowrap bg-blue-700 border-r border-blue-600 ${cls}`}>
      {/* text-align on the <th> doesn't affect this flex row's own layout —
          justify-end is needed too so the label+filter icon actually sit on
          the same side as the right-aligned amount cells below */}
      <div className={`flex items-center gap-1.5 ${cls.includes('text-right') ? 'justify-end' : ''}`}>
        <span>{children}</span>
        {filterKey && (
          <ColumnFilterDropdown
            variant="light"
            options={filterColOptions[filterKey] ?? []}
            selected={colFilters[filterKey] ?? []}
            onChange={vals => setColFilters(f => ({ ...f, [filterKey]: vals }))}
          />
        )}
      </div>
    </th>
  )

  const SummaryRow = ({ label, dr, cr, bal }: { label: string; dr?: number; cr?: number; bal?: number }) => (
    <tr className="bg-blue-50 border-t-2 border-blue-200 font-bold">
      <td colSpan={9 + extraCount} className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wide">{label}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-red-700">{dr != null ? fmtAmt(dr) : ''}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{cr != null ? fmtAmt(cr) : ''}</td>
      <td className={`px-3 py-2.5 text-right tabular-nums ${bal != null ? obCbCls(bal) : ''}`}>
        {bal != null ? balStr(bal) : ''}
      </td>
    </tr>
  )

  const GrandRow = ({ label, dr, cr }: { label: string; dr: number; cr: number }) => (
    <tr className="bg-amber-50 border-t-2 border-amber-300 font-bold">
      <td colSpan={9 + extraCount} className="px-3 py-2.5 text-right text-xs font-bold text-amber-800 uppercase tracking-wide">{label}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-red-700">{fmtAmt(dr)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{fmtAmt(cr)}</td>
      <td />
    </tr>
  )

  // Opening/Debit/Credit/Closing cards — shown above the table, and repeated
  // below it so the totals stay visible without scrolling back up.
  const SummaryStrip = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wide text-sky-600 mb-1">Opening Balance</p>
        <p className={`text-base font-bold ${obCbCls(openingBalance)}`}>{showOB ? balStr(openingBalance) : '—'}</p>
      </div>
      <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wide text-red-600 mb-1">Total Debit</p>
        <p className="text-base font-bold text-red-700">₹{fmtAmt(txDebit)}</p>
        <p className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-full mt-1.5">
          {debitCount} {debitCount === 1 ? 'entry' : 'entries'}
        </p>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 mb-1">Total Credit</p>
        <p className="text-base font-bold text-emerald-700">₹{fmtAmt(txCredit)}</p>
        <p className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full mt-1.5">
          {creditCount} {creditCount === 1 ? 'entry' : 'entries'}
        </p>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
        <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600 mb-1">Closing Balance</p>
        <p className={`text-base font-bold ${obCbCls(closingBalance)}`}>{balStr(closingBalance)}</p>
      </div>
    </div>
  )

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Ledger Wise" subtitle="Voucher-level transaction history per ledger account" />

      {/* Filter bar */}
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-teal-500 to-blue-500">
        <FYSelector className="mb-4 pb-4 border-b border-slate-100" />
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <Label>
              Ledger Name{' '}
              <span className="text-slate-400 font-normal text-xs">(Optional)</span>
            </Label>
            <LedgerSelectDropdown
              value={filter.ledger_id}
              ledgers={ledgerList}
              onChange={id => setFilter(f => ({ ...f, ledger_id: id }))}
              onRefresh={() => refetchLedgers()}
              refreshing={ledgersFetching}
            />
          </div>
          <div>
            <Label>From Date</Label>
            <Input
              type="date" min={fyMin} max={fyMax}
              value={filter.fromdate}
              onChange={e => setFilter(f => ({ ...f, fromdate: e.target.value }))}
            />
          </div>
          <div>
            <Label>To Date</Label>
            <Input
              type="date" min={fyMin} max={fyMax}
              value={filter.todate}
              onChange={e => setFilter(f => ({ ...f, todate: e.target.value }))}
            />
          </div>
          <Button onClick={handleSearch} disabled={isLoading}>
            <Search className="w-4 h-4" />
            {isLoading ? 'Loading…' : 'Search'}
          </Button>
          {applied && (
            <Button variant="outline" onClick={handleClear}>
              <X className="w-4 h-4" /> Clear
            </Button>
          )}
          {applied && (
            <Button onClick={() => refetch()} disabled={isFetching} className="bg-slate-600 hover:bg-slate-700">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Report title + export + filter buttons */}
      {!isLoading && applied && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-bold text-slate-700">{reportTitle}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active · {displayRows.length} of {rows.length} rows
                  <button onClick={() => setColFilters({})} className="text-blue-600 font-semibold hover:underline">Clear all</button>
                </span>
              )}
              <ExportMenu onExport={(f) => f === 'excel' ? exportExcel() : exportPDF()} />
            </div>
          </div>

          <ReportColumnPicker options={REPORT_EXTRA_COLS} visible={extraCols} onToggle={(c) => setExtraCols((v) => toggleInSet(v, c))} />

          {/* Summary strip */}
          <SummaryStrip />
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : !applied ? (
        <GlassCard className="p-10 text-center text-slate-400 text-sm">
          <BookMarked className="w-8 h-8 mx-auto mb-2 opacity-30" />
          Select a date range and click Search to view transactions.
        </GlassCard>
      ) : (
        <>
        <GlassCard className="overflow-hidden">
          <DualScrollTable tableClassName="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <TH>Sl No.</TH>
                  <TH filterKey="c_number">Ref No.</TH>
                  <TH filterKey="date">Date</TH>
                  <TH filterKey="vouchertype">Voucher Type</TH>
                  <TH filterKey="opp_ledgers">Opp-Ledger</TH>
                  <TH filterKey="valueDate">Value Date</TH>
                  <TH filterKey="vehicleNo">Vehicle No.</TH>
                  {showCol('Trip Date') && <TH filterKey="tripDate">Trip Date</TH>}
                  {showCol('Quantity') && <TH cls="text-right" filterKey="quantity">Quantity</TH>}
                  {showCol('Rate') && <TH cls="text-right" filterKey="rate">Rate</TH>}
                  <TH filterKey="name">Name</TH>
                  <TH filterKey="description">Description</TH>
                  <TH cls="text-right" filterKey="debitAmount">Dr Amount</TH>
                  <TH cls="text-right" filterKey="creditAmount">Cr Amount</TH>
                  <TH cls="text-right">R Balance</TH>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance */}
                {showOB && (
                  <tr className="bg-sky-50 border-b border-sky-200">
                    <td colSpan={9 + extraCount} className="px-3 py-2 text-right text-xs font-bold text-sky-700">
                      Opening Balance —{' '}
                      <span className={obCbCls(openingBalance)}>{balStr(openingBalance)}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400 font-medium">—</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400 font-medium">—</td>
                    <td className={`px-3 py-2 text-right tabular-nums font-bold ${obCbCls(openingBalance)}`}>
                      {balStr(openingBalance)}
                    </td>
                  </tr>
                )}

                {/* Empty state — keep the table (with headers) on screen instead
                    of swapping the whole card out for a blank message */}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={12 + extraCount} className="px-3 py-10 text-center text-slate-400 text-sm">
                      No transactions found for the selected criteria.
                    </td>
                  </tr>
                ) : displayRows.length === 0 ? (
                  <tr>
                    <td colSpan={12 + extraCount} className="px-3 py-10 text-center text-slate-400 text-sm">
                      No rows match the active filters.
                    </td>
                  </tr>
                ) : null}

                {/* Transaction rows — tinted red/emerald to match the Debit/Credit
                    counts shown in the summary strip above */}
                {displayRows.map((row, idx) => {
                  const isDebit = row.debit > 0
                  const isCredit = row.credit > 0
                  return (
                  <tr
                    key={idx}
                    className={`${
                      isDebit ? 'bg-red-50/50' : isCredit ? 'bg-emerald-50/50' : (idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60')
                    } hover:bg-blue-50/50 transition-colors`}
                  >
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-500 text-center">{idx + 1}</td>
                    <td className="px-3 py-2 border-b border-slate-100 whitespace-nowrap">
                      <button
                        onClick={() => openRef(row)}
                        className="inline-flex items-center gap-1 text-blue-600 font-bold hover:text-blue-800 hover:underline"
                        title="Click to view details"
                      >
                        {row.c_number || '-'}
                        <ExternalLink className="w-3 h-3 opacity-60" />
                      </button>
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">
                      {fmt(resolveDisplayDate(row))}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-700 whitespace-nowrap">
                      {row.vouchertype || 'N/A'}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-700 max-w-[220px] truncate" title={row.opp_ledgers || 'N/A'}>
                      {row.opp_ledgers || 'N/A'}<LedgerGroupTag group={oppLedgerGroup(row.opp_ledgers)} />
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">
                      {fmt(row.valueDate)}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">
                      {(row.vehicleNo || row.bus_no) || '-'}
                    </td>
                    {showCol('Trip Date') && (
                      <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">{row.trip_date ? fmt(row.trip_date) : '-'}</td>
                    )}
                    {showCol('Quantity') && (
                      <td className="px-3 py-2 border-b border-slate-100 text-slate-600 text-right tabular-nums whitespace-nowrap">{reportQuantity(row) || '-'}</td>
                    )}
                    {showCol('Rate') && (
                      <td className="px-3 py-2 border-b border-slate-100 text-slate-600 text-right tabular-nums whitespace-nowrap">{reportRate(row) || '-'}</td>
                    )}
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap" title={row.name || '-'}>
                      {row.name || '-'}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-500 max-w-[200px] truncate" title={row.description || '-'}>
                      {row.description || '-'}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-right tabular-nums font-medium text-red-600 whitespace-nowrap">
                      {fmtAmt(row.debit)}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-right tabular-nums font-medium text-emerald-600 whitespace-nowrap">
                      {fmtAmt(row.credit)}
                    </td>
                    <td className={`px-3 py-2 border-b border-slate-100 text-right tabular-nums font-bold whitespace-nowrap ${balCls(row.runningBalance ?? 0)}`}>
                      {balStr(row.runningBalance ?? 0)}
                    </td>
                  </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <SummaryRow label={displayRows.length !== rows.length ? `Total (${displayRows.length} of ${rows.length} rows)` : 'Total'} dr={shownDebit} cr={shownCredit} />
                <SummaryRow
                  label="Closing Balance"
                  dr={closingBalance < 0 ? Math.abs(closingBalance) : 0}
                  cr={closingBalance >= 0 ? closingBalance : 0}
                  bal={closingBalance}
                />
                <GrandRow label="Grand Total" dr={grandDebit} cr={grandCredit} />
              </tfoot>
            </table>
          </DualScrollTable>
        </GlassCard>

        {/* Summary strip repeated below the table */}
        <SummaryStrip />
        </>
      )}

      {/* Ref No. Modals */}
      <AnimatePresence>
        {modal.open && modal.loading && (
          <ModalOverlay key="loading-modal" onClose={closeModal}>
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-slate-500">Loading details…</p>
            </div>
          </ModalOverlay>
        )}
        {modal.open && !modal.loading && !modal.data && (
          <ModalOverlay key="nodata-modal" onClose={closeModal}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">{modal.entry?.c_number || 'Details'}</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 text-center text-slate-400 text-sm">
              No details found for this reference.
            </div>
          </ModalOverlay>
        )}
        {modal.open && !modal.loading && modal.data?.source_table === 'laundrybill_subt' && (
          <LaundryModal
            key="laundry-modal"
            data={modal.data}
            refNo={modal.data.c_number || modal.entry?.c_number || ''}
            onClose={closeModal}
          />
        )}
        {modal.open && !modal.loading && modal.data?.source_table === 'fuelentry_subt' && (
          <FuelModal
            key="fuel-modal"
            data={modal.data}
            refNo={modal.data.c_number || modal.entry?.c_number || ''}
            onClose={closeModal}
          />
        )}
        {modal.open && !modal.loading && modal.data &&
          !['laundrybill_subt', 'fuelentry_subt'].includes(modal.data.source_table) && (
          <VoucherModal
            key="voucher-modal"
            data={modal.data}
            refNo={modal.data.c_number || modal.entry?.c_number || ''}
            onClose={closeModal}
            auditTrail={auditTrail}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
