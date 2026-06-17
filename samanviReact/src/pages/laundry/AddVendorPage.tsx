import { useState } from 'react'
import { motion } from 'motion/react'
import { Shirt, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, TopNavTabs, PageHeader, DynamicRows } from '@/components/shared'
import type { Column } from '@/components/shared'
import { laundryService } from '@/services/laundry.service'

const tabs = ['Add Vendor', 'Laundry Bill', 'Statement', 'Approved Vouchers']

const vendorColumns: Column[] = [
  { label: 'Vendor Name', key: 'vendor_name', render: (v, r: any) => <div><div className="font-bold">{String(v)}</div><div className="text-xs">GST: {r.gst_number}</div></div> },
  { label: 'Location', key: 'location' },
  { label: 'Mobile', key: 'mobile' },
  { label: 'Contract', key: 'contract_start', render: (v, r: any) => <span className="text-sm">{String(v)} → {r.contract_end}</span> },
  { label: 'Status', key: 'status', render: (v) => <Badge variant="success">{String(v)}</Badge> },
]

interface ProductRow { product: string; rate: string }

const today = new Date().toISOString().split('T')[0]

export default function AddVendorPage() {
  const [tab, setTab] = useState('Add Vendor')
  const qc = useQueryClient()
  const [form, setForm] = useState({ vendor_name: '', gst_number: '', mobile: '', location: '', linked_ledger: '', contract_start: '', contract_end: '' })
  const [products, setProducts] = useState<ProductRow[]>([{ product: '', rate: '' }])

  const { data: vendors, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => laundryService.getVendorDropdown(),
  })

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Vendor & Laundry" subtitle="Manage laundry vendors, bills and statements" />
      <TopNavTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === 'Add Vendor' && (
        <>
          <GlassCard className="p-6" colorBar="bg-gradient-to-r from-teal-500 to-emerald-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Shirt className="w-5 h-5 text-teal-500" /> Vendor Registration</h2>
              <Button onClick={() => toast.info('Save vendor')}><Save className="w-4 h-4" />Save Vendor</Button>
            </div>
            <div className="space-y-6">
              <section>
                <h3 className="text-xs font-bold text-slate-600 uppercase border-b border-slate-200 pb-2 mb-4">1. Vendor Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div><Label>Vendor Name</Label><Input placeholder="e.g. Godavari Linen Services" value={form.vendor_name} onChange={f('vendor_name')} /></div>
                  <div><Label>GST Number</Label><Input placeholder="37ABCDE1234F1ZP" value={form.gst_number} onChange={f('gst_number')} /></div>
                  <div><Label>Mobile Number</Label><Input placeholder="+91 9876543210" value={form.mobile} onChange={f('mobile')} /></div>
                  <div className="md:col-span-2"><Label>Location / Address</Label><Input value={form.location} onChange={f('location')} /></div>
                  <div><Label>Linked Ledger</Label>
                    <Select value={form.linked_ledger} onChange={f('linked_ledger')}>
                      <option>Sundry Creditors - Vendors</option>
                    </Select></div>
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold text-slate-600 uppercase border-b border-slate-200 pb-2 mb-4">2. Contract Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div><Label>Contract Start</Label><Input type="date" max={today} value={form.contract_start} onChange={f('contract_start')} /></div>
                  <div><Label>Contract End</Label><Input type="date" value={form.contract_end} onChange={f('contract_end')} /></div>
                  <div><Label>Status</Label><Select><option>Active Contract</option><option>Expired</option></Select></div>
                </div>
              </section>
              <section>
                <h3 className="text-xs font-bold text-slate-600 uppercase border-b border-slate-200 pb-2 mb-4">3. Product Pricing</h3>
                <DynamicRows
                  columns={['Product / Service Name', 'Rate (₹) per unit']}
                  rows={products}
                  onAdd={() => setProducts([...products, { product: '', rate: '' }])}
                  onRemove={(i) => setProducts(products.filter((_, idx) => idx !== i))}
                  renderRow={(r, i) => (
                    <>
                      <Input className="flex-1" placeholder="e.g. Blanket Wash" value={r.product}
                        onChange={(e) => setProducts(products.map((p, idx) => idx === i ? { ...p, product: e.target.value } : p))} />
                      <Input className="flex-1" type="number" placeholder="Rate" value={r.rate}
                        onChange={(e) => setProducts(products.map((p, idx) => idx === i ? { ...p, rate: e.target.value } : p))} />
                    </>
                  )}
                />
              </section>
            </div>
          </GlassCard>
          <DataTable title="Registered Vendors" columns={vendorColumns} data={vendors?.data ?? []} loading={isLoading} onAction={() => {}} />
        </>
      )}
    </motion.div>
  )
}
