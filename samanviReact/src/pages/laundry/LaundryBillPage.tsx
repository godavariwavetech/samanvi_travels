import { useState } from 'react'
import { motion } from 'motion/react'
import { Shirt, Save } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader, DynamicRows } from '@/components/shared'
import type { Column } from '@/components/shared'
import { laundryService } from '@/services/laundry.service'

const billCols: Column[] = [
  { label: 'Bill No', key: 'bill_no', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
  { label: 'Vendor', key: 'vendor_name' },
  { label: 'Date', key: 'bill_date' },
  { label: 'Items', key: 'item_count', render: (v) => <Badge variant="info">{String(v)} items</Badge> },
  { label: 'Total (₹)', key: 'total_amount', render: (v) => <span className="font-bold">₹{v}</span> },
  { label: 'Status', key: 'admin_status', render: (v) => <Badge variant={v == 1 ? 'success' : 'warning'}>{v == 1 ? 'Approved' : 'Pending'}</Badge> },
]

interface BillItem { item_name: string; qty: string; rate: string }

const today = new Date().toISOString().split('T')[0]

export default function LaundryBillPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ vendor_id: '', bill_date: new Date().toISOString().split('T')[0], remarks: '' })
  const [items, setItems] = useState<BillItem[]>([{ item_name: '', qty: '', rate: '' }])

  const { data: bills, isLoading } = useQuery({ queryKey: ['laundry-bills'], queryFn: () => laundryService.getLaundryBills() })
  const { data: vendors } = useQuery({ queryKey: ['vendors'], queryFn: () => laundryService.getVendorDropdown() })

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => laundryService.submitLaundryBill({ ...form, items, user_id: localStorage.getItem('user_id'), usr_nm: localStorage.getItem('usr_nm') }),
    onSuccess: (res) => { if (res.status === 200) { toast.success('Bill saved!'); qc.invalidateQueries({ queryKey: ['laundry-bills'] }); setForm({ vendor_id: '', bill_date: new Date().toISOString().split('T')[0], remarks: '' }); setItems([{ item_name: '', qty: '', rate: '' }]) } else toast.error('Failed') },
    onError: () => toast.error('Server error'),
  })

  const total = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0)
  const vendorList: any[] = vendors?.data ?? []
  const billList: any[] = bills?.data ?? []

  const handleAction = (action: string, row: any) => {
    if (action === 'delete') laundryService.deleteLaundryBill({ id: row.id }).then(() => { toast.success('Bill deleted'); qc.invalidateQueries({ queryKey: ['laundry-bills'] }) })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Laundry Bill" subtitle="Log laundry bills against vendor contracts" />
      <GlassCard className="p-6" colorBar="bg-gradient-to-r from-teal-400 to-cyan-500">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Shirt className="w-5 h-5 text-teal-500" /> Add Laundry Bill</h2>
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-600">Total: <span className="text-teal-600">₹{total.toLocaleString('en-IN')}</span></span>
            <Button onClick={() => save()} disabled={isPending}><Save className="w-4 h-4" />{isPending ? 'Saving…' : 'Save Bill'}</Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
          <div><Label>Vendor *</Label>
            <Select value={form.vendor_id} onChange={(e) => setForm({ ...form, vendor_id: e.target.value })}>
              <option value="">Select Vendor</option>
              {vendorList.map((v) => <option key={v.id} value={v.id}>{v.vendor_name}</option>)}
            </Select></div>
          <div><Label>Bill Date</Label><Input type="date" max={today} value={form.bill_date} onChange={(e) => setForm({ ...form, bill_date: e.target.value })} /></div>
          <div><Label>Remarks</Label><Input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></div>
        </div>
        <DynamicRows
          columns={['Item / Product', 'Quantity', 'Rate (₹)']}
          rows={items}
          onAdd={() => setItems([...items, { item_name: '', qty: '', rate: '' }])}
          onRemove={(i) => setItems(items.filter((_, idx) => idx !== i))}
          renderRow={(r, i) => (<>
            <Input className="flex-[2]" placeholder="e.g. Blanket Wash" value={r.item_name} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, item_name: e.target.value } : x))} />
            <Input className="flex-1 text-center" type="number" placeholder="Qty" value={r.qty} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, qty: e.target.value } : x))} />
            <Input className="flex-1 text-right" type="number" placeholder="Rate" value={r.rate} onChange={(e) => setItems(items.map((x, idx) => idx === i ? { ...x, rate: e.target.value } : x))} />
          </>)}
        />
      </GlassCard>
      <DataTable title="Laundry Bills" columns={billCols} data={billList} loading={isLoading} onAction={handleAction} />
    </motion.div>
  )
}
