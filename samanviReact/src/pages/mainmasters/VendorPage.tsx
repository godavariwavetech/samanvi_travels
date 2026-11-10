import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Save, X, Building2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Label, PageHeader, DataTable, SearchableSelect, useEditReason } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mainmastersService } from '@/services/mainmasters.service'
import { accountingService } from '@/services/accounting.service'
import { usePermissions } from '@/lib/usePermissions'
import { ledgerGroupName, isValidMobile } from '@/lib/utils'

const Req = () => <span className="text-red-500">*</span>
const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/

const empty = { vendor_name: '', mobile_number: '', gst_number: '', address: '', bank_account: '', ifsc_code: '', ledger_id: '' }

export default function VendorPage() {
  const qc = useQueryClient()
  const { canAdd } = usePermissions()
  const [form, setForm] = useState(empty)
  const [editId, setEditId] = useState<number | null>(null)
  const editReason = useEditReason(!!editId)
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({ queryKey: ['vendors'], queryFn: () => mainmastersService.getVendors() })
  const vendors: any[] = data?.data ?? []

  const { data: ledgersRes } = useQuery({ queryKey: ['ledgers'], queryFn: () => accountingService.getLedgerName() })
  const ledgers: any[] = ledgersRes?.data ?? []
  const ledgerOptions = useMemo(() => ledgers.map((l) => ({
    value: String(l.id), label: String(l.temple_name || l.subchildtwo || `Ledger #${l.id}`), hint: ledgerGroupName(l) || undefined,
  })), [ledgers])

  const set = (patch: Partial<typeof empty>) => setForm((f) => ({ ...f, ...patch }))
  const reset = () => { setForm(empty); setEditId(null) }

  // Optional fields are only checked when something is typed in them.
  const gst = form.gst_number.trim().toUpperCase()
  const ifsc = form.ifsc_code.trim().toUpperCase()
  const errors = {
    vendor_name: !form.vendor_name.trim() ? 'Vendor name is required' : '',
    mobile_number: form.mobile_number.trim() && !isValidMobile(form.mobile_number) ? 'Enter a valid 10-digit mobile number' : '',
    gst_number: gst && !GST_RE.test(gst) ? 'Enter a valid 15-character GST number' : '',
    ifsc_code: ifsc && !IFSC_RE.test(ifsc) ? 'Enter a valid 11-character IFSC code' : '',
    bank_account: form.bank_account.trim() && !/^[0-9]{6,20}$/.test(form.bank_account.trim()) ? 'Account number must be 6-20 digits' : '',
  }
  const invalid = Object.values(errors).some(Boolean)

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const ledger = ledgers.find((l) => String(l.id) === form.ledger_id)
      const payload = {
        ...form, gst_number: gst, ifsc_code: ifsc,
        ledger_id: form.ledger_id || null,
        ledger_name: ledger ? String(ledger.temple_name || ledger.subchildtwo || '') : '',
        usr_nm: localStorage.getItem('usr_nm'),
      }
      return editId ? mainmastersService.editVendor({ ...payload, id: editId }) : mainmastersService.addVendor(payload)
    },
    onSuccess: (res: any) => {
      if (res?.status === 200) {
        toast.success(editId ? 'Vendor updated' : 'Vendor added')
        qc.invalidateQueries({ queryKey: ['vendors'] })
        qc.invalidateQueries({ queryKey: ['ledgers'] })
        reset()
      } else toast.error(res?.msg || res?.message || 'Could not save the vendor')
    },
    onError: (e: any) => toast.error(e?.response?.data?.msg || 'Server error'),
  })

  const { mutate: del } = useMutation({
    mutationFn: (id: number) => mainmastersService.deleteVendor({ id }),
    onSuccess: (res: any) => {
      if (res?.status === 200) {
        toast.success('Vendor deleted')
        qc.invalidateQueries({ queryKey: ['vendors'] })
        qc.invalidateQueries({ queryKey: ['ledgers'] })
      } else toast.error('Failed')
    },
    onError: () => toast.error('Server error'),
  })

  const startEdit = (v: any) => {
    setEditId(v.id)
    setForm({
      vendor_name: v.vendor_name ?? '', mobile_number: v.mobile_number ?? '', gst_number: v.gst_number ?? '', address: v.address ?? '',
      bank_account: v.bank_account ?? '', ifsc_code: v.ifsc_code ?? '', ledger_id: v.ledger_id ? String(v.ledger_id) : '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const dash = (v: unknown) => String(v ?? '').trim() ? String(v) : <span className="text-slate-300">—</span>
  const columns: Column[] = [
    { label: 'Sl No', key: '_sl', align: 'center', render: (_v, _r, i) => i + 1 },
    { label: 'Vendor Name', key: 'vendor_name', filterable: true, render: (v) => <span className="font-semibold text-slate-800">{String(v)}</span> },
    { label: 'Mobile Number', key: 'mobile_number', filterable: true, render: dash },
    { label: 'GST Number', key: 'gst_number', filterable: true, render: dash },
    { label: 'Address', key: 'address', render: (v) => <span className="text-sm max-w-[16rem] block truncate" title={String(v ?? '')}>{dash(v)}</span> },
    { label: 'Bank Account', key: 'bank_account', filterable: true, render: dash },
    { label: 'IFSC Code', key: 'ifsc_code', filterable: true, render: dash },
    { label: 'Ledger', key: 'ledger_name', filterable: true, render: dash },
  ]

  const fieldError = (msg: string) => msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Vendors" subtitle="Vendor details with GST and bank information, linked to a ledger" />

      {(canAdd || editId) && (
        <GlassCard className="p-6" colorBar="bg-gradient-to-r from-blue-500 to-cyan-500">
          <h3 className="font-bold text-slate-700 flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-blue-500" /> {editId ? 'Edit Vendor' : 'Add Vendor'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Vendor Name <Req /></Label>
              <Input placeholder="Enter vendor name" value={form.vendor_name} onChange={(e) => set({ vendor_name: e.target.value })} />
              {form.vendor_name !== '' && fieldError(errors.vendor_name)}
            </div>
            <div>
              <Label>Mobile Number</Label>
              <Input placeholder="10-digit mobile number" inputMode="numeric" maxLength={10} value={form.mobile_number}
                onChange={(e) => set({ mobile_number: e.target.value.replace(/\D/g, '') })} />
              {fieldError(errors.mobile_number)}
            </div>
            <div>
              <Label>GST Number</Label>
              <Input placeholder="e.g. 36ABCDE1234F1Z5" maxLength={15} value={form.gst_number}
                onChange={(e) => set({ gst_number: e.target.value.toUpperCase() })} />
              {fieldError(errors.gst_number)}
            </div>
            <div>
              <Label>Ledger Name</Label>
              <SearchableSelect placeholder="Select ledger" options={ledgerOptions} value={form.ledger_id}
                onChange={(v) => set({ ledger_id: v })} onClear={() => set({ ledger_id: '' })} />
              <p className="text-[11px] text-slate-400 mt-1">The vendor's details are added to this ledger.</p>
            </div>
            <div className="md:col-span-3">
              <Label>Address</Label>
              <Input placeholder="Enter address" value={form.address} onChange={(e) => set({ address: e.target.value })} />
            </div>
            <div>
              <Label>Bank Account</Label>
              <Input placeholder="Account number" inputMode="numeric" maxLength={20} value={form.bank_account}
                onChange={(e) => set({ bank_account: e.target.value.replace(/\D/g, '') })} />
              {fieldError(errors.bank_account)}
            </div>
            <div>
              <Label>IFSC Code</Label>
              <Input placeholder="e.g. SBIN0001234" maxLength={11} value={form.ifsc_code}
                onChange={(e) => set({ ifsc_code: e.target.value.toUpperCase() })} />
              {fieldError(errors.ifsc_code)}
            </div>
          </div>
          {editReason.field && <div className="mt-4">{editReason.field}</div>}
          <div className="flex gap-3 mt-5">
            <Button onClick={() => { if (!editReason.check()) return; save() }} disabled={isPending || invalid || !editReason.ok}>
              <Save className="w-4 h-4" /> {isPending ? 'Saving…' : editId ? 'Update Vendor' : 'Save Vendor'}
            </Button>
            {(editId || form.vendor_name) && <Button variant="outline" onClick={reset}><X className="w-4 h-4" /> {editId ? 'Cancel' : 'Clear'}</Button>}
          </div>
        </GlassCard>
      )}

      <DataTable
        title={`Vendors (${vendors.length})`}
        columns={columns}
        data={vendors}
        loading={isLoading}
        actions={['edit', 'delete']}
        onAction={(action, row: any) => { if (action === 'edit') startEdit(row); else if (action === 'delete') del(row.id) }}
        columnFilters={colFilters}
        onColumnFilterChange={(key, vals) => setColFilters((f) => ({ ...f, [key]: vals }))}
        icon={<Building2 className="w-5 h-5 text-blue-500" />}
      />
    </motion.div>
  )
}
