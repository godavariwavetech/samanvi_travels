import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { BookMarked, Search, X, FileSpreadsheet, FileText, ExternalLink, CreditCard, BookOpen, History, Filter, ChevronDown } from 'lucide-react'
import ActivityHistory from '@/components/shared/ActivityHistory'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { GlassCard, Button, Input, Select, Label, PageHeader } from '@/components/shared'
import { accountingService } from '@/services/accounting.service'
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

function fmtN(n: number): string { return n.toFixed(2) }

function balStr(b: number): string {
  return b >= 0 ? `${fmtN(b)} Dr` : `${fmtN(Math.abs(b))} Cr`
}

function balCls(b: number): string {
  return b >= 0 ? 'text-slate-700' : 'text-red-500'
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
              {debitRows.map((r: any, i: number) => (
                <tr key={`dr-${i}`} className="hover:bg-red-50/30">
                  <td className="px-4 py-2.5 text-xs text-slate-400">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{getLedgerName(r)}</span>
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
                      <span className="font-semibold text-slate-800">{getLedgerName(r)}</span>
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
                        <span className="font-semibold text-slate-800 text-sm truncate">{getLedgerName(r)}</span>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sky-100">
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
          </div>
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
                    <span>{getLedgerName(e)}</span>
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
                    <span>{getLedgerName(e)}</span>
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

// ─── Main Page ────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0]

export default function LedgerWisePage() {
  const selectedFY = useFYStore(s => s.selectedFY)
  const location = useLocation()
  const inboundLedgerId = (location.state as any)?.ledgerId as number | undefined
  const autoApplied = useRef(false)

  const [filter, setFilter] = useState({
    ledger_id: inboundLedgerId ? String(inboundLedgerId) : '',
    fromdate: selectedFY.fromDate,
    todate: selectedFY.toDate,
  })
  const [applied, setApplied] = useState<typeof filter | null>(null)
  const [modal, setModal] = useState<{ open: boolean; entry: any; data: any; loading: boolean }>({
    open: false, entry: null, data: null, loading: false,
  })

  const { data: ledgersRes } = useQuery({
    queryKey: ['ledger-names'],
    queryFn: () => accountingService.getLedgerName(),
  })

  const { data: searchRes, isLoading } = useQuery({
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
  const totalDebit = txDebit
  const totalCredit = txCredit
  const grandDebit = (openingBalance > 0 ? openingBalance : 0) + txDebit + (closingBalance < 0 ? Math.abs(closingBalance) : 0)
  const grandCredit = (openingBalance < 0 ? Math.abs(openingBalance) : 0) + txCredit + (closingBalance > 0 ? closingBalance : 0)

  const selectedLedger = ledgerList.find(l => String(l.id) === String(applied?.ledger_id))
  const reportTitle = selectedLedger
    ? `${selectedLedger.temple_name || selectedLedger.ledger_name} Ledger Report`
    : applied
    ? `Transactions ${applied.fromdate} to ${applied.todate}`
    : 'Ledger Wise Report'

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

  // ─── Column filters ────────────────────────────────────────────────────────
  const [colFilters, setColFilters] = useState<Record<string, string>>({})
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const activeFilterCount = Object.values(colFilters).filter(Boolean).length

  const voucherTypeOpts = useMemo(() =>
    [...new Set(rows.map(r => r.vouchertype).filter(Boolean))].map(v => ({ label: String(v), value: String(v) }))
  , [rows])

  const vehicleOpts = useMemo(() =>
    [...new Set(rows.map(r => (r.vehicleNo || r.bus_no)).filter(Boolean))].map(v => ({ label: String(v), value: String(v) }))
  , [rows])

  const displayRows = useMemo(() => {
    if (!activeFilterCount) return rows
    return rows.filter(row => {
      for (const [key, val] of Object.entries(colFilters)) {
        if (!val) continue
        switch (key) {
          case 'c_number':
            if (!String(row.c_number || '').toLowerCase().includes(val.toLowerCase())) return false
            break
          case 'date': {
            const d = resolveDisplayDate(row)
            if (d && !String(d).startsWith(val)) return false
            break
          }
          case 'vouchertype':
            if (row.vouchertype !== val) return false
            break
          case 'opp_ledgers':
            if (!String(row.opp_ledgers || '').toLowerCase().includes(val.toLowerCase())) return false
            break
          case 'valueDate': {
            const vd = row.valueDate ? String(row.valueDate).split('T')[0] : ''
            if (!vd.startsWith(val)) return false
            break
          }
          case 'vehicleNo':
            if ((row.vehicleNo || row.bus_no) !== val) return false
            break
          case 'name':
            if (!String(row.name || '').toLowerCase().includes(val.toLowerCase())) return false
            break
          case 'description':
            if (!String(row.description || '').toLowerCase().includes(val.toLowerCase())) return false
            break
        }
      }
      return true
    })
  }, [rows, colFilters, activeFilterCount])

  // ─── Excel Export ──────────────────────────────────────────────────────────
  const exportExcel = () => {
    const data: any[][] = [
      ['Sl No.', 'Ref No.', 'Date', 'Voucher', 'Opp-Ledger', 'Value Date', 'Vehicle No.', 'Name', 'Description', 'Dr Amount', 'Cr Amount', 'R Balance'],
    ]
    if (showOB) {
      data.push(['', '', '', '', 'Opening Balance', '', '', '', '',
        openingBalance >= 0 ? fmtN(openingBalance) : '0.00',
        openingBalance < 0 ? fmtN(Math.abs(openingBalance)) : '0.00',
        balStr(openingBalance),
      ])
    }
    rows.forEach((r, i) => {
      data.push([
        i + 1, r.c_number || '-', fmt(resolveDisplayDate(r)), r.vouchertype || 'N/A',
        r.opp_ledgers || 'N/A', fmt(r.valueDate), (r.vehicleNo || r.bus_no) || '-',
        r.name || '-', r.description || '-',
        fmtN(r.debit), fmtN(r.credit), balStr(r.runningBalance ?? 0),
      ])
    })
    data.push(['', '', '', '', 'Total', '', '', '', '', fmtN(totalDebit), fmtN(totalCredit), ''])
    data.push(['', '', '', '', 'Closing Balance', '', '', '', '',
      closingBalance < 0 ? fmtN(Math.abs(closingBalance)) : '0.00',
      closingBalance >= 0 ? fmtN(closingBalance) : '0.00',
      balStr(closingBalance),
    ])
    data.push(['', '', '', '', 'Grand Total', '', '', '', '', fmtN(grandDebit), fmtN(grandCredit), ''])

    const ws = XLSX.utils.aoa_to_sheet(data)
    ws['!cols'] = data[0].map((_: any, ci: number) => ({
      wch: Math.max(...data.map(r => String(r[ci] ?? '').length)) + 2,
    }))
    const wb: XLSX.WorkBook = { Sheets: { Report: ws }, SheetNames: ['Report'] }
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─── PDF Export ────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF('landscape')
    doc.setFontSize(16)
    doc.text(reportTitle, 14, 15)

    const headers = ['Sl No.', 'Ref No.', 'Date', 'Voucher', 'Opp-Ledger', 'Value Date', 'Vehicle No.', 'Name', 'Description', 'Dr Amount', 'Cr Amount', 'R Balance']
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

    rows.forEach((r, i) => {
      body.push([
        String(i + 1), r.c_number || '-', fmt(resolveDisplayDate(r)), r.vouchertype || 'N/A',
        r.opp_ledgers || 'N/A', fmt(r.valueDate), (r.vehicleNo || r.bus_no) || '-',
        r.name || '-', r.description || '-',
        { content: fmtN(r.debit), styles: { halign: 'right' } },
        { content: fmtN(r.credit), styles: { halign: 'right' } },
        { content: balStr(r.runningBalance ?? 0), styles: { halign: 'right' } },
      ])
    })

    body.push(['', '', '', '',
      { content: 'Total', styles: { fontStyle: 'bold', halign: 'right' } }, '', '', '', '',
      { content: fmtN(totalDebit), styles: { fontStyle: 'bold', halign: 'right' } },
      { content: fmtN(totalCredit), styles: { fontStyle: 'bold', halign: 'right' } }, '',
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
      head: [headers], body, startY: 25, theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', halign: 'center' },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' }, 3: { cellWidth: 22, halign: 'center' },
        4: { cellWidth: 36, halign: 'left' },   5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 22, halign: 'center' }, 7: { cellWidth: 24, halign: 'center' },
        8: { cellWidth: 48, halign: 'left' },   9: { cellWidth: 22, halign: 'right' },
        10: { cellWidth: 22, halign: 'right' }, 11: { cellWidth: 26, halign: 'right' },
      },
    })
    doc.save(`${reportTitle.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`)
  }

  // ─── Table helpers ─────────────────────────────────────────────────────────
  const TH = ({ children, cls = '' }: { children: React.ReactNode; cls?: string }) => (
    <th className={`px-3 py-2.5 text-left text-xs font-bold text-white whitespace-nowrap bg-blue-700 border-r border-blue-600 ${cls}`}>
      {children}
    </th>
  )

  const SummaryRow = ({ label, dr, cr, bal }: { label: string; dr?: number; cr?: number; bal?: number }) => (
    <tr className="bg-blue-50 border-t-2 border-blue-200 font-bold">
      <td colSpan={9} className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 uppercase tracking-wide">{label}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-red-700">{dr != null ? fmtAmt(dr) : ''}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{cr != null ? fmtAmt(cr) : ''}</td>
      <td className={`px-3 py-2.5 text-right tabular-nums ${bal != null ? balCls(bal) : ''}`}>
        {bal != null ? balStr(bal) : ''}
      </td>
    </tr>
  )

  const GrandRow = ({ label, dr, cr }: { label: string; dr: number; cr: number }) => (
    <tr className="bg-amber-50 border-t-2 border-amber-300 font-bold">
      <td colSpan={9} className="px-3 py-2.5 text-right text-xs font-bold text-amber-800 uppercase tracking-wide">{label}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-red-700">{fmtAmt(dr)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{fmtAmt(cr)}</td>
      <td />
    </tr>
  )

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Ledger Wise" subtitle="Voucher-level transaction history per ledger account" />

      {/* Filter bar */}
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-teal-500 to-blue-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <Label>
              Ledger Name{' '}
              <span className="text-slate-400 font-normal text-xs">(Optional)</span>
            </Label>
            <Select
              value={filter.ledger_id}
              onChange={e => setFilter(f => ({ ...f, ledger_id: e.target.value }))}
              className="w-56"
            >
              <option value="">All Ledgers</option>
              {ledgerList.map(l => (
                <option key={l.id} value={l.id}>{l.temple_name || l.ledger_name}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>From Date</Label>
            <Input
              type="date" max={today}
              value={filter.fromdate}
              onChange={e => setFilter(f => ({ ...f, fromdate: e.target.value }))}
            />
          </div>
          <div>
            <Label>To Date</Label>
            <Input
              type="date" max={today}
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
        </div>
      </GlassCard>

      {/* Report title + export + filter buttons */}
      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-bold text-slate-700">{reportTitle}</h3>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterPanelOpen(o => !o)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${filterPanelOpen || activeFilterCount > 0 ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'}`}
              >
                <Filter className="w-3.5 h-3.5" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="ml-0.5 bg-white text-blue-600 text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none">{activeFilterCount}</span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 ml-0.5 transition-transform ${filterPanelOpen ? 'rotate-180' : ''}`} />
              </button>
              <Button variant="outline" onClick={exportExcel} className="border-emerald-300 text-emerald-700 hover:bg-emerald-50">
                <FileSpreadsheet className="w-4 h-4" /> Download Excel
              </Button>
              <Button variant="outline" onClick={exportPDF} className="border-red-300 text-red-700 hover:bg-red-50">
                <FileText className="w-4 h-4" /> Download PDF
              </Button>
            </div>
          </div>

          {/* Expandable filter panel */}
          <AnimatePresence>
            {filterPanelOpen && (
              <motion.div
                key="filter-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {/* Ref No */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Ref No.</label>
                      <div className="relative">
                        <input
                          type="text" placeholder="Search…" value={colFilters['c_number'] || ''}
                          onChange={e => setColFilters(f => ({ ...f, c_number: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-7"
                        />
                        {colFilters['c_number'] && (
                          <button onClick={() => setColFilters(f => ({ ...f, c_number: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Date */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Date</label>
                      <div className="relative">
                        <input
                          type="date" value={colFilters['date'] || ''}
                          onChange={e => setColFilters(f => ({ ...f, date: e.target.value }))}
                          onClick={e => (e.target as HTMLInputElement).showPicker?.()}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-7"
                        />
                        {colFilters['date'] && (
                          <button onClick={() => setColFilters(f => ({ ...f, date: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Voucher Type */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Voucher Type</label>
                      <div className="relative">
                        <select
                          value={colFilters['vouchertype'] || ''}
                          onChange={e => setColFilters(f => ({ ...f, vouchertype: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-7 appearance-none"
                        >
                          <option value="">All</option>
                          {voucherTypeOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {colFilters['vouchertype'] && (
                          <button onClick={() => setColFilters(f => ({ ...f, vouchertype: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Opp-Ledger */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Opp-Ledger</label>
                      <div className="relative">
                        <input
                          type="text" placeholder="Search…" value={colFilters['opp_ledgers'] || ''}
                          onChange={e => setColFilters(f => ({ ...f, opp_ledgers: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-7"
                        />
                        {colFilters['opp_ledgers'] && (
                          <button onClick={() => setColFilters(f => ({ ...f, opp_ledgers: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Value Date */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Value Date</label>
                      <div className="relative">
                        <input
                          type="date" value={colFilters['valueDate'] || ''}
                          onChange={e => setColFilters(f => ({ ...f, valueDate: e.target.value }))}
                          onClick={e => (e.target as HTMLInputElement).showPicker?.()}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-7"
                        />
                        {colFilters['valueDate'] && (
                          <button onClick={() => setColFilters(f => ({ ...f, valueDate: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Vehicle No */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Vehicle No.</label>
                      <div className="relative">
                        <select
                          value={colFilters['vehicleNo'] || ''}
                          onChange={e => setColFilters(f => ({ ...f, vehicleNo: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-7 appearance-none"
                        >
                          <option value="">All</option>
                          {vehicleOpts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        {colFilters['vehicleNo'] && (
                          <button onClick={() => setColFilters(f => ({ ...f, vehicleNo: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Name */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Name</label>
                      <div className="relative">
                        <input
                          type="text" placeholder="Search…" value={colFilters['name'] || ''}
                          onChange={e => setColFilters(f => ({ ...f, name: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-7"
                        />
                        {colFilters['name'] && (
                          <button onClick={() => setColFilters(f => ({ ...f, name: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* Description */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Description</label>
                      <div className="relative">
                        <input
                          type="text" placeholder="Search…" value={colFilters['description'] || ''}
                          onChange={e => setColFilters(f => ({ ...f, description: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 pr-7"
                        />
                        {colFilters['description'] && (
                          <button onClick={() => setColFilters(f => ({ ...f, description: '' }))} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  {activeFilterCount > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-blue-100">
                      <span>{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active · {displayRows.length} of {rows.length} rows</span>
                      <button onClick={() => setColFilters({})} className="text-blue-600 font-semibold hover:underline">Clear all</button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wide text-sky-600 mb-1">Opening Balance</p>
              <p className={`text-base font-bold ${balCls(openingBalance)}`}>{showOB ? balStr(openingBalance) : '—'}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wide text-red-600 mb-1">Total Debit</p>
              <p className="text-base font-bold text-red-700">₹{fmtAmt(txDebit)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-600 mb-1">Total Credit</p>
              <p className="text-base font-bold text-emerald-700">₹{fmtAmt(txCredit)}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600 mb-1">Closing Balance</p>
              <p className={`text-base font-bold ${balCls(closingBalance)}`}>{balStr(closingBalance)}</p>
            </div>
          </div>
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
      ) : rows.length === 0 ? (
        <GlassCard className="p-10 text-center text-slate-400 text-sm">
          No transactions found for the selected criteria.
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <TH>Sl No.</TH>
                  <TH>Ref No.</TH>
                  <TH>Date</TH>
                  <TH>Voucher Type</TH>
                  <TH>Opp-Ledger</TH>
                  <TH>Value Date</TH>
                  <TH>Vehicle No.</TH>
                  <TH>Name</TH>
                  <TH>Description</TH>
                  <TH cls="text-right">Dr Amount</TH>
                  <TH cls="text-right">Cr Amount</TH>
                  <TH cls="text-right">R Balance</TH>
                </tr>
              </thead>
              <tbody>
                {/* Opening Balance */}
                {showOB && (
                  <tr className="bg-sky-50 border-b border-sky-200">
                    <td colSpan={9} className="px-3 py-2 text-right text-xs font-bold text-sky-700">
                      Opening Balance —{' '}
                      <span className={balCls(openingBalance)}>{balStr(openingBalance)}</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400 font-medium">—</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400 font-medium">—</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-400 font-medium">—</td>
                  </tr>
                )}

                {/* Transaction rows */}
                {displayRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'} hover:bg-blue-50/40 transition-colors`}
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
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-700 max-w-[160px] truncate">
                      {row.opp_ledgers || 'N/A'}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">
                      {fmt(row.valueDate)}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">
                      {(row.vehicleNo || row.bus_no) || '-'}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">
                      {row.name || '-'}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-500 max-w-[200px] truncate">
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
                ))}
              </tbody>
              <tfoot>
                <SummaryRow label="Total" dr={totalDebit} cr={totalCredit} />
                <SummaryRow
                  label="Closing Balance"
                  dr={closingBalance < 0 ? Math.abs(closingBalance) : 0}
                  cr={closingBalance >= 0 ? closingBalance : 0}
                  bal={closingBalance}
                />
                <GrandRow label="Grand Total" dr={grandDebit} cr={grandCredit} />
              </tfoot>
            </table>
          </div>
        </GlassCard>
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
