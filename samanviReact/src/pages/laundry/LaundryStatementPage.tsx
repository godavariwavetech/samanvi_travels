import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { laundryService } from '@/services/laundry.service'
import { formatAmount, formatDate, withStatusLabel, todayISO } from '@/lib/utils'

// A vendor's statement: every laundry bill in the period with its vehicles,
// amount and approval, and what the period adds up to. Built on the bills
// list (/getlaundrybilldata) - the earlier version of this page rendered
// dispatch / receipt columns that no laundry API has ever returned, so it
// showed blanks.
const cols: Column[] = [
  { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _r, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
  { label: 'Date', key: 'voucherdate', render: (v) => <span className="font-bold">{formatDate(v)}</span> },
  { label: 'Bill No', key: 'c_number', filterable: true, render: (v) => <span className="font-semibold text-blue-600">{String(v)}</span> },
  { label: 'Vendor', key: 'vendor_name', filterable: true },
  { label: 'Vehicles', key: 'vehicle_count', align: 'center', render: (v) => <Badge variant="info">{String(v)}</Badge> },
  { label: 'Amount', key: 'total_amount', align: 'right', render: (v) => <span className="font-bold">₹{formatAmount(v)}</span> },
  { label: 'Status', key: 'status_label', filterable: true, render: (_v, r: any) => {
    const s = Number(r.admin_status)
    return <Badge variant={s === 1 ? 'success' : s === 2 ? 'danger' : 'warning'}>{s === 1 ? 'Approved' : s === 2 ? 'Rejected' : 'Pending'}</Badge>
  } },
  { label: 'Remarks', key: 'remarks', render: (v) => v ? <span className="text-xs text-slate-500">{String(v)}</span> : '—' },
]

const today = todayISO()

export default function LaundryStatementPage() {
  const [filter, setFilter] = useState({ vendor: '', from_date: '', to_date: '' })
  const [applied, setApplied] = useState(filter)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({ queryKey: ['laundry-bills'], queryFn: () => laundryService.getLaundryBills() })
  const { data: vendors } = useQuery({ queryKey: ['bill-vendors'], queryFn: () => laundryService.getVendorDropdown() })
  const vendorOptions = ((vendors?.data ?? []) as any[]).map((v) => ({ value: String(v.name), label: `${v.name} (${v.c_number})` }))

  // The bills API takes no filters, so the period and vendor are applied here.
  const list: any[] = useMemo(() => {
    const all: any[] = data?.data ?? []
    return withStatusLabel(all.filter((r) => {
      if (applied.vendor && String(r.vendor_name) !== applied.vendor) return false
      const d = String(r.voucherdate ?? '').split('T')[0]
      if (applied.from_date && d < applied.from_date) return false
      if (applied.to_date && d > applied.to_date) return false
      return true
    }))
  }, [data, applied])

  const sum = (rows: any[]) => rows.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  const approved = list.filter((r) => Number(r.admin_status) === 1)
  const pending = list.filter((r) => Number(r.admin_status) === 0)
  const vehicles = list.reduce((s, r) => s + (Number(r.vehicle_count) || 0), 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Laundry Statement" subtitle="Bills per vendor for a period, with what is approved and what is still pending" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-teal-500 to-emerald-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div className="min-w-[16rem]"><Label>Vendor</Label>
            <SearchableSelect placeholder="All Vendors" options={vendorOptions} value={filter.vendor}
              onChange={(v) => setFilter({ ...filter, vendor: v })} onClear={() => setFilter({ ...filter, vendor: '' })} /></div>
          <div><Label>From</Label><Input type="date" max={today} value={filter.from_date} onChange={(e) => setFilter({ ...filter, from_date: e.target.value })} /></div>
          <div><Label>To</Label><Input type="date" max={today} value={filter.to_date} onChange={(e) => setFilter({ ...filter, to_date: e.target.value })} /></div>
          <Button onClick={() => setApplied(filter)}><Search className="w-4 h-4" /> Generate</Button>
          {(applied.vendor || applied.from_date || applied.to_date) && (
            <button type="button" onClick={() => { const f = { vendor: '', from_date: '', to_date: '' }; setFilter(f); setApplied(f) }}
              className="text-xs text-slate-500 hover:text-red-500 font-medium underline">Clear</button>
          )}
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Bills', value: String(list.length), color: 'text-slate-800' },
          { label: 'Vehicles Billed', value: String(vehicles), color: 'text-blue-600' },
          { label: 'Approved', value: `₹${formatAmount(sum(approved))}`, color: 'text-emerald-600' },
          { label: 'Pending Approval', value: `₹${formatAmount(sum(pending))}`, color: 'text-amber-600' },
        ].map((s) => (
          <GlassCard key={s.label} className="p-5">
            <p className="text-xs font-bold text-slate-500 uppercase">{s.label}</p>
            <h3 className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</h3>
          </GlassCard>
        ))}
      </div>

      <DataTable
        title={`Laundry Statement · ₹${formatAmount(sum(list))}`} columns={cols} data={list} loading={isLoading}
        columnFilters={columnFilters} onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
