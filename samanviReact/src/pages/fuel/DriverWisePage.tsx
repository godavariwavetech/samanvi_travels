import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader, TotalsFooter } from '@/components/shared'
import type { Column, TotalsFooterItem } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'
import { formatDate, withStatusLabel, formatAmount } from '@/lib/utils'

const today = new Date().toISOString().split('T')[0]
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

export default function DriverWisePage() {
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [filter, setFilter] = useState({ fromdate: weekAgo, todate: today, driver_name: '' })
  const [applied, setApplied] = useState<typeof filter | null>(null)

  const { data: driversResp } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => fuelService.getDriverNames(),
  })
  const drivers = (driversResp?.data ?? []) as { id: number; driver_name: string }[]

  const { data, isLoading } = useQuery({
    queryKey: ['fuel-driver-wise', applied],
    queryFn: () => fuelService.getDriverPerformanceReports(applied),
    enabled: !!applied,
  })
  const rows = (data?.data ?? []) as Record<string, unknown>[]

  const totalQty = rows.reduce((s, r) => s + Number(r.quantity_filled || 0), 0)
  const totalAmount = rows.reduce((s, r) => s + Number(r.total_bill || 0), 0)
  const totalKms = rows.reduce((s, r) => s + Number(r.kilometers || 0), 0)
  const avgKmpl = totalQty > 0 ? totalKms / totalQty : 0

  const cols: Column[] = useMemo(() => [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _r, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Ref #', key: 'c_number', filterable: true },
    { label: 'Date', key: 'date', render: (v) => formatDate(v) },
    { label: 'Bus No', key: 'vehicle_number', filterable: true },
    { label: 'Paired Driver', key: 'driver1', render: (_v, r: Record<string, unknown>) => {
        const d1 = r.driver1 ? String(r.driver1) : ''
        const d2 = r.driver2 ? String(r.driver2) : ''
        if (d1 && d2) return `${d1}, ${d2}`
        return d1 || d2 || '—'
      } },
    { label: 'Debit Ledger', key: 'debit_ledger', filterable: true, render: (v) => v ? String(v) : '—' },
    { label: 'Credit Ledger', key: 'fuel_station', filterable: true, render: (v) => v ? String(v) : '—' },
    { label: 'KMs Run', key: 'kilometers', render: (v) => v ? String(v) : '—' },
    { label: 'Quantity', key: 'quantity_filled', render: (v) => Number(v || 0).toFixed(2) },
    { label: 'Price/L', key: 'price_per_liter', render: (v) => v ? `₹${formatAmount(v)}` : '—' },
    { label: 'Amount', key: 'total_bill', render: (v) => <span className="font-bold">₹{formatAmount(v)}</span> },
    { label: 'Avg KMPL', key: 'avg_kmpl', render: (v) => v ? String(v) : '—' },
    { label: 'Remarks', key: 'remarks', render: (v) => v ? <span className="text-slate-600 text-xs">{String(v)}</span> : '—' },
    { label: 'Status', key: 'status_label', filterable: true, render: (_v, r: Record<string, unknown>) => {
        const s = Number(r.admin_status)
        if (s === 1) return <Badge variant="success">Approved</Badge>
        if (s === 2) return <Badge variant="danger">Rejected</Badge>
        return <Badge variant="warning">Pending</Badge>
      } },
  ], [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Driver Wise Fuel Report" subtitle="Fuel usage attributed to drivers via trip assignments" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-amber-400 to-orange-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <Label>From Date</Label>
            <Input type="date" max={today} value={filter.fromdate}
              onChange={(e) => setFilter({ ...filter, fromdate: e.target.value })} />
          </div>
          <div>
            <Label>To Date</Label>
            <Input type="date" max={today} value={filter.todate}
              onChange={(e) => setFilter({ ...filter, todate: e.target.value })} />
          </div>
          <div className="min-w-[240px]">
            <Label>Driver</Label>
            <Select value={filter.driver_name}
              onChange={(e) => setFilter({ ...filter, driver_name: e.target.value })}>
              <option value="">All drivers</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.driver_name}>{d.driver_name}</option>
              ))}
            </Select>
          </div>
          <Button onClick={() => setApplied({ ...filter })}>
            <Search className="w-4 h-4" /> Search
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Driver names are derived from trips (bus + date). Fuel entries with no matching trip for that day are excluded from this report.
        </p>
      </GlassCard>

      {applied && rows.length > 0 && (
        <div className="flex gap-4 flex-wrap text-sm">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Entries:</span> <b>{rows.length}</b>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Total KMs:</span> <b>{totalKms.toFixed(2)}</b>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Total Litres:</span> <b>{totalQty.toFixed(2)} L</b>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Overall KMPL:</span> <b>{avgKmpl.toFixed(2)}</b>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Total Amount:</span> <b>₹{formatAmount(totalAmount)}</b>
          </div>
        </div>
      )}

      <DataTable
        title="Driver Wise Entries"
        columns={cols} columnFilters={columnFilters} onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
        data={applied ? withStatusLabel(rows) : []}
        loading={isLoading}
        onAction={() => {}}
        actions={[]}
      />

      {applied && rows.length > 0 && (
        <TotalsFooter
          items={[
            { label: 'Kms Run', value: totalKms.toFixed(2) },
            { label: 'Quantity', value: `${totalQty.toFixed(2)} L` },
            { label: 'Avg KMPL', value: avgKmpl.toFixed(2), emphasis: 'positive' },
            { label: 'Total Amount', value: `₹${formatAmount(totalAmount)}` },
          ] satisfies TotalsFooterItem[]}
        />
      )}
    </motion.div>
  )
}
