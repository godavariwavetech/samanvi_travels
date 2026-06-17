import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { accountingService } from '@/services/accounting.service'
import { formatDate } from '@/lib/utils'

const cols: Column[] = [
  { label: 'Voucher No', key: 'c_number', render: (v) => <span className="font-bold text-blue-600">{String(v ?? '—')}</span> },
  { label: 'Date', key: 'voucherdate', render: (v) => <span>{v ? formatDate(v) : '—'}</span> },
  { label: 'Type', key: 'vouchertype', render: (v) => <Badge variant="purple">{String(v ?? '—')}</Badge> },
  { label: 'Amount', key: 'creditanddebitamount', render: (v) => <span className="font-extrabold">₹{Number(v ?? 0).toLocaleString('en-IN')}</span> },
  { label: 'Description', key: 'description', render: (v) => <span className="text-xs text-slate-600">{String(v ?? '—').slice(0, 50)}</span> },
  { label: 'Vehicle', key: 'vehicleNo', render: (v) => <span>{v || '—'}</span> },
  { label: 'Entry By', key: 'entry_by' },
  { label: 'Status', key: 'status', render: () => <Badge variant="success">Approved</Badge> },
]

export default function ApprovedVoucherPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['vouchers-approved'], queryFn: () => accountingService.getVoucherApproved() })
  const { data: searched } = useQuery({
    queryKey: ['voucher-search', search],
    queryFn: () => accountingService.getVoucherSearch({ query: search }),
    enabled: search.length > 2,
  })

  const list: any[] = (search.length > 2 ? searched?.data : data?.data) ?? []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Approved Vouchers" subtitle="Admin-approved accounting vouchers" />
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-purple-500 to-violet-500">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-purple-500" />
          <div className="flex-1"><Input placeholder="Search vouchers..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white" /></div>
          {search && <Button variant="ghost" onClick={() => setSearch('')}>Clear</Button>}
        </div>
      </GlassCard>
      <DataTable title="Approved Vouchers" columns={cols} data={list} loading={isLoading} onAction={() => {}} actions={['view', 'pdf', 'print']} />
    </motion.div>
  )
}
