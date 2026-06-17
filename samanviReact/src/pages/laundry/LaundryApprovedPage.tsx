import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { laundryService } from '@/services/laundry.service'

const cols: Column[] = [
  { label: 'Bill No', key: 'bill_no', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
  { label: 'Vendor', key: 'vendor_name' },
  { label: 'Date', key: 'bill_date' },
  { label: 'Items', key: 'item_count', render: (v) => <Badge variant="teal">{String(v)} items</Badge> },
  { label: 'Amount', key: 'total_amount', render: (v) => <span className="font-bold">₹{v}</span> },
  { label: 'Approved By', key: 'approved_by' },
  { label: 'Status', key: 'admin_status', render: () => <Badge variant="success">Approved</Badge> },
]

export default function LaundryApprovedPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({ queryKey: ['laundry-approved'], queryFn: () => laundryService.getLaundryApproved() })
  const { data: searched } = useQuery({
    queryKey: ['laundry-search', search],
    queryFn: () => laundryService.getLaundrySearch({ query: search }),
    enabled: search.length > 2,
  })

  const list: any[] = (search.length > 2 ? searched?.data : data?.data) ?? []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Approved Vouchers" subtitle="All admin-approved laundry vouchers" />
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-emerald-400 to-green-500">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-emerald-500" />
          <div className="flex-1"><Input placeholder="Search by vendor, bill no or date..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white" /></div>
          {search && <Button variant="ghost" onClick={() => setSearch('')}>Clear</Button>}
        </div>
      </GlassCard>
      <DataTable title="Approved Laundry Vouchers" columns={cols} data={list} loading={isLoading} onAction={() => {}} actions={['view', 'pdf', 'print']} />
    </motion.div>
  )
}
