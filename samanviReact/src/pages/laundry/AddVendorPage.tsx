import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Shirt, Save, Plus, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { laundryService } from '@/services/laundry.service'
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
  district_id?: string | null
  mandal_name?: string | null
  mandal_id?: string | null
  subchildtwo_id?: string | null
  village_id?: number | null
}

type Product = { id: number; product_name: string }
type ProductRow = { d_test_name: Product | null; d_test_amount: string }

const today = new Date().toISOString().split('T')[0]

interface FormState {
  id: number | 0
  c_id: string
  c_number: string
  voucherdate: string
  fromdate: string
  todate: string
  selectedledger: Ledger | null
}

const emptyForm = (): FormState => ({
  id: 0, c_id: '', c_number: '',
  voucherdate: today, fromdate: '', todate: '',
  selectedledger: null,
})

function ledgerLabel(l: Ledger) {
  return l.temple_name || l.subchildtwo || `Ledger #${l.id}`
}

export default function AddVendorPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState<FormState>(emptyForm())
  const [products, setProducts] = useState<ProductRow[]>([])
  const [draft, setDraft] = useState<{ product: Product | null; amount: string }>({ product: null, amount: '' })
  const [mode, setMode] = useState<'add' | 'edit'>('add')

  const named = localStorage.getItem('usr_nm') ?? ''
  const user_id = localStorage.getItem('user_id') ?? '0'

  const { data: ledgersResp } = useQuery({
    queryKey: ['ledgers'],
    queryFn: () => accountingService.getLedgerName(),
  })
  const ledgers = (ledgersResp?.data ?? []) as Ledger[]

  // Product master fetched with an empty payload — the backend needs no filter
  // args, and the shared securePayload wrapper is happy with `{}`.
  const { data: productsResp } = useQuery({
    queryKey: ['laundry-products'],
    queryFn: () => laundryService.getLaundryTypes({}),
  })
  const productMaster = (productsResp?.data ?? []) as Product[]

  const { data: reportResp, isLoading } = useQuery({
    queryKey: ['laundry-report'],
    queryFn: () => laundryService.getLaundryReport(),
  })
  const flatRows = (reportResp?.data ?? []) as Array<Record<string, unknown>>

  // Group flat vendor × product rows back into one row per vendor with dynamic
  // product columns — mirrors the Angular `loadReport` grouping logic, moved
  // to the client so the SQL stays simple.
  const { vendorRows, productColumns } = useMemo(() => {
    type VendorAgg = {
      id: number; c_number: string; name: string; ledger: string;
      voucherdate: string; fromdate: string; todate: string;
      products: Record<string, number>
      raw: Array<Record<string, unknown>>
    }
    const byId: Record<number, VendorAgg> = {}
    const productKeys = new Set<string>()
    flatRows.forEach((r) => {
      const id = Number(r.id)
      if (!byId[id]) {
        byId[id] = {
          id,
          c_number: String(r.c_number || ''),
          name: String(r.name || ''),
          ledger: String(r.expensives || ''),
          voucherdate: String(r.voucherdate || ''),
          fromdate: String(r.fromdate || ''),
          todate: String(r.todate || ''),
          products: {},
          raw: [],
        }
      }
      byId[id].raw.push(r)
      const pname = String(r.product_name || '').trim()
      if (pname) {
        const key = pname.toLowerCase().replace(/\s+/g, '_')
        byId[id].products[key] = Number(r.amount || 0)
        productKeys.add(key + '::' + pname)
      }
    })
    const cols = Array.from(productKeys).map((k) => {
      const [key, label] = k.split('::')
      return { key, label }
    }).sort((a, b) => a.label.localeCompare(b.label))
    return { vendorRows: Object.values(byId), productColumns: cols }
  }, [flatRows])

  const grandTotal = products.reduce((s, r) => s + Number(r.d_test_amount || 0), 0)

  const validateSave = (): string | null => {
    if (!form.voucherdate) return 'Contract Date is required'
    if (!form.selectedledger) return 'Vendor Name is required'
    if (!form.fromdate) return 'Contract From Date is required'
    if (!form.todate) return 'Contract To Date is required'
    if (new Date(form.fromdate) >= new Date(form.todate)) return 'To Date must be after From Date'
    if (products.length === 0) return 'Add at least one product with rate'
    return null
  }

  const buildPayload = () => ({
    id: form.id,
    c_id: form.c_id,
    c_number: form.c_number,
    expensedetails: {
      voucherdate: form.voucherdate,
      name: form.selectedledger?.temple_name || '',
      fromdate: form.fromdate,
      todate: form.todate,
      selectedledger: form.selectedledger,
    },
    patientsTstdts: products,
    user_id, named,
  })

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => laundryService.submitLaundry(buildPayload()),
    onSuccess: (res) => {
      if (res?.status === 200) {
        toast.success(`Vendor saved (${res.data?.c_number || ''})`)
        qc.invalidateQueries({ queryKey: ['laundry-report'] })
        resetForm()
      } else toast.error(res?.message || 'Failed to save')
    },
    onError: () => toast.error('Server error'),
  })

  const { mutate: update, isPending: updating } = useMutation({
    mutationFn: () => laundryService.updateLaundry(buildPayload()),
    onSuccess: (res) => {
      if (res?.status === 200) {
        toast.success('Vendor updated')
        qc.invalidateQueries({ queryKey: ['laundry-report'] })
        resetForm()
      } else toast.error(res?.message || 'Failed to update')
    },
    onError: () => toast.error('Server error'),
  })

  const onSave = () => {
    const err = validateSave()
    if (err) return toast.error(err)
    if (mode === 'edit') update()
    else save()
  }

  const resetForm = () => {
    setForm(emptyForm())
    setProducts([])
    setDraft({ product: null, amount: '' })
    setMode('add')
  }

  const addProduct = () => {
    if (!draft.product) return toast.error('Pick a product')
    if (draft.amount === '' || Number(draft.amount) < 0) return toast.error('Enter a valid rate')
    // Compare by product_name (not id) because rows loaded during Edit come
    // from the DB with id=0 — the master id isn't stored on subt rows.
    const draftName = draft.product.product_name.trim().toLowerCase()
    const dup = products.some((p) =>
      (p.d_test_name?.product_name || '').trim().toLowerCase() === draftName
    )
    if (dup) return toast.error(`${draft.product.product_name} is already added — remove or update the existing row`)
    setProducts([...products, { d_test_name: draft.product, d_test_amount: draft.amount }])
    setDraft({ product: null, amount: '' })
  }

  const onEdit = (row: Record<string, unknown>) => {
    const id = Number(row.id)
    const agg = flatRows.filter((r) => Number(r.id) === id)
    if (agg.length === 0) return
    const first = agg[0]
    const ledgerId = first.ledger_id ? Number(first.ledger_id) : null
    const ledger = ledgerId ? (ledgers.find((l) => l.id === ledgerId) || {
      id: ledgerId, temple_name: String(first.expensives || ''),
    } as Ledger) : null
    setForm({
      id,
      c_id: String(row.c_id || ''),
      c_number: String(row.c_number || ''),
      voucherdate: String(row.voucherdate || today),
      fromdate: String(row.fromdate || ''),
      todate: String(row.todate || ''),
      selectedledger: ledger,
    })
    setProducts(agg.filter((r) => r.product_name).map((r) => ({
      d_test_name: {
        id: 0,
        product_name: String(r.product_name || ''),
      },
      d_test_amount: String(r.amount || 0),
    })))
    setMode('edit')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const onDelete = async (row: Record<string, unknown>) => {
    if (!confirm(`Delete vendor ${row.name}?`)) return
    const res = await laundryService.deleteLaundryVendor({ id: row.id })
    if (res?.status === 200) {
      toast.success('Vendor deleted')
      qc.invalidateQueries({ queryKey: ['laundry-report'] })
    } else toast.error(res?.message || 'Failed')
  }

  const tableCols: Column[] = useMemo(() => [
    { label: 'Ref #', key: 'c_number' },
    { label: 'Vendor Name', key: 'name', render: (v) => <span className="font-bold">{String(v)}</span> },
    { label: 'Ledger', key: 'ledger' },
    ...productColumns.map((pc) => ({
      label: `${pc.label} (₹)`, key: pc.key,
      render: (_v: unknown, r: Record<string, unknown>) => {
        const products = (r as unknown as { products: Record<string, number> }).products
        const val = products[pc.key] ?? 0
        return val > 0 ? `₹${val}` : <span className="text-slate-400">—</span>
      },
    })),
    { label: 'Contract From', key: 'fromdate' },
    { label: 'Contract To', key: 'todate' },
  ], [productColumns])

  const handleAction = (action: string, row: Record<string, unknown>) => {
    if (action === 'edit') onEdit(row)
    else if (action === 'delete') onDelete(row)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title={mode === 'edit' ? 'Edit Vendor Data' : 'Add Vendor Data'}
        subtitle="Register laundry vendors and their per-product rates"
      />

      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-teal-500 to-emerald-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Shirt className="w-5 h-5 text-teal-500" />
            {mode === 'edit' ? `Editing ${form.c_number}` : 'New Vendor'}
          </h2>
          <div className="flex gap-2">
            {mode === 'edit' && (
              <Button variant="ghost" onClick={resetForm}>Cancel</Button>
            )}
            <Button onClick={onSave} disabled={saving || updating}>
              <Save className="w-4 h-4" />
              {(saving || updating) ? 'Saving…' : (mode === 'edit' ? 'Update Vendor Contract' : 'Save Vendor Contract')}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Vendor Information */}
          <section>
            <h3 className="text-xs font-bold text-slate-600 uppercase border-b border-slate-200 pb-2 mb-4">
              Vendor Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label>Contract Date *</Label>
                <Input type="date" max={today} value={form.voucherdate}
                  onChange={(e) => setForm({ ...form, voucherdate: e.target.value })} />
              </div>
              <div>
                <Label>Vendor Name *</Label>
                <Select
                  value={form.selectedledger ? String(form.selectedledger.id) : ''}
                  onChange={(e) => {
                    const id = Number(e.target.value)
                    setForm({ ...form, selectedledger: ledgers.find((l) => l.id === id) || null })
                  }}
                >
                  <option value="">Select Vendor</option>
                  {ledgers.map((l) => (
                    <option key={l.id} value={l.id}>{ledgerLabel(l)}</option>
                  ))}
                </Select>
              </div>
            </div>
          </section>

          {/* Contract Period */}
          <section>
            <h3 className="text-xs font-bold text-slate-600 uppercase border-b border-slate-200 pb-2 mb-4">
              Contract Period
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label>From Date *</Label>
                <Input type="date" max={today} value={form.fromdate}
                  onChange={(e) => setForm({ ...form, fromdate: e.target.value })} />
              </div>
              <div>
                <Label>To Date *</Label>
                <Input type="date" min={form.fromdate || undefined} value={form.todate}
                  onChange={(e) => setForm({ ...form, todate: e.target.value })} />
              </div>
            </div>
          </section>

          {/* Product Rates */}
          <section>
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">
              <h3 className="text-xs font-bold text-slate-600 uppercase">Product Rates</h3>
              <span className="text-sm font-bold text-teal-700">Total: ₹{grandTotal.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-6">
                <Label>Choose Product Name *</Label>
                <Select
                  value={draft.product ? String(draft.product.id) : ''}
                  onChange={(e) => {
                    const id = Number(e.target.value)
                    setDraft({ ...draft, product: productMaster.find((p) => p.id === id) || null })
                  }}
                >
                  <option value="">Select Product</option>
                  {productMaster.map((p) => (
                    <option key={p.id} value={p.id}>{p.product_name}</option>
                  ))}
                </Select>
              </div>
              <div className="col-span-4">
                <Label>Rate (₹) *</Label>
                <Input type="number" step="0.01" placeholder="Enter rate" value={draft.amount}
                  onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Button onClick={addProduct} className="w-full"><Plus className="w-4 h-4" /> Add</Button>
              </div>
            </div>

            <table className="w-full mt-4 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-2 text-left">S.No</th>
                  <th className="p-2 text-left">Product Name</th>
                  <th className="p-2 text-right">Rate (₹)</th>
                  <th className="p-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-slate-400">
                    No products added yet — pick a product above and enter its rate
                  </td></tr>
                )}
                <AnimatePresence>
                  {products.map((p, i) => (
                    <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-t border-slate-100">
                      <td className="p-2">{i + 1}</td>
                      <td className="p-2">{p.d_test_name?.product_name}</td>
                      <td className="p-2 text-right">₹{Number(p.d_test_amount).toFixed(2)}</td>
                      <td className="p-2 text-right">
                        <button onClick={() => setProducts(products.filter((_, idx) => idx !== i))} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </section>
        </div>
      </GlassCard>

      <DataTable
        title="Registered Vendors"
        columns={tableCols}
        data={vendorRows as unknown as Record<string, unknown>[]}
        loading={isLoading}
        onAction={handleAction}
        actions={['edit', 'delete']}
      />
    </motion.div>
  )
}
