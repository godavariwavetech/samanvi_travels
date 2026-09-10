import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Fuel, Save, Plus, X, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'
import { mastersService } from '@/services/masters.service'
import { accountingService } from '@/services/accounting.service'

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

type DebitRow = { d_test_name: Ledger | ''; d_test_amount: string }
type CreditRow = { creditledger: Ledger | ''; creditamount: string }

const emptyForm = () => ({
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
  patientsTstdts: [] as DebitRow[],
  creditaddrowdts: [] as CreditRow[],
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
  if (f.patientsTstdts.length === 0) return 'Add at least one debit ledger'
  if (f.creditaddrowdts.length === 0) return 'Add at least one credit ledger'
  const debitSum = f.patientsTstdts.reduce((s, r) => s + Number(r.d_test_amount || 0), 0)
  const creditSum = f.creditaddrowdts.reduce((s, r) => s + Number(r.creditamount || 0), 0)
  const bill = Number(f.totalBill || 0)
  if (Math.abs(debitSum - creditSum) > 0.01) return `Debit ₹${debitSum.toFixed(2)} ≠ Credit ₹${creditSum.toFixed(2)}`
  if (Math.abs(debitSum - bill) > 0.01) return `Ledger total ₹${debitSum.toFixed(2)} ≠ Bill ₹${bill.toFixed(2)}`
  return null
}

// ─── Add-debit / add-credit inline forms ────────────────────────────────────
function LedgerRowAdder({
  ledgers, ledger, amount, onLedgerChange, onAmountChange, onAdd,
}: {
  ledgers: Ledger[]
  ledger: Ledger | ''
  amount: string
  onLedgerChange: (v: Ledger | '') => void
  onAmountChange: (v: string) => void
  onAdd: () => void
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-6">
        <Label>Ledger</Label>
        <Select
          value={ledger ? String(ledger.id) : ''}
          onChange={(e) => {
            const id = Number(e.target.value)
            onLedgerChange(ledgers.find((l) => l.id === id) || '')
          }}
        >
          <option value="">Select Ledger</option>
          {ledgers.map((l) => (
            <option key={l.id} value={l.id}>{ledgerLabel(l)}</option>
          ))}
        </Select>
      </div>
      <div className="col-span-4">
        <Label>Amount</Label>
        <Input type="number" value={amount} onChange={(e) => onAmountChange(e.target.value)} placeholder="0.00" />
      </div>
      <div className="col-span-2">
        <Button onClick={onAdd} className="w-full"><Plus className="w-4 h-4" /> Add</Button>
      </div>
    </div>
  )
}

// ─── The reusable form body (same markup for create + edit modal) ───────────
function FuelForm({ form, setForm, buses, ledgers }: {
  form: FormState
  setForm: (f: FormState) => void
  buses: { id: number; bus_no: string; odometer?: string }[]
  ledgers: Ledger[]
}) {
  const [debitDraft, setDebitDraft] = useState<{ ledger: Ledger | ''; amount: string }>({ ledger: '', amount: '' })
  const [creditDraft, setCreditDraft] = useState<{ ledger: Ledger | ''; amount: string }>({ ledger: '', amount: '' })

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
    setForm(next)
  }

  const debitSum = form.patientsTstdts.reduce((s, r) => s + Number(r.d_test_amount || 0), 0)
  const creditSum = form.creditaddrowdts.reduce((s, r) => s + Number(r.creditamount || 0), 0)
  const bill = Number(form.totalBill || 0)
  const balanced = Math.abs(debitSum - creditSum) < 0.01 && Math.abs(debitSum - bill) < 0.01

  return (
    <div className="space-y-6">
      {/* Vehicle & Odometer */}
      <section>
        <h4 className="text-sm font-bold text-slate-700 mb-3">Vehicle & Odometer</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label>Date *</Label>
            <Input type="date" max={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          <div><Label>Vehicle Number *</Label>
            <Select value={form.vehicleNumber} onChange={(e) => onVehicleChange(e.target.value)}>
              <option value="">Select Vehicle</option>
              {buses.map((b) => <option key={b.id} value={b.bus_no}>{b.bus_no}</option>)}
            </Select></div>
          <div><Label>Previous Odometer</Label>
            <Input type="number" value={form.previousOdometer} onChange={(e) => recompute({ previousOdometer: e.target.value })} /></div>
          <div><Label>Present Odometer *</Label>
            <Input type="number" value={form.presentOdometer} onChange={(e) => recompute({ presentOdometer: e.target.value })} /></div>
          <div><Label>Kilometers (auto)</Label>
            <Input value={form.kilometers} readOnly className="bg-slate-50" /></div>
        </div>
      </section>

      {/* Fuel Information */}
      <section>
        <h4 className="text-sm font-bold text-slate-700 mb-3">Fuel Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div><Label>Quantity Filled (L) *</Label>
            <Input type="number" value={form.qtyFilled} onChange={(e) => recompute({ qtyFilled: e.target.value })} /></div>
          <div><Label>Price / Litre (₹) *</Label>
            <Input type="number" value={form.pricePerLitre} onChange={(e) => recompute({ pricePerLitre: e.target.value })} /></div>
          <div><Label>Total Bill (auto)</Label>
            <Input value={form.totalBill} readOnly className="bg-slate-50" /></div>
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
      {(form.patientsTstdts.length > 0 || form.creditaddrowdts.length > 0) && (
        <div className={`rounded-xl p-4 border ${balanced ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex flex-wrap gap-6 text-sm">
            <span>Total Debit: <b>₹{debitSum.toFixed(2)}</b></span>
            <span>Total Credit: <b>₹{creditSum.toFixed(2)}</b></span>
            <span>Bill: <b>₹{bill.toFixed(2)}</b></span>
            <span className={balanced ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
              {balanced ? '✓ Balanced' : `Diff ₹${Math.abs(debitSum - creditSum).toFixed(2)}`}
            </span>
          </div>
        </div>
      )}

      {/* Debit + Credit ledger sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex justify-between mb-3">
            <h4 className="font-bold text-slate-700">Debit Account</h4>
            <span className="font-bold text-blue-600">₹{debitSum.toFixed(2)}</span>
          </div>
          <LedgerRowAdder
            ledgers={ledgers}
            ledger={debitDraft.ledger}
            amount={debitDraft.amount}
            onLedgerChange={(v) => setDebitDraft({ ...debitDraft, ledger: v })}
            onAmountChange={(v) => setDebitDraft({ ...debitDraft, amount: v })}
            onAdd={() => {
              if (!debitDraft.ledger || !debitDraft.amount) return toast.error('Pick a ledger and amount')
              setForm({ ...form, patientsTstdts: [...form.patientsTstdts, { d_test_name: debitDraft.ledger, d_test_amount: debitDraft.amount }] })
              setDebitDraft({ ledger: '', amount: '' })
            }}
          />
          <table className="w-full mt-3 text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="p-2 text-left">Ledger</th><th className="p-2 text-right">Amount</th><th className="p-2"></th>
            </tr></thead>
            <tbody>
              {form.patientsTstdts.length === 0 && (
                <tr><td colSpan={3} className="p-3 text-center text-slate-400">No debit entries yet</td></tr>
              )}
              {form.patientsTstdts.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{typeof r.d_test_name === 'object' ? ledgerLabel(r.d_test_name) : ''}</td>
                  <td className="p-2 text-right">₹{Number(r.d_test_amount).toFixed(2)}</td>
                  <td className="p-2 text-right">
                    <button onClick={() => setForm({ ...form, patientsTstdts: form.patientsTstdts.filter((_, idx) => idx !== i) })} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex justify-between mb-3">
            <h4 className="font-bold text-slate-700">Credit Account</h4>
            <span className="font-bold text-emerald-600">₹{creditSum.toFixed(2)}</span>
          </div>
          <LedgerRowAdder
            ledgers={ledgers}
            ledger={creditDraft.ledger}
            amount={creditDraft.amount}
            onLedgerChange={(v) => setCreditDraft({ ...creditDraft, ledger: v })}
            onAmountChange={(v) => setCreditDraft({ ...creditDraft, amount: v })}
            onAdd={() => {
              if (!creditDraft.ledger || !creditDraft.amount) return toast.error('Pick a ledger and amount')
              setForm({ ...form, creditaddrowdts: [...form.creditaddrowdts, { creditledger: creditDraft.ledger, creditamount: creditDraft.amount }] })
              setCreditDraft({ ledger: '', amount: '' })
            }}
          />
          <table className="w-full mt-3 text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="p-2 text-left">Ledger</th><th className="p-2 text-right">Amount</th><th className="p-2"></th>
            </tr></thead>
            <tbody>
              {form.creditaddrowdts.length === 0 && (
                <tr><td colSpan={3} className="p-3 text-center text-slate-400">No credit entries yet</td></tr>
              )}
              {form.creditaddrowdts.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{typeof r.creditledger === 'object' ? ledgerLabel(r.creditledger) : ''}</td>
                  <td className="p-2 text-right">₹{Number(r.creditamount).toFixed(2)}</td>
                  <td className="p-2 text-right">
                    <button onClick={() => setForm({ ...form, creditaddrowdts: form.creditaddrowdts.filter((_, idx) => idx !== i) })} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function FuelEntryPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [editForm, setEditForm] = useState<FormState | null>(null)
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null)

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
    mutationFn: () => fuelService.submitFuelEntry({ ...form, named, user_id }),
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
    mutationFn: () => fuelService.updateFuelEntry({ ...(editForm as FormState), named, user_id }),
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
    const debits = rows.filter((r) => r.account_type === 'Debit Account').map((r) => ({
      d_test_name: { id: Number(r.ledger_id), temple_name: String(r.expensives || '') } as Ledger,
      d_test_amount: String(r.amount || 0),
    }))
    const credits = rows.filter((r) => r.account_type === 'Credit Account').map((r) => ({
      creditledger: { id: Number(r.ledger_id), temple_name: String(r.expensives || '') } as Ledger,
      creditamount: String(r.amount || 0),
    }))
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
      patientsTstdts: debits,
      creditaddrowdts: credits,
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
    { label: 'Ref #', key: 'c_number' },
    { label: 'Date', key: 'date' },
    { label: 'Bus No', key: 'vehicle_number' },
    { label: 'Prev Odo', key: 'previous_odometer' },
    { label: 'Present Odo', key: 'present_odometer' },
    { label: 'Dr Ledger', key: 'debit_ledger_id' },
    { label: 'Cr Ledger', key: 'credit_ledger_id' },
    { label: 'KMs', key: 'kilometers' },
    { label: 'Qty (L)', key: 'quantity_filled' },
    { label: 'Price/L', key: 'price_per_liter', render: (v) => v ? `₹${v}` : '—' },
    { label: 'Bill', key: 'total_bill', render: (v) => v ? <span className="font-bold">₹{v}</span> : '—' },
    { label: 'Avg KMPL', key: 'avg_kmpl' },
    { label: 'Remarks', key: 'remarks', render: (v) => v ? <span className="text-slate-600 text-xs">{String(v)}</span> : '—' },
    {
      label: 'Status', key: 'admin_status',
      render: (v, r: Record<string, unknown>) => {
        const status = Number(v)
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
                    <div className="flex gap-2">
                      <Button onClick={onSaveNew} disabled={isPending}>
                        <Save className="w-4 h-4" />
                        {isPending ? 'Saving…' : 'Save Entry'}
                      </Button>
                      <button onClick={() => { setShowForm(false); setForm(emptyForm()) }} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
                    </div>
                  </div>
                  <FuelForm form={form} setForm={setForm} buses={buses} ledgers={ledgers} />
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

      <DataTable
        title="Fuel Entry Records"
        columns={entryColumns}
        data={entryList}
        loading={isLoading}
        onAction={handleAction}
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
                  <div><b>Date:</b> {String(viewRow.date)}</div>
                  <div><b>Vehicle:</b> {String(viewRow.vehicle_number)}</div>
                  <div><b>Qty:</b> {String(viewRow.quantity_filled)} L</div>
                  <div><b>Price/L:</b> ₹{String(viewRow.price_per_liter)}</div>
                  <div><b>Bill:</b> ₹{String(viewRow.total_bill)}</div>
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
                            <tr key={i} className="border-t"><td className="p-2">{String(a.expensives)}</td><td className="p-2 text-right">₹{String(a.amount)}</td></tr>
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
                            <tr key={i} className="border-t"><td className="p-2">{String(a.expensives)}</td><td className="p-2 text-right">₹{String(a.amount)}</td></tr>
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
