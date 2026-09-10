import { Fragment, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Shirt, Save, Plus, Trash2, X } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { laundryService } from '@/services/laundry.service'
import { mastersService } from '@/services/masters.service'
import { accountingService } from '@/services/accounting.service'

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
type LedgerRow = { ledger: Ledger | null; amount: string }

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
function billTotal(rows: VehicleRow[]): number {
  return rows.reduce((s, r) => s + rowTotal(r), 0)
}
function ledgerLabel(l: Ledger) {
  return l.temple_name || l.subchildtwo || `Ledger #${l.id}`
}
function ledgerSum(rows: LedgerRow[]): number {
  return rows.reduce((s, r) => s + Number(r.amount || 0), 0)
}

// ── Inline sub-forms ─────────────────────────────────────────────────────
function LedgerAdder({
  ledgers, draft, setDraft, onAdd,
}: {
  ledgers: Ledger[]
  draft: { ledger: Ledger | null; amount: string }
  setDraft: (d: { ledger: Ledger | null; amount: string }) => void
  onAdd: () => void
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-end">
      <div className="col-span-6">
        <Label>Ledger</Label>
        <Select
          value={draft.ledger ? String(draft.ledger.id) : ''}
          onChange={(e) => {
            const id = Number(e.target.value)
            setDraft({ ...draft, ledger: ledgers.find((l) => l.id === id) || null })
          }}
        >
          <option value="">Select Ledger</option>
          {ledgers.map((l) => <option key={l.id} value={l.id}>{ledgerLabel(l)}</option>)}
        </Select>
      </div>
      <div className="col-span-4">
        <Label>Amount</Label>
        <Input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="0.00" />
      </div>
      <div className="col-span-2">
        <Button onClick={onAdd} className="w-full"><Plus className="w-4 h-4" /> Add</Button>
      </div>
    </div>
  )
}

// ── Bill form (used both inline and inside edit modal) ───────────────────
interface FormState extends ReturnType<typeof emptyForm> {}

function BillForm({
  form, setForm, vendors, ledgers, buses, rates, vehicleRows, setVehicleRows,
  debits, setDebits, credits, setCredits,
}: {
  form: FormState
  setForm: (f: FormState) => void
  vendors: Vendor[]
  ledgers: Ledger[]
  buses: { id: number; bus_no: string }[]
  rates: VendorRate[]
  vehicleRows: VehicleRow[]
  setVehicleRows: (v: VehicleRow[]) => void
  debits: LedgerRow[]
  setDebits: (d: LedgerRow[]) => void
  credits: LedgerRow[]
  setCredits: (c: LedgerRow[]) => void
}) {
  const [debitDraft, setDebitDraft] = useState<{ ledger: Ledger | null; amount: string }>({ ledger: null, amount: '' })
  const [creditDraft, setCreditDraft] = useState<{ ledger: Ledger | null; amount: string }>({ ledger: null, amount: '' })

  const total = billTotal(vehicleRows)
  const debitSum = ledgerSum(debits)
  const creditSum = ledgerSum(credits)
  const balanced = Math.abs(debitSum - creditSum) < 0.01 && Math.abs(debitSum - total) < 0.01

  const productCols = rates.map((r) => r.product_name)

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
            <Label>Vendor Name *</Label>
            <Select
              value={form.vendor ? String(form.vendor.id) : ''}
              onChange={(e) => {
                const id = Number(e.target.value)
                setForm({ ...form, vendor: vendors.find((v) => v.id === id) || null })
              }}
            >
              <option value="">Select Vendor</option>
              {vendors.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.c_number})</option>)}
            </Select>
          </div>
          <div>
            <Label>Bill Date *</Label>
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
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-teal-700">Bill Total: ₹{total.toFixed(2)}</span>
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
            {form.vendor ? 'Click "Add Row" to bill for a vehicle' : 'Pick a vendor to enable rows'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-max">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left">S.No</th>
                  <th className="p-2 text-left min-w-[140px]">Vehicle No *</th>
                  <th className="p-2 text-left min-w-[110px]">Service No</th>
                  {productCols.map((pc) => (
                    <th key={pc} className="p-2 text-center min-w-[100px]" colSpan={2}>{pc}<div className="text-[10px] font-normal text-slate-500">Qty × Rate</div></th>
                  ))}
                  <th className="p-2 text-right min-w-[100px]">Row Total</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {vehicleRows.map((row, ri) => (
                  <tr key={ri} className="border-t border-slate-100">
                    <td className="p-2">{ri + 1}</td>
                    <td className="p-2">
                      <Select value={row.vehicle_no} onChange={(e) => updateVehicleField(ri, { vehicle_no: e.target.value })}>
                        <option value="">Select</option>
                        {buses.map((b) => <option key={b.id} value={b.bus_no}>{b.bus_no}</option>)}
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input value={row.service_no} onChange={(e) => updateVehicleField(ri, { service_no: e.target.value })} placeholder="e.g. ST-11" />
                    </td>
                    {row.products.map((p, pi) => (
                      <Fragment key={pi}>
                        <td className="p-2">
                          <Input type="number" min="0" value={p.qty} onChange={(e) => updateProductQty(ri, pi, e.target.value)} className="text-right" placeholder="0" />
                        </td>
                        <td className="p-2 text-slate-500 text-right text-xs">₹{p.rate}</td>
                      </Fragment>
                    ))}
                    <td className="p-2 text-right font-bold">₹{rowTotal(row).toFixed(2)}</td>
                    <td className="p-2 text-right">
                      <button onClick={() => setVehicleRows(vehicleRows.filter((_, i) => i !== ri))} className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Balance summary */}
      {(debits.length > 0 || credits.length > 0) && (
        <div className={`rounded-xl p-4 border ${balanced ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex flex-wrap gap-6 text-sm">
            <span>Bill Total: <b>₹{total.toFixed(2)}</b></span>
            <span>Debit: <b>₹{debitSum.toFixed(2)}</b></span>
            <span>Credit: <b>₹{creditSum.toFixed(2)}</b></span>
            <span className={balanced ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
              {balanced ? '✓ Balanced' : `Diff ₹${Math.abs(debitSum - creditSum).toFixed(2)}`}
            </span>
          </div>
        </div>
      )}

      {/* Debit + Credit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-4">
          <div className="flex justify-between mb-3">
            <h4 className="font-bold text-slate-700">Debit Account</h4>
            <span className="font-bold text-blue-600">₹{debitSum.toFixed(2)}</span>
          </div>
          <LedgerAdder ledgers={ledgers} draft={debitDraft} setDraft={setDebitDraft}
            onAdd={() => {
              if (!debitDraft.ledger || !debitDraft.amount) return toast.error('Pick a ledger and amount')
              setDebits([...debits, { ledger: debitDraft.ledger, amount: debitDraft.amount }])
              setDebitDraft({ ledger: null, amount: '' })
            }} />
          <table className="w-full mt-3 text-sm">
            <thead className="bg-slate-50"><tr><th className="p-2 text-left">Ledger</th><th className="p-2 text-right">Amount</th><th className="p-2"></th></tr></thead>
            <tbody>
              {debits.length === 0 && <tr><td colSpan={3} className="p-3 text-center text-slate-400">No debit entries yet</td></tr>}
              {debits.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{r.ledger ? ledgerLabel(r.ledger) : ''}</td>
                  <td className="p-2 text-right">₹{Number(r.amount).toFixed(2)}</td>
                  <td className="p-2 text-right">
                    <button onClick={() => setDebits(debits.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
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
          <LedgerAdder ledgers={ledgers} draft={creditDraft} setDraft={setCreditDraft}
            onAdd={() => {
              if (!creditDraft.ledger || !creditDraft.amount) return toast.error('Pick a ledger and amount')
              setCredits([...credits, { ledger: creditDraft.ledger, amount: creditDraft.amount }])
              setCreditDraft({ ledger: null, amount: '' })
            }} />
          <table className="w-full mt-3 text-sm">
            <thead className="bg-slate-50"><tr><th className="p-2 text-left">Ledger</th><th className="p-2 text-right">Amount</th><th className="p-2"></th></tr></thead>
            <tbody>
              {credits.length === 0 && <tr><td colSpan={3} className="p-3 text-center text-slate-400">No credit entries yet</td></tr>}
              {credits.map((r, i) => (
                <tr key={i} className="border-t border-slate-100">
                  <td className="p-2">{r.ledger ? ledgerLabel(r.ledger) : ''}</td>
                  <td className="p-2 text-right">₹{Number(r.amount).toFixed(2)}</td>
                  <td className="p-2 text-right">
                    <button onClick={() => setCredits(credits.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
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

// ── Main page ────────────────────────────────────────────────────────────
export default function LaundryBillPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [vehicleRows, setVehicleRows] = useState<VehicleRow[]>([])
  const [debits, setDebits] = useState<LedgerRow[]>([])
  const [credits, setCredits] = useState<LedgerRow[]>([])
  const [mode, setMode] = useState<'add' | 'edit'>('add')
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null)

  const named = localStorage.getItem('usr_nm') ?? ''
  const user_id = localStorage.getItem('user_id') ?? '0'

  const { data: vendorsResp } = useQuery({ queryKey: ['bill-vendors'], queryFn: () => laundryService.getVendorDropdown() })
  const { data: ledgersResp } = useQuery({ queryKey: ['ledgers'], queryFn: () => accountingService.getLedgerName() })
  const { data: busesResp } = useQuery({ queryKey: ['buses'], queryFn: () => mastersService.getBuses() })
  const { data: billsResp, isLoading } = useQuery({ queryKey: ['laundry-bills'], queryFn: () => laundryService.getLaundryBills() })

  const vendors = (vendorsResp?.data ?? []) as Vendor[]
  const ledgers = (ledgersResp?.data ?? []) as Ledger[]
  const buses = (busesResp?.data ?? []) as { id: number; bus_no: string }[]
  const bills = (billsResp?.data ?? []) as Record<string, unknown>[]

  // Fetch this vendor's product rates when the vendor changes.
  const { data: ratesResp } = useQuery({
    queryKey: ['vendor-rates', form.vendor?.id ?? 0],
    queryFn: () => laundryService.getSelectedVendor({ vendor_id: form.vendor?.id }),
    enabled: !!form.vendor?.id,
  })
  const rates = (ratesResp?.data ?? []) as VendorRate[]

  // When vendor rates arrive AND no rows exist yet, drop in a starter row. Also
  // auto-populate the credit side with vendor's ledger so user doesn't hand-type
  // "which ledger do we owe" — matches old Angular autofill behaviour.
  useEffect(() => {
    if (form.vendor && rates.length > 0 && vehicleRows.length === 0 && mode === 'add') {
      setVehicleRows([{
        vehicle_no: '', service_no: '',
        products: rates.map((r) => ({ product_name: r.product_name, qty: '', rate: String(r.amount || 0) })),
      }])
      if (form.vendor.ledger_id && credits.length === 0) {
        const l = ledgers.find((x) => x.id === Number(form.vendor?.ledger_id))
        if (l) setCredits([{ ledger: l, amount: '0' }])
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rates, form.vendor])

  const buildPayload = () => ({
    c_number: form.c_number,
    c_id: form.c_id,
    expensedetails: {
      voucherdate: form.voucherdate,
      remarks: form.remarks,
    },
    vendor: form.vendor,
    vehicles: vehicleRows.map((v) => ({
      vehicle_no: v.vehicle_no,
      service_no: v.service_no,
      products: v.products.map((p) => ({
        product_name: p.product_name,
        qty: p.qty,
        rate: p.rate,
        amount: (Number(p.qty || 0) * Number(p.rate || 0)).toFixed(2),
      })),
    })),
    patientsTstdts: debits.map((d) => ({ ledger: d.ledger, amount: d.amount })),
    creditaddrowdts: credits.map((c) => ({ ledger: c.ledger, amount: c.amount })),
    named, user_id,
  })

  const resetForm = () => {
    setForm(emptyForm()); setVehicleRows([]); setDebits([]); setCredits([]); setMode('add'); setShowForm(false)
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

  const onSave = () => {
    if (!form.vendor) return toast.error('Pick a vendor')
    if (vehicleRows.length === 0) return toast.error('Add at least one vehicle row')
    if (mode === 'edit') update()
    else save()
  }

  const onStatusChange = async (c_number: string, admin_status: number) => {
    const res = await laundryService.updateLaundryAdminStatus({ c_number, admin_status, named, user_id })
    if (res?.status === 200) {
      toast.success('Status updated')
      qc.invalidateQueries({ queryKey: ['laundry-bills'] })
    } else toast.error(res?.message || 'Failed')
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
        id: Number(a.parent_subgroup_id) || 0,
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
        id: Number(a.parent_subgroup_id) || 0,
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
    {
      label: 'Ref #', key: 'c_number',
      render: (v, r: Record<string, unknown>) => (
        <button onClick={() => onView(r)} className="text-blue-600 hover:underline font-medium">{String(v)}</button>
      ),
    },
    { label: 'Vendor', key: 'vendor_name' },
    { label: 'Date', key: 'voucherdate' },
    { label: 'Vehicles', key: 'vehicle_count' },
    { label: 'Total', key: 'total_amount', render: (v) => <span className="font-bold">₹{Number(v || 0).toFixed(2)}</span> },
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
            onChange={(e) => onStatusChange(String(r.c_number), Number(e.target.value))}
          >
            <option value={0}>Pending</option>
            <option value={1}>Approve</option>
            <option value={2}>Reject</option>
          </select>
        )
      },
    },
  ], [vendors])

  const handleAction = (action: string, row: Record<string, unknown>) => {
    if (action === 'view') onView(row)
    else if (action === 'edit') onEdit(row)
    else if (action === 'delete') {
      if (Number(row.admin_status) !== 0) return toast.error('Only bills on review can be deleted')
      onDelete(row)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title={mode === 'edit' ? 'Edit Laundry Bill' : 'Add Laundry Bill'} subtitle="Bill laundry vendors for washed items per vehicle" />

      <div className="flex justify-end">
        {!showForm && <Button onClick={() => setShowForm(true)}><Plus className="w-4 h-4" /> Add Laundry Bill</Button>}
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
                <div className="flex gap-2">
                  <Button onClick={onSave} disabled={saving || updating}>
                    <Save className="w-4 h-4" />
                    {(saving || updating) ? 'Saving…' : (mode === 'edit' ? 'Update Bill' : 'Save Bill')}
                  </Button>
                  <button onClick={resetForm} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <BillForm
                form={form} setForm={setForm}
                vendors={vendors} ledgers={ledgers} buses={buses} rates={rates}
                vehicleRows={vehicleRows} setVehicleRows={setVehicleRows}
                debits={debits} setDebits={setDebits} credits={credits} setCredits={setCredits}
              />
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      <DataTable
        title="Laundry Bills"
        columns={cols}
        data={bills}
        loading={isLoading}
        onAction={handleAction}
        actions={['view', 'edit', 'delete']}
      />

      {/* View modal */}
      <AnimatePresence>
        {viewRow && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-r from-teal-400 to-cyan-500 px-6 py-4 flex justify-between items-center text-white">
                <h3 className="font-bold text-lg">Laundry Bill — {String(viewRow.c_number)}</h3>
                <button onClick={() => setViewRow(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div><b>Vendor:</b> {String(viewRow.vendor_name || '—')}</div>
                  <div><b>Date:</b> {String(viewRow.voucherdate || '—')}</div>
                  <div><b>Vehicles:</b> {String(viewRow.vehicle_count || 0)}</div>
                  <div><b>Total:</b> ₹{Number(viewRow.total_amount || 0).toFixed(2)}</div>
                </div>
                {viewRow.remarks ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm">
                    <b>Remarks:</b> <span className="text-slate-700">{String(viewRow.remarks)}</span>
                  </div>
                ) : null}
                <div>
                  <h4 className="font-bold text-slate-700 mb-2">Vehicles</h4>
                  <table className="w-full text-xs border rounded-xl overflow-hidden">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="p-2 text-left">Vehicle</th>
                        <th className="p-2 text-left">Service</th>
                        <th className="p-2 text-right">Blankets</th>
                        <th className="p-2 text-right">Whites</th>
                        <th className="p-2 text-right">Pillow</th>
                        <th className="p-2 text-right">Bed Covers</th>
                        <th className="p-2 text-right">Curtains</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {((viewRow._details as { vehicles: Array<Record<string, unknown>> })?.vehicles || []).map((v, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{String(v.vehicle_no || '')}</td>
                          <td className="p-2">{String(v.service_no || '')}</td>
                          <td className="p-2 text-right">{v.blanket_qty ? `${v.blanket_qty}×${v.blanket_rate} = ₹${v.blanket_amount}` : '—'}</td>
                          <td className="p-2 text-right">{v.white_qty ? `${v.white_qty}×${v.white_rate} = ₹${v.white_amount}` : '—'}</td>
                          <td className="p-2 text-right">{v.pillow_qty ? `${v.pillow_qty}×${v.pillow_rate} = ₹${v.pillow_amount}` : '—'}</td>
                          <td className="p-2 text-right">{v.cover_qty ? `${v.cover_qty}×${v.cover_rate} = ₹${v.cover_amount}` : '—'}</td>
                          <td className="p-2 text-right">{v.curtain_qty ? `${v.curtain_qty}×${v.curtain_rate} = ₹${v.curtain_amount}` : '—'}</td>
                          <td className="p-2 text-right font-bold">₹{Number(v.totalamount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-xl">
                    <div className="bg-blue-50 px-3 py-2 font-bold text-blue-700 rounded-t-xl">Debit Ledgers</div>
                    <table className="w-full text-sm">
                      <tbody>
                        {((viewRow._details as { accounts: Array<Record<string, unknown>> })?.accounts || []).filter((a) => a.account_type === 'Debit Account').map((a, i) => (
                          <tr key={i} className="border-t"><td className="p-2">{String(a.expensives || '')}</td><td className="p-2 text-right">₹{String(a.amount || 0)}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="border rounded-xl">
                    <div className="bg-emerald-50 px-3 py-2 font-bold text-emerald-700 rounded-t-xl">Credit Ledgers</div>
                    <table className="w-full text-sm">
                      <tbody>
                        {((viewRow._details as { accounts: Array<Record<string, unknown>> })?.accounts || []).filter((a) => a.account_type === 'Credit Account').map((a, i) => (
                          <tr key={i} className="border-t"><td className="p-2">{String(a.expensives || '')}</td><td className="p-2 text-right">₹{String(a.amount || 0)}</td></tr>
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
    </motion.div>
  )
}
