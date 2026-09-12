import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Shirt, Save, Plus, Trash2, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, SearchableSelect, LedgerLines, emptyLedgerLine, filledLedgerLines, halfFilledLedgerLine, ledgerLinesTotal, syncAutoLedgerLines, RecordModal, DetailGrid, DetailField, RemarksBlock, LedgerSideLists, ApprovalStatusTabs, ApprovalRowActions, ApprovalBulkButtons, ApprovalModalButtons, RejectReasonModal, RejectionReasonNote, approvalTabOf } from '@/components/shared'
import type { Column, LedgerLine, ApprovalTab } from '@/components/shared'
import { laundryService } from '@/services/laundry.service'
import { mastersService } from '@/services/masters.service'
import { accountingService } from '@/services/accounting.service'
import { formatDate, withStatusLabel, formatAmount, formatDateTime } from '@/lib/utils'

const Req = () => <span className="text-red-500">*</span>

// ── Types ────────────────────────────────────────────────────────────────
type Vendor = {
  id: number
  name: string
  c_number: string
  fromdate: string
  todate: string
  ledger_id: string | null
  ledger_name: string | null
}
type Ledger = {
  id: number
  temple_name?: string
  subchildtwo?: string
  parent_subgroup_id?: number
  parent_subchild_id?: number
  parent_grp_level?: number
  child?: string
  staticname?: string
  district_id?: string | null
  mandal_name?: string | null
  mandal_id?: string | null
  subchildtwo_id?: string | null
  village_id?: number | null
}
type VendorRate = {
  id: number
  product_name: string
  amount: string
  ledger_id?: string
  expensives?: string
  parent_subgroup_id?: number
  parent_subchild_id?: number
  parent_grp_level?: number
  child?: string
  staticname?: string
  district_id?: string
  mandal_name?: string
  mandal_id?: string
  subchildtwo?: string
  subchildtwo_id?: string
  village_id?: number
}
type VehicleRow = {
  vehicle_no: string
  service_no: string
  products: { product_name: string; qty: string; rate: string }[]
}
type LedgerRow = LedgerLine<Ledger>

const today = new Date().toISOString().split('T')[0]

const emptyForm = () => ({
  c_number: '' as string,
  c_id: '' as string,
  voucherdate: today,
  remarks: '',
  vendor: null as Vendor | null,
})

// ── Helpers ──────────────────────────────────────────────────────────────
function rowTotal(row: VehicleRow): number {
  return row.products.reduce((s, p) => s + Number(p.qty || 0) * Number(p.rate || 0), 0)
}
// Every Up service is listed on a new bill, so the rows nothing was typed on
// are just the services that sent no laundry this time; only the billed
// rows are checked and saved.
const billedRows = (rows: VehicleRow[]) => rows.filter((r) => rowTotal(r) > 0)
function billTotal(rows: VehicleRow[]): number {
  return rows.reduce((s, r) => s + rowTotal(r), 0)
}
function ledgerLabel(l: Ledger) {
  return l.temple_name || l.subchildtwo || `Ledger #${l.id}`
}
function ledgerSum(rows: LedgerRow[]): number {
  return ledgerLinesTotal(rows)
}

// ── Bill form (used both inline and inside edit modal) ───────────────────
interface FormState extends ReturnType<typeof emptyForm> {}

function BillForm({
  form, setForm, vendors, ledgers, buses, serviceOptions, rates, vehicleRows, setVehicleRows,
  debits, setDebits, credits, setCredits,
}: {
  form: FormState
  setForm: (f: FormState) => void
  vendors: Vendor[]
  ledgers: Ledger[]
  buses: { id: number; bus_no: string }[]
  serviceOptions: { value: string; label: string }[]
  rates: VendorRate[]
  vehicleRows: VehicleRow[]
  setVehicleRows: (v: VehicleRow[]) => void
  debits: LedgerRow[]
  setDebits: (d: LedgerRow[]) => void
  credits: LedgerRow[]
  setCredits: (c: LedgerRow[]) => void
}) {
  const total = billTotal(vehicleRows)
  const debitSum = ledgerSum(debits)
  const creditSum = ledgerSum(credits)
  const balanced = Math.abs(debitSum - creditSum) < 0.01 && Math.abs(debitSum - total) < 0.01

  const productCols = rates.map((r) => r.product_name)
  // Quantity and amount billed per product across every vehicle row - shown
  // as chips beside the Bill Total and as a totals line under the table, so
  // what the blankets came to is visible without adding the rows up by hand.
  const productTotals = productCols.map((name, pi) => vehicleRows.reduce((t, r) => {
    const p = r.products[pi]
    const qty = Number(p?.qty || 0), amt = qty * Number(p?.rate || 0)
    return { name, qty: t.qty + qty, amount: t.amount + amt }
  }, { name, qty: 0, amount: 0 }))

  const addVehicleRow = () => {
    if (rates.length === 0) return toast.error('Pick a vendor first to load their product rates')
    setVehicleRows([
      ...vehicleRows,
      {
        vehicle_no: '', service_no: '',
        products: rates.map((r) => ({ product_name: r.product_name, qty: '', rate: String(r.amount || 0) })),
      },
    ])
  }
  const billedCount = billedRows(vehicleRows).length

  const updateVehicleField = (i: number, patch: Partial<VehicleRow>) => {
    setVehicleRows(vehicleRows.map((v, idx) => (idx === i ? { ...v, ...patch } : v)))
  }
  const updateProductQty = (rowIdx: number, prodIdx: number, qty: string) => {
    setVehicleRows(vehicleRows.map((v, i) => {
      if (i !== rowIdx) return v
      return {
        ...v,
        products: v.products.map((p, pi) => pi === prodIdx ? { ...p, qty } : p),
      }
    }))
  }

  return (
    <div className="space-y-6">
      {/* Vendor Selection */}
      <section>
        <h4 className="text-sm font-bold text-slate-700 mb-3">Vendor Selection</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Vendor Name <Req /></Label>
            <SearchableSelect placeholder="Select Vendor"
              options={vendors.map((v) => ({ value: String(v.id), label: `${v.name} (${v.c_number})` }))}
              value={form.vendor ? String(form.vendor.id) : ''}
              onChange={(v) => setForm({ ...form, vendor: vendors.find((x) => String(x.id) === v) || null })}
              onClear={() => setForm({ ...form, vendor: null })} />
          </div>
          <div>
            <Label>Bill Date <Req /></Label>
            <Input type="date" max={today} value={form.voucherdate}
              onChange={(e) => setForm({ ...form, voucherdate: e.target.value })} />
          </div>
          <div>
            <Label>Remarks</Label>
            <Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Optional" />
          </div>
        </div>
      </section>

      {/* Vehicle Rows */}
      <section>
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
          <h4 className="text-sm font-bold text-slate-700">Laundry Bill Details</h4>
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {productTotals.filter((t) => t.amount > 0).map((t) => (
              <span key={t.name} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700">
                {t.name}: {t.qty} × → ₹{formatAmount(t.amount)}
              </span>
            ))}
            <span className="text-sm font-bold text-teal-700">Bill Total: ₹{formatAmount(total)}</span>
            <Button size="sm" onClick={addVehicleRow}><Plus className="w-4 h-4" /> Add Row</Button>
          </div>
        </div>
        {rates.length === 0 && form.vendor && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mb-3">
            This vendor has no product rates on record — nothing to bill against.
          </p>
        )}
        {vehicleRows.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">
            {form.vendor ? 'Click "Add Row" to bill for a vehicle' : 'Pick a vendor to list the Up services'}
          </div>
        ) : (
          <>
            {/* Every Up service is listed; a row is billed once a quantity is
                typed on it, and only billed rows need a vehicle or are saved. */}
            <p className="text-xs text-slate-500 mb-2">
              {vehicleRows.length} service{vehicleRows.length === 1 ? '' : 's'} listed · {billedCount} billed. Type the quantities against a service; rows left blank are not billed.
            </p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs min-w-max">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="py-1.5 px-2 text-left w-8">#</th>
                    <th className="py-1.5 px-2 text-left min-w-[8.5rem]">Service No</th>
                    <th className="py-1.5 px-2 text-left min-w-[8.5rem]">Vehicle No <Req /></th>
                    {productCols.map((pc) => (
                      <th key={pc} className="py-1.5 px-1.5 text-center w-20">{pc}<div className="text-[10px] font-normal text-slate-500">qty</div></th>
                    ))}
                    <th className="py-1.5 px-2 text-right min-w-[5.5rem]">Row Total</th>
                    <th className="py-1.5 px-1 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleRows.map((row, ri) => {
                    const billed = rowTotal(row) > 0
                    return (
                      <tr key={ri} className={`border-t border-slate-100 ${billed ? 'bg-teal-50/40' : ''}`}>
                        <td className="py-1 px-2 text-slate-500">{ri + 1}</td>
                        <td className="py-1 px-2">
                          <SearchableSelect placeholder="Service" className="min-w-[8.5rem]" buttonClassName="h-8 text-xs"
                            options={serviceOptions.some((o) => o.value === row.service_no) || !row.service_no ? serviceOptions : [{ value: row.service_no, label: row.service_no }, ...serviceOptions]}
                            value={row.service_no} onChange={(v) => updateVehicleField(ri, { service_no: v })}
                            onClear={() => updateVehicleField(ri, { service_no: '' })} />
                        </td>
                        <td className="py-1 px-2">
                          <SearchableSelect placeholder={billed ? 'Pick vehicle' : 'Vehicle'} className="min-w-[8.5rem]" buttonClassName={`h-8 text-xs ${billed && !row.vehicle_no ? 'border-red-300' : ''}`}
                            options={buses.map((b) => ({ value: b.bus_no, label: b.bus_no }))}
                            value={row.vehicle_no} onChange={(v) => updateVehicleField(ri, { vehicle_no: v })}
                            onClear={() => updateVehicleField(ri, { vehicle_no: '' })} />
                        </td>
                        {row.products.map((p, pi) => (
                          <td key={pi} className="py-1 px-1.5 text-center">
                            <Input type="number" min="0" value={p.qty} onChange={(e) => updateProductQty(ri, pi, e.target.value)}
                              className="h-8 w-16 px-1.5 text-xs text-right mx-auto" placeholder="0" />
                            <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                              {Number(p.qty) > 0 ? `${p.qty} × ₹${formatAmount(p.rate)}` : `@ ₹${formatAmount(p.rate)}`}
                            </div>
                          </td>
                        ))}
                        <td className={`py-1 px-2 text-right font-bold ${billed ? 'text-teal-700' : 'text-slate-300'}`}>₹{formatAmount(rowTotal(row))}</td>
                        <td className="py-1 px-1 text-center">
                          <button type="button" title="Remove row" onClick={() => setVehicleRows(vehicleRows.filter((_, i) => i !== ri))} className="text-slate-300 hover:text-red-600">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                  <tr>
                    <td className="py-1.5 px-2" />
                    <td className="py-1.5 px-2 font-bold text-slate-700" colSpan={2}>Totals</td>
                    {productTotals.map((t) => (
                      <td key={t.name} className="py-1.5 px-1.5 text-center">
                        <div className="text-[10px] text-slate-500">{t.qty} pcs</div>
                        <div className="font-bold text-slate-800">₹{formatAmount(t.amount)}</div>
                      </td>
                    ))}
                    <td className="py-1.5 px-2 text-right font-extrabold text-teal-700">₹{formatAmount(total)}</td>
                    <td className="py-1.5 px-1" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Balance summary */}
      {(debitSum > 0 || creditSum > 0) && (
        <div className={`rounded-xl p-4 border ${balanced ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex flex-wrap gap-6 text-sm">
            <span>Bill Total: <b>₹{formatAmount(total)}</b></span>
            <span>Debit: <b>₹{formatAmount(debitSum)}</b></span>
            <span>Credit: <b>₹{formatAmount(creditSum)}</b></span>
            <span className={balanced ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
              {balanced ? '✓ Balanced' : `Diff ₹${formatAmount(Math.abs(debitSum - creditSum))}`}
            </span>
          </div>
        </div>
      )}

      {/* Debit / Credit ledgers, laid out as on Trip Expenses and Voucher
          Entry: inline rows, Add Row in the header, pick-time checks. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        <LedgerLines side="debit" rows={debits} ledgers={ledgers} otherRows={credits} remaining={total - debitSum} onChange={setDebits} />
        <LedgerLines side="credit" rows={credits} ledgers={ledgers} otherRows={debits} remaining={total - creditSum} onChange={setCredits} />
      </div>
      {!balanced && (debitSum > 0 || creditSum > 0) && (
        <p className="text-xs font-semibold text-amber-600 text-center">
          Debit (₹{debitSum.toLocaleString('en-IN')}) and Credit (₹{creditSum.toLocaleString('en-IN')}) must both equal the bill total (₹{total.toLocaleString('en-IN')}) before saving.
        </p>
      )}
    </div>
  )
}

// ── Bill view popup ──────────────────────────────────────────────────────
// The bill's rows come back with the legacy fixed product columns; only the
// products actually billed are shown, each as qty / rate / amount, with the
// product totals as chips above the table - the shape the entry form uses.
const VIEW_PRODUCTS = [
  { key: 'blanket', label: 'Blankets' }, { key: 'white', label: 'Whites' },
  { key: 'pillow', label: 'Pillow Covers' }, { key: 'cover', label: 'Bed Covers' },
  { key: 'curtain', label: 'Curtains' },
] as const

function LaundryBillView({ row, onClose, onApprove, onReject, onReopen }: {
  row: Record<string, unknown>
  onClose: () => void
  onApprove: () => void
  onReject: () => void
  onReopen: () => void
}) {
  const details = (row._details as { vehicles?: Array<Record<string, unknown>>; accounts?: Array<Record<string, unknown>> }) || {}
  const vehicles = details.vehicles || []
  const accounts = details.accounts || []
  const num = (v: unknown) => Number(v) || 0
  const sum = (k: string) => vehicles.reduce((t, v) => t + num(v[k]), 0)
  const products = VIEW_PRODUCTS.filter((p) => sum(`${p.key}_qty`) > 0)
  const pieces = products.reduce((t, p) => t + sum(`${p.key}_qty`), 0)
  const status = Number(row.admin_status)
  const total = row.total_amount ?? sum('totalamount')

  return (
    <RecordModal size="xl" title="Laundry Bill" subtitle={String(row.c_number ?? '')} icon={<Shirt className="w-4 h-4 text-teal-500" />} onClose={onClose}>
      <DetailGrid cols={4}>
        <DetailField label="Vendor" value={String(row.vendor_name || '—')} />
        <DetailField label="Bill Date" value={row.voucherdate ? formatDate(String(row.voucherdate)) : '—'} />
        <DetailField label="Vehicles" value={`${vehicles.length || num(row.vehicle_count)}`} />
        <DetailField label="Pieces" value={`${pieces}`} />
        <DetailField label="Bill Total" value={`₹${formatAmount(total)}`} strong />
        <DetailField label="Status" value={<Badge variant={status === 1 ? 'success' : status === 2 ? 'danger' : 'warning'}>{status === 1 ? 'Approved' : status === 2 ? 'Rejected' : 'Pending'}</Badge>} />
        {status !== 0 && <DetailField label="Action By" value={String(row.admin_action_name || '—')} />}
        {status !== 0 && <DetailField label="Action Date" value={row.admin_action_date ? formatDateTime(String(row.admin_action_date)) : '—'} />}
      </DetailGrid>
      <RemarksBlock text={row.remarks} />
      <RejectionReasonNote reason={row.rejection_reason} />

      <div>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h4 className="text-sm font-bold text-slate-700">Laundry Bill Details</h4>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {products.map((p) => (
              <span key={p.key} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700">
                {p.label}: {sum(`${p.key}_qty`)} pcs → ₹{formatAmount(sum(`${p.key}_amount`))}
              </span>
            ))}
          </div>
        </div>
        {vehicles.length === 0 ? (
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center text-sm text-slate-500">No vehicle rows on this bill</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs min-w-max">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-2 px-2 text-left w-8 text-slate-500">#</th>
                  <th className="py-2 px-3 text-left">Service No</th>
                  <th className="py-2 px-3 text-left">Vehicle No</th>
                  {products.map((p) => (
                    <th key={p.key} className="py-2 px-3 text-right">{p.label}<div className="text-[10px] font-normal text-slate-500">qty × rate</div></th>
                  ))}
                  <th className="py-2 px-3 text-right">Row Total</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map((v, i) => (
                  <tr key={i} className={`border-t border-slate-100 ${i % 2 ? 'bg-slate-50/50' : ''}`}>
                    <td className="py-1.5 px-2 text-slate-500">{i + 1}</td>
                    <td className="py-1.5 px-3 font-medium text-slate-700">{String(v.service_no || '—')}</td>
                    <td className="py-1.5 px-3 font-bold text-blue-600">{String(v.vehicle_no || '—')}</td>
                    {products.map((p) => {
                      const qty = num(v[`${p.key}_qty`])
                      return (
                        <td key={p.key} className="py-1.5 px-3 text-right tabular-nums">
                          {qty ? (
                            <>
                              <div className="font-semibold text-slate-800">₹{formatAmount(v[`${p.key}_amount`])}</div>
                              <div className="text-[10px] text-slate-400">{qty} × ₹{formatAmount(v[`${p.key}_rate`])}</div>
                            </>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                      )
                    })}
                    <td className="py-1.5 px-3 text-right font-bold text-teal-700 tabular-nums">₹{formatAmount(v.totalamount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                <tr>
                  <td className="py-2 px-2" />
                  <td className="py-2 px-3 font-bold text-slate-700" colSpan={2}>Totals</td>
                  {products.map((p) => (
                    <td key={p.key} className="py-2 px-3 text-right tabular-nums">
                      <div className="font-bold text-slate-800">₹{formatAmount(sum(`${p.key}_amount`))}</div>
                      <div className="text-[10px] text-slate-500">{sum(`${p.key}_qty`)} pcs</div>
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right font-extrabold text-teal-700 tabular-nums">₹{formatAmount(sum('totalamount'))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <LedgerSideLists rows={accounts} />
      <ApprovalModalButtons tab={approvalTabOf(row.admin_status)} onApprove={onApprove} onReject={onReject} onReopen={onReopen} />
    </RecordModal>
  )
}

// ── Main page ────────────────────────────────────────────────────────────
export default function LaundryBillPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [vehicleRows, setVehicleRows] = useState<VehicleRow[]>([])
  const [debits, setDebits] = useState<LedgerRow[]>([emptyLedgerLine<Ledger>()])
  const [credits, setCredits] = useState<LedgerRow[]>([emptyLedgerLine<Ledger>()])
  const [mode, setMode] = useState<'add' | 'edit'>('add')
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  // Bills are reviewed the way vouchers are: a tab per status, Approve /
  // Reject on each pending row or on the selected rows together, and a
  // rejection that asks for its reason.
  const [tab, setTab] = useState<ApprovalTab>('pending')
  const [selectedRows, setSelectedRows] = useState<Record<string, unknown>[]>([])
  const [rejectTarget, setRejectTarget] = useState<{ rows: Record<string, unknown>[] } | null>(null)
  const [bulkApproving, setBulkApproving] = useState(false)
  const [bulkRejecting, setBulkRejecting] = useState(false)

  const named = localStorage.getItem('usr_nm') ?? ''
  const user_id = localStorage.getItem('user_id') ?? '0'

  const { data: vendorsResp } = useQuery({ queryKey: ['bill-vendors'], queryFn: () => laundryService.getVendorDropdown() })
  const { data: ledgersResp } = useQuery({ queryKey: ['ledgers'], queryFn: () => accountingService.getLedgerName() })
  const { data: busesResp } = useQuery({ queryKey: ['buses'], queryFn: () => mastersService.getBuses() })
  const { data: routesResp } = useQuery({ queryKey: ['routes'], queryFn: () => mastersService.getServiceRoutes() })
  const { data: billsResp, isLoading } = useQuery({ queryKey: ['laundry-bills'], queryFn: () => laundryService.getLaundryBills() })

  const vendors = (vendorsResp?.data ?? []) as Vendor[]
  const ledgers = (ledgersResp?.data ?? []) as Ledger[]
  const buses = (busesResp?.data ?? []) as { id: number; bus_no: string }[]
  // Laundry is billed against the Up run, so only the service routes marked
  // Up (Masters > Service Routes) are offered - and a new bill lists every one
  // of them as a row, so the services need not be picked one at a time.
  const serviceOptions = useMemo(() => {
    const all = ((routesResp?.data ?? []) as any[]).filter((r) => r.d_in === 0 || r.d_in == null)
    return all.filter((r) => String(r.up_down ?? '').trim().toUpperCase() === 'UP')
      .map((r) => ({ value: String(r.serviceNo ?? ''), label: [r.serviceNo, [r.fromCity, r.toCity].filter(Boolean).join(' → ')].filter(Boolean).join(' · ') }))
      .filter((o) => o.value)
  }, [routesResp])
  const bills = (billsResp?.data ?? []) as Record<string, unknown>[]
  // Every laundry bill is debited to Laundry Expenses, so a new bill opens with
  // that row already on the debit side (its amount follows the bill total); the
  // credit side - the vendor - is filled in when the vendor is picked.
  const laundryLedger = ledgers.find((l) => String(l.staticname) === 'EXPENSES' && /^laundry expenses?$/i.test(String(l.temple_name ?? '').trim()))
    ?? ledgers.find((l) => String(l.staticname) === 'EXPENSES' && /laundry/i.test(String(l.temple_name ?? '')))
  const openNew = () => {
    setForm(emptyForm()); setVehicleRows([]); setCredits([emptyLedgerLine<Ledger>()]); setMode('add')
    setDebits(laundryLedger ? [{ ledger: laundryLedger, amount: '', auto: true }] : [emptyLedgerLine<Ledger>()])
    setShowForm(true)
  }

  // Fetch this vendor's product rates when the vendor changes.
  const { data: ratesResp } = useQuery({
    queryKey: ['vendor-rates', form.vendor?.id ?? 0],
    queryFn: () => laundryService.getSelectedVendor({ vendor_id: form.vendor?.id }),
    enabled: !!form.vendor?.id,
  })
  const rates = (ratesResp?.data ?? []) as VendorRate[]

  // When vendor rates arrive AND no rows exist yet, list every Up service as a
  // row (a blank starter row when no route is marked Up yet). Also
  // auto-populate the credit side with vendor's ledger so user doesn't hand-type
  // "which ledger do we owe" — matches old Angular autofill behaviour.
  useEffect(() => {
    if (form.vendor && rates.length > 0 && vehicleRows.length === 0 && mode === 'add') {
      const products = () => rates.map((r) => ({ product_name: r.product_name, qty: '', rate: String(r.amount || 0) }))
      setVehicleRows(serviceOptions.length
        ? serviceOptions.map((o) => ({ vehicle_no: '', service_no: o.value, products: products() }))
        : [{ vehicle_no: '', service_no: '', products: products() }])
      if (form.vendor.ledger_id && filledLedgerLines(credits).length === 0) {
        const l = ledgers.find((x) => x.id === Number(form.vendor?.ledger_id))
        if (l) setCredits([{ ledger: l, amount: '', auto: true }])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates, form.vendor])

  // Ledger amounts the panels filled in - the vendor's seeded credit row, and
  // any ledger picked before the quantities were typed - follow the bill total
  // as it changes. An amount typed by hand is left alone.
  const liveTotal = billTotal(vehicleRows)
  useEffect(() => {
    setDebits((ds) => syncAutoLedgerLines(ds, liveTotal))
    setCredits((cs) => syncAutoLedgerLines(cs, liveTotal))
  }, [liveTotal])

  const buildPayload = () => ({
    c_number: form.c_number,
    c_id: form.c_id,
    expensedetails: {
      voucherdate: form.voucherdate,
      remarks: form.remarks,
    },
    vendor: form.vendor,
    vehicles: billedRows(vehicleRows).map((v) => ({
      vehicle_no: v.vehicle_no,
      service_no: v.service_no,
      products: v.products.map((p) => ({
        product_name: p.product_name,
        qty: p.qty,
        rate: p.rate,
        amount: (Number(p.qty || 0) * Number(p.rate || 0)).toFixed(2),
      })),
    })),
    patientsTstdts: filledLedgerLines(debits).map((d) => ({ ledger: d.ledger, amount: d.amount })),
    creditaddrowdts: filledLedgerLines(credits).map((c) => ({ ledger: c.ledger, amount: c.amount })),
    named, user_id,
  })

  const resetForm = () => {
    setForm(emptyForm()); setVehicleRows([]); setDebits([emptyLedgerLine<Ledger>()]); setCredits([emptyLedgerLine<Ledger>()]); setMode('add'); setShowForm(false)
  }

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => laundryService.submitLaundryBill(buildPayload()),
    onSuccess: (res) => {
      if (res?.status === 200) {
        toast.success(`Bill saved (${res.data?.c_number || ''})`)
        qc.invalidateQueries({ queryKey: ['laundry-bills'] })
        resetForm()
      } else toast.error(res?.message || 'Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: () => laundryService.updateLaundryBill(buildPayload()),
    onSuccess: (res) => {
      if (res?.status === 200) {
        toast.success('Bill updated')
        qc.invalidateQueries({ queryKey: ['laundry-bills'] })
        resetForm()
      } else toast.error(res?.message || 'Failed to update')
    },
    onError: () => toast.error('Server error'),
  })

  // The same checks the Fuel Entry form makes, so a bill is never filed with a
  // vehicle missing, nothing billed, or ledgers that do not add up to it.
  const onSave = () => {
    if (!form.vendor) return toast.error('Vendor Name is required')
    if (!form.voucherdate) return toast.error('Bill Date is required')
    if (vehicleRows.length === 0) return toast.error('Add at least one vehicle row')
    const billed = billedRows(vehicleRows)
    if (billed.length === 0) return toast.error('Enter a quantity against at least one service — nothing is billed yet')
    const noVehicle = vehicleRows.findIndex((r) => rowTotal(r) > 0 && !r.vehicle_no)
    if (noVehicle >= 0) return toast.error(`Pick the vehicle on row ${noVehicle + 1}${vehicleRows[noVehicle].service_no ? ` (service ${vehicleRows[noVehicle].service_no})` : ''}`)
    const total = billTotal(vehicleRows)
    const debitSum = ledgerSum(debits)
    const creditSum = ledgerSum(credits)
    if (halfFilledLedgerLine(debits) || halfFilledLedgerLine(credits)) return toast.error('Every ledger row needs both a ledger and an amount')
    if (filledLedgerLines(debits).length === 0) return toast.error('Add at least one debit ledger entry')
    if (filledLedgerLines(credits).length === 0) return toast.error('Add at least one credit ledger entry')
    if (Math.abs(debitSum - creditSum) > 0.01) return toast.error(`Debit ₹${formatAmount(debitSum)} ≠ Credit ₹${formatAmount(creditSum)}`)
    if (Math.abs(debitSum - total) > 0.01) return toast.error(`Ledger total ₹${formatAmount(debitSum)} ≠ Bill ₹${formatAmount(total)}`)
    if (mode === 'edit') update()
    else save()
  }

  const refreshAfterStatus = () => {
    qc.invalidateQueries({ queryKey: ['laundry-bills'] })
    qc.invalidateQueries({ queryKey: ['laundry-approved'] })
  }
  const setStatus = (row: Record<string, unknown>, admin_status: number, rejection_reason = '') =>
    laundryService.updateLaundryAdminStatus({ c_number: row.c_number, admin_status, rejection_reason, named, user_id })
  const onStatusChange = async (row: Record<string, unknown>, admin_status: number, rejection_reason = '') => {
    const res = await setStatus(row, admin_status, rejection_reason).catch(() => null)
    if (res?.status === 200) {
      toast.success(admin_status === 1 ? 'Bill approved' : admin_status === 2 ? 'Bill rejected' : 'Bill reopened for review')
      refreshAfterStatus()
      setViewRow(null)
    } else toast.error(res?.message || 'Failed')
  }
  // Approve / reject the selected bills one after another, as Voucher Approvals
  // does, then report the count once.
  const runBulk = async (rows: Record<string, unknown>[], admin_status: 1 | 2, reason = '') => {
    if (!rows.length) return
    const setLoading = admin_status === 1 ? setBulkApproving : setBulkRejecting
    setLoading(true)
    let done = 0
    for (const row of rows) {
      const res = await setStatus(row, admin_status, reason).catch(() => null)
      if (res?.status === 200) done++
    }
    setLoading(false)
    setSelectedRows([])
    toast.success(`${done} of ${rows.length} bill${rows.length === 1 ? '' : 's'} ${admin_status === 1 ? 'approved' : 'rejected'}`)
    refreshAfterStatus()
  }
  const askReject = (rows: Record<string, unknown>[]) => { if (rows.length) setRejectTarget({ rows }) }
  const confirmReject = (reason: string) => {
    const rows = rejectTarget?.rows ?? []
    setRejectTarget(null)
    if (rows.length === 1) onStatusChange(rows[0], 2, reason)
    else runBulk(rows, 2, reason)
  }

  const onEdit = async (row: Record<string, unknown>) => {
    if (Number(row.admin_status) !== 0) return toast.error('Only bills on review can be edited')
    const res = await laundryService.getLaundryBillSubData({ c_number: row.c_number })
    if (res?.status !== 200) return toast.error(res?.message || 'Failed to load bill')
    const vehs = (res.data?.vehicles ?? []) as Array<Record<string, unknown>>
    const accs = (res.data?.accounts ?? []) as Array<Record<string, unknown>>
    if (vehs.length === 0) return toast.error('Bill has no vehicle rows')
    const first = vehs[0]
    const vendor: Vendor | null = vendors.find((v) => v.name === String(first.name)) || null
    // Convert legacy hardcoded columns back into products array — reverse of
    // insertBillVehicleRows in the backend.
    const productDefs: Array<{ key: 'blanket' | 'white' | 'pillow' | 'cover' | 'curtain'; label: string }> = [
      { key: 'blanket', label: 'Blankets' }, { key: 'white', label: 'Whites' },
      { key: 'pillow', label: 'Pillow Covers' }, { key: 'cover', label: 'Bed Covers' },
      { key: 'curtain', label: 'Curtains' },
    ]
    const loadedRows: VehicleRow[] = vehs.map((r) => ({
      vehicle_no: String(r.vehicle_no || ''),
      service_no: String(r.service_no || ''),
      products: productDefs
        .filter((pd) => r[`${pd.key}_qty`] || r[`${pd.key}_rate`])
        .map((pd) => ({
          product_name: pd.label,
          qty: String(r[`${pd.key}_qty`] || 0),
          rate: String(r[`${pd.key}_rate`] || 0),
        })),
    }))
    setForm({
      c_number: String(row.c_number || ''),
      c_id: String(row.c_id || ''),
      voucherdate: String(first.voucherdate || today),
      remarks: String(first.remarks || ''),
      vendor,
    })
    setVehicleRows(loadedRows)
    setDebits(accs.filter((a) => a.account_type === 'Debit Account').map((a) => ({
      ledger: {
        id: Number(a.ledger_id) || Number(a.parent_subgroup_id) || 0,
        temple_name: String(a.expensives || ''),
        parent_subgroup_id: Number(a.parent_subgroup_id) || undefined,
        parent_subchild_id: Number(a.parent_subchild_id) || undefined,
        staticname: String(a.staticname || ''),
        subchildtwo: String(a.subchildtwo || ''),
        subchildtwo_id: String(a.subchildtwo_id || ''),
      },
      amount: String(a.amount || 0),
    })))
    setCredits(accs.filter((a) => a.account_type === 'Credit Account').map((a) => ({
      ledger: {
        id: Number(a.ledger_id) || Number(a.parent_subgroup_id) || 0,
        temple_name: String(a.expensives || ''),
        parent_subgroup_id: Number(a.parent_subgroup_id) || undefined,
        parent_subchild_id: Number(a.parent_subchild_id) || undefined,
        staticname: String(a.staticname || ''),
        subchildtwo: String(a.subchildtwo || ''),
        subchildtwo_id: String(a.subchildtwo_id || ''),
      },
      amount: String(a.amount || 0),
    })))
    setMode('edit')
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onDelete = async (row: Record<string, unknown>) => {
    if (!confirm(`Delete bill ${row.c_number}?`)) return
    const res = await laundryService.deleteLaundryBill({ c_number: row.c_number, named, user_id })
    if (res?.status === 200) {
      toast.success('Bill deleted')
      qc.invalidateQueries({ queryKey: ['laundry-bills'] })
    } else toast.error(res?.message || 'Failed')
  }

  const onView = async (row: Record<string, unknown>) => {
    const res = await laundryService.getLaundryBillSubData({ c_number: row.c_number })
    setViewRow({ ...row, _details: res?.data || { vehicles: [], accounts: [] } })
  }

  const cols: Column[] = useMemo(() => [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _r, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    {
      label: 'Ref #', key: 'c_number', filterable: true,
      render: (v, r: Record<string, unknown>) => (
        <button onClick={() => onView(r)} className="text-blue-600 hover:underline font-medium">{String(v)}</button>
      ),
    },
    { label: 'Vendor', key: 'vendor_name', filterable: true },
    { label: 'Date', key: 'voucherdate', render: (v) => formatDate(String(v ?? '')) },
    { label: 'Vehicles', key: 'vehicle_count', align: 'center' },
    { label: 'Total', key: 'total_amount', align: 'right', render: (v) => <span className="font-bold">₹{formatAmount(v)}</span> },
    {
      label: 'Status', key: 'status_label', filterable: true,
      render: (_v, r: Record<string, unknown>) => {
        const status = Number(r.admin_status)
        if (status === 1) return <Badge variant="success">Approved</Badge>
        if (status === 2) return <Badge variant="danger">Rejected</Badge>
        return <Badge variant="warning">Pending</Badge>
      },
    },
    // What the reviewer did and when; the reason when it was declined.
    ...(tab === 'pending' ? [] : [
      { label: 'Action By', key: 'admin_action_name', filterable: true, render: (v) => v ? String(v) : '—' } as Column,
      { label: 'Action Date', key: 'admin_action_date', render: (v) => v ? formatDateTime(String(v)) : '—' } as Column,
    ]),
    ...(tab === 'rejected' ? [{ label: 'Reason', key: 'rejection_reason', render: (v) => v ? <span className="text-red-700 text-xs max-w-[220px] line-clamp-2 block">{String(v)}</span> : '—' } as Column] : []),
    {
      label: 'Actions', key: 'c_number',
      render: (_v, r: Record<string, unknown>) => (
        <ApprovalRowActions tab={tab}
          onView={() => onView(r)} onEdit={() => onEdit(r)} onDelete={() => onDelete(r)}
          onApprove={() => onStatusChange(r, 1)} onReject={() => askReject([r])} onReopen={() => onStatusChange(r, 0)} />
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [vendors, tab])

  const counts = { pending: 0, approved: 0, rejected: 0 } as Record<ApprovalTab, number>
  for (const r of bills) counts[approvalTabOf(r.admin_status)]++
  const shownBills = bills.filter((r) => approvalTabOf(r.admin_status) === tab)
  // Column filters are scoped to the open tab, as on Voucher Approvals -
  // carrying them over made the next tab look stuck or empty.
  const changeTab = (t: ApprovalTab) => { setTab(t); setColumnFilters({}); setSelectedRows([]) }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title={mode === 'edit' ? 'Edit Laundry Bill' : 'Add Laundry Bill'} subtitle="Bill laundry vendors for washed items per vehicle" />

      <div className="flex justify-end">
        {!showForm && <Button onClick={openNew}><Plus className="w-4 h-4" /> Add Laundry Bill</Button>}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div key="bill-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <GlassCard className="p-6" colorBar="bg-gradient-to-r from-teal-400 to-cyan-500">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Shirt className="w-5 h-5 text-teal-500" />
                  {mode === 'edit' ? `Editing ${form.c_number}` : 'New Laundry Bill'}
                </h2>
                <button onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <BillForm
                form={form} setForm={setForm}
                vendors={vendors} ledgers={ledgers} buses={buses} serviceOptions={serviceOptions} rates={rates}
                vehicleRows={vehicleRows} setVehicleRows={setVehicleRows}
                debits={debits} setDebits={setDebits} credits={credits} setCredits={setCredits}
              />
              <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                <Button variant="ghost" onClick={resetForm}>Cancel</Button>
                <Button onClick={onSave} disabled={saving || updating}>
                  <Save className="w-4 h-4" />
                  {(saving || updating) ? 'Saving…' : (mode === 'edit' ? 'Update Bill' : 'Save Bill')}
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <ApprovalStatusTabs tab={tab} onChange={changeTab} counts={counts} />

      <DataTable
        title={tab === 'pending' ? 'Laundry Bills Awaiting Approval' : tab === 'approved' ? 'Approved Laundry Bills' : 'Rejected Laundry Bills'}
        columns={cols}
        data={withStatusLabel(shownBills)}
        loading={isLoading}
        onAction={() => {}}
        actions={[]}
        rowKey={(r) => String(r.c_number)}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
        selectable={tab === 'pending'}
        sumKey="total_amount"
        onSelectionChange={(rows) => setSelectedRows(rows as Record<string, unknown>[])}
        selectionActions={tab === 'pending' ? (
          <ApprovalBulkButtons approving={bulkApproving} rejecting={bulkRejecting}
            onApprove={() => runBulk(selectedRows, 1)} onReject={() => askReject(selectedRows)} />
        ) : undefined}
      />

      <RejectReasonModal open={!!rejectTarget} onCancel={() => setRejectTarget(null)} onConfirm={confirmReject}
        subject={rejectTarget && rejectTarget.rows.length === 1
          ? `Laundry bill ${String(rejectTarget.rows[0].c_number ?? '')}`
          : `Rejecting ${rejectTarget?.rows.length ?? 0} laundry bills`} />

      {/* View modal */}
      <AnimatePresence>
        {viewRow && (
          <LaundryBillView row={viewRow} onClose={() => setViewRow(null)}
            onApprove={() => onStatusChange(viewRow, 1)} onReject={() => askReject([viewRow])} onReopen={() => onStatusChange(viewRow, 0)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
