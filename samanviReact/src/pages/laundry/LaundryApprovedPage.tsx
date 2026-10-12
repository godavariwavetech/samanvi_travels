import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { laundryService } from '@/services/laundry.service'
import { formatAmount, formatDate, formatDateTime } from '@/lib/utils'

// Approved laundry bills, one row per bill. The list comes from
// /getlaundryapproveddata, which returns approved bills only under these
// column names; the search box narrows that list in the browser (the old
// server search took a date range, not the text the box collects).
const cols: Column[] = [
  { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _r, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
  { label: 'Bill No', key: 'bill_no', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
  { label: 'Vendor', key: 'vendor_name', filterable: true },
  { label: 'Date', key: 'bill_date', render: (v) => formatDate(v) },
  { label: 'Vehicles', key: 'item_count', align: 'center', render: (v) => <Badge variant="teal">{String(v)} vehicle{Number(v) === 1 ? '' : 's'}</Badge> },
  { label: 'Amount', key: 'total_amount', align: 'right', render: (v) => <span className="font-bold">₹{formatAmount(v)}</span> },
  { label: 'Approved By', key: 'approved_by', filterable: true, render: (v, r: any) => (
    <div>
      <div className="text-sm">{String(v || '—')}</div>
      {r.approved_on && <div className="text-[11px] text-slate-400">{formatDateTime(r.approved_on)}</div>}
    </div>
  ) },
  { label: 'Status', key: 'admin_status', render: () => <Badge variant="success">Approved</Badge> },
]

export default function LaundryApprovedPage() {
  const [search, setSearch] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({ queryKey: ['laundry-approved'], queryFn: () => laundryService.getLaundryApproved() })

  const list: any[] = useMemo(() => {
    const all: any[] = data?.data ?? []
    const q = search.trim().toLowerCase()
    if (!q) return all
    return all.filter((r) => [r.bill_no, r.vendor_name, r.bill_date, formatDate(r.bill_date), r.approved_by]
      .some((v) => String(v ?? '').toLowerCase().includes(q)))
  }, [data, search])
  const total = list.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Approved Vouchers" subtitle="All admin-approved laundry bills" />
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-emerald-400 to-green-500">
        <div className="flex items-center gap-3 flex-wrap">
          <CheckCircle className="w-6 h-6 text-emerald-500" />
          <div className="flex-1 min-w-[16rem]"><Input placeholder="Search by vendor, bill no or date…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white" /></div>
          {search && <Button variant="ghost" onClick={() => setSearch('')}>Clear</Button>}
          <span className="text-sm font-bold text-emerald-700">{list.length} bill{list.length === 1 ? '' : 's'} · ₹{formatAmount(total)}</span>
        </div>
      </GlassCard>
      <DataTable
        title="Approved Laundry Bills" columns={cols} data={list} loading={isLoading}
        columnFilters={columnFilters} onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
