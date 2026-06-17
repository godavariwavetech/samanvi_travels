import { useState } from 'react'
import { motion } from 'motion/react'
import { CheckCircle, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'

const cols: Column[] = [
  { label: 'Date', key: 'date', render: (v) => <span className="font-bold">{String(v)}</span> },
  { label: 'Bus', key: 'vehicle_number', render: (v) => <span className="font-bold text-blue-600">{String(v ?? '—')}</span> },
  { label: 'Service', key: 'service_number' },
  { label: 'Litres', key: 'quantity_filled', render: (v) => <span className="font-bold">{v} L</span> },
  { label: 'Amount', key: 'total_bill', render: (v) => <span className="font-bold">₹{v}</span> },
  { label: 'KM', key: 'present_odometer' },
  { label: 'Driver', key: 'driver1' },
  { label: 'Mileage', key: 'avg_kmpl', render: (v) => v ? <span className="text-emerald-600 font-medium">{String(v)} km/L</span> : <span className="text-slate-400">—</span> },
  { label: 'Status', key: 'admin_status', render: () => <Badge variant="success">Approved</Badge> },
]

export default function ApprovedFuelPage() {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useQuery({ queryKey: ['fuel-approved'], queryFn: () => fuelService.getFuelApproved() })
  const { data: searched, isLoading: loadSearch } = useQuery({
    queryKey: ['fuel-search', search],
    queryFn: () => fuelService.getFuelSearchData({ query: search }),
    enabled: search.length > 2,
  })

  const list: any[] = (search.length > 2 ? searched?.data : data?.data) ?? []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Approved Fuel Reports" subtitle="All admin-approved fuel entry records" />
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-green-400 to-emerald-500">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-500" />
          <div className="flex-1"><Input placeholder="Search by bus number, date or station..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-white" /></div>
          {search && <Button variant="ghost" onClick={() => setSearch('')}>Clear</Button>}
        </div>
      </GlassCard>
      <DataTable title="Approved Fuel Records" columns={cols} data={list} loading={isLoading || loadSearch} onAction={() => {}} actions={['view', 'pdf', 'print']} />
    </motion.div>
  )
}
