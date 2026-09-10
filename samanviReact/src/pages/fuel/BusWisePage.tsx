import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader, TotalsFooter } from '@/components/shared'
import type { Column, TotalsFooterItem } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'
import { mastersService } from '@/services/masters.service'

const today = new Date().toISOString().split('T')[0]
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

export default function BusWisePage() {
  // ledger_name key name is inherited from the old backend contract (the field
  // holds the bus number, not a ledger). Kept as-is so a legacy client hitting
  // the same endpoint isn't broken.
  const [filter, setFilter] = useState({ fromdate: weekAgo, todate: today, ledger_name: '' })
  const [applied, setApplied] = useState<typeof filter | null>(null)

  const { data: busesResp } = useQuery({
    queryKey: ['buses'],
    queryFn: () => mastersService.getBuses(),
  })
  const buses = (busesResp?.data ?? []) as { id: number; bus_no: string }[]

  const { data, isLoading } = useQuery({
    queryKey: ['fuel-bus-wise', applied],
    queryFn: () => fuelService.getBusWiseReports(applied),
    enabled: !!applied,
  })
  const rows = (data?.data ?? []) as Record<string, unknown>[]

  const totalQty = rows.reduce((s, r) => s + Number(r.quantity_filled || 0), 0)
  const totalAmount = rows.reduce((s, r) => s + Number(r.total_bill || 0), 0)
  const avgPrice = totalQty > 0 ? totalAmount / totalQty : 0

  const cols: Column[] = useMemo(() => [
    { label: 'Ref #', key: 'c_number' },
    { label: 'Date', key: 'date' },
    { label: 'Bus No', key: 'vehicle_number', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Debit Ledger', key: 'debit_ledger', render: (v) => v ? String(v) : '—' },
    { label: 'Credit Ledger', key: 'fuel_station', render: (v) => v ? String(v) : '—' },
    { label: 'Qty (L)', key: 'quantity_filled', render: (v) => Number(v || 0).toFixed(2) },
    { label: 'Price/L', key: 'price_per_liter', render: (v) => v ? `₹${Number(v).toFixed(2)}` : '—' },
    { label: 'Amount', key: 'total_bill', render: (v) => <span className="font-bold">₹{Number(v || 0).toFixed(2)}</span> },
    { label: 'KMs', key: 'kilometers', render: (v) => v ? String(v) : '—' },
    { label: 'Avg KMPL', key: 'avg_kmpl', render: (v) => v ? String(v) : '—' },
    { label: 'Remarks', key: 'remarks', render: (v) => v ? <span className="text-slate-600 text-xs">{String(v)}</span> : '—' },
    { label: 'Status', key: 'admin_status', render: (v) => {
        const s = Number(v)
        if (s === 1) return <Badge variant="success">Approved</Badge>
        if (s === 2) return <Badge variant="danger">Rejected</Badge>
        return <Badge variant="warning">Pending</Badge>
      } },
  ], [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Bus Wise Fuel Report" subtitle="Fuel consumption grouped by bus over a date range" />

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
          <div className="min-w-[220px]">
            <Label>Bus Number</Label>
            <Select value={filter.ledger_name}
              onChange={(e) => setFilter({ ...filter, ledger_name: e.target.value })}>
              <option value="">All buses</option>
              {buses.map((b) => (
                <option key={b.id} value={b.bus_no}>{b.bus_no}</option>
              ))}
            </Select>
          </div>
          <Button onClick={() => setApplied({ ...filter })}>
            <Search className="w-4 h-4" /> Search
          </Button>
        </div>
      </GlassCard>

      {applied && rows.length > 0 && (
        <div className="flex gap-4 flex-wrap text-sm">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Entries:</span> <b>{rows.length}</b>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Total Litres:</span> <b>{totalQty.toFixed(2)} L</b>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Avg Price/L:</span> <b>₹{avgPrice.toFixed(2)}</b>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Total Amount:</span> <b>₹{totalAmount.toFixed(2)}</b>
          </div>
        </div>
      )}

      <DataTable
        title="Bus Wise Entries"
        columns={cols}
        data={applied ? rows : []}
        loading={isLoading}
        onAction={() => {}}
        actions={[]}
      />

      {applied && rows.length > 0 && (
        <TotalsFooter
          items={[
            { label: 'Total Quantity', value: `${totalQty.toFixed(2)} L` },
            { label: 'Avg Price/L', value: `₹${avgPrice.toFixed(2)}` },
            { label: 'Total Amount', value: `₹${totalAmount.toFixed(2)}`, emphasis: 'positive' },
          ] satisfies TotalsFooterItem[]}
        />
      )}
    </motion.div>
  )
}
