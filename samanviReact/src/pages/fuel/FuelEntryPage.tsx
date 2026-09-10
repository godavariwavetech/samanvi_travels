import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Fuel, Save, Plus, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, SearchableSelect, LedgerLines, emptyLedgerLine, filledLedgerLines, halfFilledLedgerLine, ledgerLinesTotal, syncAutoLedgerLines } from '@/components/shared'
import type { Column, LedgerLine } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'
import { mastersService } from '@/services/masters.service'
import { accountingService } from '@/services/accounting.service'
import { formatDate, withStatusLabel, formatAmount } from '@/lib/utils'

// Required-field marker, the same red asterisk every other form uses.
const Req = () => <span className="text-red-500">*</span>

type Ledger = {
  id: number
  temple_name?: string
  subchildtwo?: string
  parent_subgroup_id?: number
  parent_subchild_id?: number
  parent_grp_level?: number
  child?: string
  staticname?: string
}

// What the API takes for each side (unchanged); the form itself works in
// LedgerLine rows and converts on submit.
type DebitRow = { d_test_name: Ledger | ''; d_test_amount: string }
type CreditRow = { creditledger: Ledger | ''; creditamount: string }

// Exported for the headless form test alongside FuelForm.
export const emptyForm = () => ({
  id: 0 as number | 0,
  c_id: '' as string,
  c_number: '' as string,
  date: new Date().toISOString().split('T')[0],
  vehicleNumber: '',
  previousOdometer: '',
  presentOdometer: '',
  kilometers: '',
  qtyFilled: '',
  pricePerLitre: '',
  totalBill: '',
  averageKMPL: '',
  remarks: '',
  patientsTstdts: [emptyLedgerLine<Ledger>()] as LedgerLine<Ledger>[],
  creditaddrowdts: [emptyLedgerLine<Ledger>()] as LedgerLine<Ledger>[],
})

// The API's row shape for each side, empty lines dropped.
const toApiRows = (f: { patientsTstdts: LedgerLine<Ledger>[]; creditaddrowdts: LedgerLine<Ledger>[] }) => ({
  patientsTstdts: filledLedgerLines(f.patientsTstdts).map((r): DebitRow => ({ d_test_name: r.ledger as Ledger, d_test_amount: r.amount })),
  creditaddrowdts: filledLedgerLines(f.creditaddrowdts).map((r): CreditRow => ({ creditledger: r.ledger as Ledger, creditamount: r.amount })),
})

type FormState = ReturnType<typeof emptyForm>

const today = new Date().toISOString().split('T')[0]

function ledgerLabel(l: Ledger) {
  return l.temple_name || l.subchildtwo || `Ledger #${l.id}`
}

// Balance rule: debit total = credit total = fuel bill. Enforced client-side to
// keep the save button honest; the backend re-checks so a hand-crafted request
// can't sneak past.
function validateBalance(f: FormState): string | null {
  if (!f.date) return 'Date is required'
  if (!f.vehicleNumber) return 'Vehicle Number is required'
  if (!f.qtyFilled || Number(f.qtyFilled) <= 0) return 'Quantity Filled must be greater than 0'
  if (!f.pricePerLitre || Number(f.pricePerLitre) <= 0) return 'Price Per Litre must be greater than 0'
  // Same rules Trip Expenses applies to its ledger rows: every started row
  // is finished, each side has a ledger, and the two sides balance to the bill.
  if (halfFilledLedgerLine(f.patientsTstdts) || halfFilledLedgerLine(f.creditaddrowdts)) return 'Every ledger row needs both a ledger and an amount'
  if (filledLedgerLines(f.patientsTstdts).length === 0) return 'Add at least one debit ledger entry'
  if (filledLedgerLines(f.creditaddrowdts).length === 0) return 'Add at least one credit ledger entry'
  const debitSum = ledgerLinesTotal(f.patientsTstdts)
  const creditSum = ledgerLinesTotal(f.creditaddrowdts)
  const bill = Number(f.totalBill || 0)
  if (Math.abs(debitSum - creditSum) > 0.01) return `Debit ₹${formatAmount(debitSum)} ≠ Credit ₹${formatAmount(creditSum)}`
  if (Math.abs(debitSum - bill) > 0.01) return `Ledger total ₹${formatAmount(debitSum)} ≠ Bill ₹${formatAmount(bill)}`
  return null
}

// ─── The reusable form body (same markup for create + edit modal) ───────────
export function FuelForm({ form, setForm, buses, ledgers }: {
  form: FormState
  setForm: (f: FormState) => void
  buses: { id: number; bus_no: string; odometer?: string }[]
  ledgers: Ledger[]
}) {
  // Auto-fill previous odometer from the selected bus. Editable — some entries
  // correct a wrong reading and we don't want to fight the user.
  const onVehicleChange = (bus_no: string) => {
    const bus = buses.find((b) => b.bus_no === bus_no)
    setForm({ ...form, vehicleNumber: bus_no, previousOdometer: bus?.odometer || form.previousOdometer })
  }

  // Auto-derived fields: kilometers, total bill, avg kmpl. Recomputed on every
  // relevant blur/change so the user always sees the current numbers before
  // saving.
  const recompute = (patch: Partial<FormState>) => {
    const next = { ...form, ...patch }
    const kms = Number(next.presentOdometer || 0) - Number(next.previousOdometer || 0)
    next.kilometers = kms > 0 ? String(kms) : '0'
    const bill = Number(next.qtyFilled || 0) * Number(next.pricePerLitre || 0)
    next.totalBill = bill ? bill.toFixed(2) : '0'
    next.averageKMPL = Number(next.qtyFilled) > 0 && kms > 0 ? (kms / Number(next.qtyFilled)).toFixed(2) : '0'
    // Ledger amounts the panels filled in follow the bill as it changes, so the
    // ledger can be picked before the quantity and price are typed.
    next.patientsTstdts = syncAutoLedgerLines(next.patientsTstdts, bill)
    next.creditaddrowdts = syncAutoLedgerLines(next.creditaddrowdts, bill)
    setForm(next)
  }

  const debitSum = ledgerLinesTotal(form.patientsTstdts)
  const creditSum = ledgerLinesTotal(form.creditaddrowdts)
  const bill = Number(form.totalBill || 0)
  const balanced = Math.abs(debitSum - creditSum) < 0.01 && Math.abs(debitSum - bill) < 0.01

  return (
    <div className="space-y-6">
      {/* Vehicle & Odometer */}
      <section>
        <h4 className="text-sm font-bold text-slate-700 mb-3">Vehicle & Odometer</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Date <Req /></Label>
            <Input type="date" max={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Vehicle Number <Req /></Label>
            <SearchableSelect placeholder="Select Vehicle"
              options={buses.map((b) => ({ value: b.bus_no, label: b.bus_no }))}
              value={form.vehicleNumber} onChange={onVehicleChange}
              onClear={() => setForm({ ...form, vehicleNumber: '' })} /></div>
          <div><Label>Previous Odometer</Label>
            <Input type="number" value={form.previousOdometer} onChange={(e) => recompute({ previousOdometer: e.target.value })} /></div>
          <div><Label>Present Odometer <Req /></Label>
            <Input type="number" value={form.presentOdometer} onChange={(e) => recompute({ presentOdometer: e.target.value })} /></div>
          <div><Label>Kilometers (auto)</Label>
            <Input value={form.kilometers} readOnly className="bg-slate-50" /></div>
        </div>
      </section>

      {/* Fuel Information */}
      <section>
        <h4 className="text-sm font-bold text-slate-700 mb-3">Fuel Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><Label>Quantity Filled (L) <Req /></Label>
            <Input type="number" value={form.qtyFilled} onChange={(e) => recompute({ qtyFilled: e.target.value })} /></div>
          <div><Label>Price / Litre (₹) <Req /></Label>
            <Input type="number" value={form.pricePerLitre} onChange={(e) => recompute({ pricePerLitre: e.target.value })} /></div>
          <div><Label>Total Bill (auto)</Label>
            <Input value={formatAmount(form.totalBill)} readOnly className="bg-slate-50" /></div>
          <div><Label>Avg KMPL (auto)</Label>
            <Input value={form.averageKMPL} readOnly className="bg-slate-50" /></div>
        </div>
        <div className="mt-4">
          <Label>Remarks (optional)</Label>
          <textarea
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm min-h-[70px] focus:outline-none focus:ring-2 focus:ring-amber-400"
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            placeholder="Any notes about this fuel fill…"
          />
        </div>
      </section>

      {/* Balance summary */}
      {(debitSum > 0 || creditSum > 0) && (
        <div className={`rounded-xl p-4 border ${balanced ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex flex-wrap gap-6 text-sm">
            <span>Total Debit: <b>₹{formatAmount(debitSum)}</b></span>
            <span>Total Credit: <b>₹{formatAmount(creditSum)}</b></span>
            <span>Bill: <b>₹{formatAmount(bill)}</b></span>
            <span className={balanced ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
              {balanced ? '✓ Balanced' : `Diff ₹${formatAmount(Math.abs(debitSum - creditSum))}`}
            </span>
          </div>
        </div>
      )}

      {/* Debit / Credit ledgers, laid out as on Trip Expenses and Voucher
          Entry: inline rows, Add Row in the header, pick-time checks. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
        <LedgerLines side="debit" rows={form.patientsTstdts} ledgers={ledgers} otherRows={form.creditaddrowdts}
          remaining={bill - debitSum} onChange={(rows) => setForm({ ...form, patientsTstdts: rows })} />
        <LedgerLines side="credit" rows={form.creditaddrowdts} ledgers={ledgers} otherRows={form.patientsTstdts}
          remaining={bill - creditSum} onChange={(rows) => setForm({ ...form, creditaddrowdts: rows })} />
      </div>
      {!balanced && (debitSum > 0 || creditSum > 0) && (
        <p className="text-xs font-semibold text-amber-600 text-center">
          Debit (₹{debitSum.toLocaleString('en-IN')}) and Credit (₹{creditSum.toLocaleString('en-IN')}) must both equal the bill (₹{bill.toLocaleString('en-IN')}) before saving.
        </p>
      )}
    </div>
  )
}

export default function FuelEntryPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editForm, setEditForm] = useState<FormState | null>(null)
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data: entries, isLoading } = useQuery({
    queryKey: ['fuel-entries'],
    queryFn: () => fuelService.getFuelEntries(),
  })
  const { data: busesResp } = useQuery({
    queryKey: ['buses'],
    queryFn: () => mastersService.getBuses(),
  })
  const { data: ledgersResp } = useQuery({
    queryKey: ['ledgers'],
    queryFn: () => accountingService.getLedgerName(),
  })

  const buses = (busesResp?.data ?? []) as { id: number; bus_no: string; odometer?: string }[]
  const ledgers = (ledgersResp?.data ?? []) as Ledger[]
  const entryList = (entries?.data ?? []) as Record<string, unknown>[]

  const named = localStorage.getItem('usr_nm') ?? ''
  const user_id = localStorage.getItem('user_id') ?? '0'

  const { mutate: submit, isPending } = useMutation({
    mutationFn: () => fuelService.submitFuelEntry({ ...form, ...toApiRows(form), named, user_id }),
    onSuccess: (res) => {
      if (res?.status === 200) {
        toast.success(`Fuel entry saved (${res.data?.c_number || ''})`)
        qc.invalidateQueries({ queryKey: ['fuel-entries'] })
        setForm(emptyForm())
        setShowForm(false)
      } else toast.error(res?.message || 'Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: () => fuelService.updateFuelEntry({ ...(editForm as FormState), ...toApiRows(editForm as FormState), named, user_id }),
    onSuccess: (res) => {
      if (res?.status === 200) {
        toast.success('Fuel entry updated')
        qc.invalidateQueries({ queryKey: ['fuel-entries'] })
        setEditForm(null)
      } else toast.error(res?.message || 'Failed to update')
    },
    onError: () => toast.error('Server error'),
  })

  const onSaveNew = () => {
    const err = validateBalance(form)
    if (err) return toast.error(err)
    submit()
  }

  const onSaveEdit = () => {
    if (!editForm) return
    const err = validateBalance(editForm)
    if (err) return toast.error(err)
    update()
  }

  const onStatusChange = async (row: Record<string, unknown>, admin_status: number) => {
    const res = await fuelService.updateFuelAdminStatus({ id: row.id, admin_status, named, user_id })
    if (res?.status === 200) {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['fuel-entries'] })
    } else toast.error(res?.message || 'Failed')
  }

  const onEdit = async (row: Record<string, unknown>) => {
    const accRes = await fuelService.getFuelAccounts({ id: row.id })
    const rows = (accRes?.data ?? []) as Array<Record<string, unknown>>
    const toLine = (r: Record<string, unknown>): LedgerLine<Ledger> => ({
      ledger: { id: Number(r.ledger_id), temple_name: String(r.expensives || '') } as Ledger,
      amount: String(r.amount || 0),
    })
    const debits = rows.filter((r) => r.account_type === 'Debit Account').map(toLine)
    const credits = rows.filter((r) => r.account_type === 'Credit Account').map(toLine)
    setEditForm({
      id: Number(row.id),
      c_id: String(row.c_id || ''),
      c_number: String(row.c_number || ''),
      date: String(row.date || today),
      vehicleNumber: String(row.vehicle_number || ''),
      previousOdometer: String(row.previous_odometer || row.prev_odometer || 0),
      presentOdometer: String(row.present_odometer || 0),
      kilometers: String(row.kilometers || 0),
      qtyFilled: String(row.quantity_filled || 0),
      pricePerLitre: String(row.price_per_liter || 0),
      totalBill: String(row.total_bill || 0),
      averageKMPL: String(row.avg_kmpl || 0),
      remarks: String(row.remarks || ''),
      patientsTstdts: debits.length ? debits : [emptyLedgerLine<Ledger>()],
      creditaddrowdts: credits.length ? credits : [emptyLedgerLine<Ledger>()],
    })
  }

  const onDelete = async (row: Record<string, unknown>) => {
    if (!confirm(`Delete fuel entry ${row.c_number}?`)) return
    const res = await fuelService.deleteFuelEntry({ id: row.id, named, user_id })
    if (res?.status === 200) {
      toast.success('Entry deleted')
      qc.invalidateQueries({ queryKey: ['fuel-entries'] })
    } else toast.error(res?.message || 'Failed')
  }

  const onView = async (row: Record<string, unknown>) => {
    const accRes = await fuelService.getFuelAccounts({ id: row.id })
    setViewRow({ ...row, _accounts: accRes?.data || [] })
  }

  // Columns kept in same order as old Angular table minus Target / Driver 1 / Driver 2.
  const entryColumns: Column[] = useMemo(() => [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _r, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Ref #', key: 'c_number', filterable: true },
    { label: 'Date', key: 'date', render: (v) => formatDate(String(v ?? '')) },
    { label: 'Vehicle No', key: 'vehicle_number', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v ?? '—')}</span> },
    { label: 'Prev Odo', key: 'previous_odometer' },
    { label: 'Present Odo', key: 'present_odometer' },
    { label: 'Debit Ledger', key: 'debit_ledger_id', filterable: true, render: (v) => v ? String(v) : '—' },
    { label: 'Credit Ledger', key: 'credit_ledger_id', filterable: true, render: (v) => v ? String(v) : '—' },
    { label: 'KMs', key: 'kilometers' },
    { label: 'Qty (L)', key: 'quantity_filled' },
    { label: 'Price/L', key: 'price_per_liter', render: (v) => v ? `₹${formatAmount(v)}` : '—' },
    { label: 'Bill', key: 'total_bill', render: (v) => v ? <span className="font-bold">₹{formatAmount(v)}</span> : '—' },
    { label: 'Avg KMPL', key: 'avg_kmpl' },
    { label: 'Remarks', key: 'remarks', render: (v) => v ? <span className="text-slate-600 text-xs">{String(v)}</span> : '—' },
    {
      label: 'Status', key: 'status_label', filterable: true,
      render: (_v, r: Record<string, unknown>) => {
        const status = Number(r.admin_status)
        if (status === 1) return <Badge variant="success">Approved</Badge>
        if (status === 2) return <Badge variant="danger">Rejected</Badge>
        return (
          <select
            className="text-xs border rounded px-2 py-1"
            value={status}
            onChange={(e) => onStatusChange(r, Number(e.target.value))}
          >
            <option value={0}>Pending</option>
            <option value={1}>Approve</option>
            <option value={2}>Reject</option>
          </select>
        )
      },
    },
  ], [])

  const handleAction = (action: string, row: Record<string, unknown>) => {
    if (action === 'view') onView(row)
    else if (action === 'edit') {
      if (Number(row.admin_status) === 1 || Number(row.admin_status) === 2) {
        return toast.error('Approved / rejected entries cannot be edited')
      }
      onEdit(row)
    } else if (action === 'delete') {
      if (Number(row.admin_status) === 1 || Number(row.admin_status) === 2) {
        return toast.error('Approved / rejected entries cannot be deleted')
      }
      onDelete(row)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Fuel Entry" subtitle="Record daily fuel fills for each vehicle" />

      <div className="flex justify-end">
        {!showForm && <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Log Fuel</Button>}
      </div>

          <AnimatePresence>
            {showForm && (
              <motion.div key="fuel-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                <GlassCard className="p-6" colorBar="bg-gradient-to-r from-amber-400 to-orange-500">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Fuel className="w-5 h-5 text-amber-500" /> Log Fuel Fill
                    </h2>
                    <button onClick={() => { setShowForm(false); setForm(emptyForm()) }} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
                  </div>
                  <FuelForm form={form} setForm={setForm} buses={buses} ledgers={ledgers} />
                  <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
                    <Button variant="ghost" onClick={() => { setShowForm(false); setForm(emptyForm()) }}>Cancel</Button>
                    <Button onClick={onSaveNew} disabled={isPending}>
                      <Save className="w-4 h-4" />
                      {isPending ? 'Saving…' : 'Save Entry'}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

      <DataTable
        title="Fuel Entry Records"
        columns={entryColumns}
        data={withStatusLabel(entryList)}
        loading={isLoading}
        onAction={handleAction}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />

      {/* View modal */}
      <AnimatePresence>
        {viewRow && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-4 flex justify-between items-center text-white">
                <h3 className="font-bold text-lg">Fuel Entry Details — {String(viewRow.c_number)}</h3>
                <button onClick={() => setViewRow(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div><b>Date:</b> {formatDate(String(viewRow.date ?? ''))}</div>
                  <div><b>Vehicle:</b> {String(viewRow.vehicle_number)}</div>
                  <div><b>Qty:</b> {String(viewRow.quantity_filled)} L</div>
                  <div><b>Price/L:</b> ₹{formatAmount(viewRow.price_per_liter)}</div>
                  <div><b>Bill:</b> ₹{formatAmount(viewRow.total_bill)}</div>
                  <div><b>Avg KMPL:</b> {String(viewRow.avg_kmpl)}</div>
                  <div><b>Prev Odo:</b> {String(viewRow.previous_odometer || viewRow.prev_odometer)}</div>
                  <div><b>Present Odo:</b> {String(viewRow.present_odometer)}</div>
                  <div><b>KMs:</b> {String(viewRow.kilometers)}</div>
                </div>
                {viewRow.remarks ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm">
                    <b>Remarks:</b> <span className="text-slate-700">{String(viewRow.remarks)}</span>
                  </div>
                ) : null}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-xl">
                    <div className="bg-blue-50 px-3 py-2 font-bold text-blue-700 rounded-t-xl">Debit Ledgers</div>
                    <table className="w-full text-sm">
                      <tbody>
                        {((viewRow._accounts as Array<Record<string, unknown>>) || [])
                          .filter((a) => a.account_type === 'Debit Account')
                          .map((a, i) => (
                            <tr key={i} className="border-t"><td className="p-2">{String(a.expensives)}</td><td className="p-2 text-right">₹{formatAmount(a.amount)}</td></tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border rounded-xl">
                    <div className="bg-emerald-50 px-3 py-2 font-bold text-emerald-700 rounded-t-xl">Credit Ledgers</div>
                    <table className="w-full text-sm">
                      <tbody>
                        {((viewRow._accounts as Array<Record<string, unknown>>) || [])
                          .filter((a) => a.account_type === 'Credit Account')
                          .map((a, i) => (
                            <tr key={i} className="border-t"><td className="p-2">{String(a.expensives)}</td><td className="p-2 text-right">₹{formatAmount(a.amount)}</td></tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit modal */}
      <AnimatePresence>
        {editForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-4 flex justify-between items-center text-white">
                <h3 className="font-bold text-lg">Edit Fuel Entry — {editForm.c_number}</h3>
                <button onClick={() => setEditForm(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6">
                <FuelForm form={editForm} setForm={setEditForm} buses={buses} ledgers={ledgers} />
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="ghost" onClick={() => setEditForm(null)}>Cancel</Button>
                  <Button onClick={onSaveEdit} disabled={updating}>
                    <Save className="w-4 h-4" /> {updating ? 'Updating…' : 'Update Entry'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
