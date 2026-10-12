import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader, TotalsFooter, LedgerNameWithGroup } from '@/components/shared'
import type { Column, TotalsFooterItem } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'
import { formatDate, withStatusLabel, formatAmount, todayISO, toLocalISODate } from '@/lib/utils'

const today = todayISO()
const weekAgo = toLocalISODate(new Date(Date.now() - 7 * 86400000))

export default function FuelStationWisePage() {
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [filter, setFilter] = useState({ fromdate: weekAgo, todate: today, ledger_name: '' })
  const [applied, setApplied] = useState<typeof filter | null>(null)

  const { data: stationsResp } = useQuery({
    queryKey: ['fuel-stations'],
    queryFn: () => fuelService.getFuelLedgerName(),
  })
  const stations = (stationsResp?.data ?? []) as { expensives: string }[]

  const { data, isLoading } = useQuery({
    queryKey: ['fuel-station-wise', applied],
    queryFn: () => fuelService.getStationWiseReports(applied),
    enabled: !!applied,
  })
  const rows = (data?.data ?? []) as Record<string, unknown>[]

  const totalQty = rows.reduce((s, r) => s + Number(r.quantity_filled || 0), 0)
  const totalAmount = rows.reduce((s, r) => s + Number(r.total_bill || 0), 0)
  const avgPrice = totalQty > 0 ? totalAmount / totalQty : 0

  const cols: Column[] = useMemo(() => [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _r, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Ref #', key: 'c_number', filterable: true },
    { label: 'Date', key: 'date', render: (v) => formatDate(v) },
    { label: 'Bus No', key: 'vehicle_number', filterable: true },
    { label: 'Debit Ledger', key: 'debit_ledger', filterable: true, render: (v) => <LedgerNameWithGroup name={v} /> },
    { label: 'Credit Ledger', key: 'credit_ledger', filterable: true, render: (v) => <LedgerNameWithGroup name={v} /> },
    { label: 'Qty (L)', key: 'quantity_filled', render: (v) => Number(v || 0).toFixed(2) },
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
      <PageHeader title="Station Wise Fuel Report" subtitle="Fuel purchases grouped by fuel station over a date range" />

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
            <Label>Fuel Station</Label>
            <Select value={filter.ledger_name}
              onChange={(e) => setFilter({ ...filter, ledger_name: e.target.value })}>
              <option value="">All stations</option>
              {stations.map((s) => (
                <option key={s.expensives} value={s.expensives}>{s.expensives}</option>
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
            <span className="text-slate-600">Avg Price/L:</span> <b>₹{formatAmount(avgPrice)}</b>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Total Amount:</span> <b>₹{formatAmount(totalAmount)}</b>
          </div>
        </div>
      )}

      <DataTable
        title="Station Wise Entries"
        columns={cols} columnFilters={columnFilters} onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
        data={applied ? withStatusLabel(rows) : []}
        loading={isLoading}
        onAction={() => {}}
        actions={[]}
      />

      {applied && rows.length > 0 && (
        <TotalsFooter
          items={[
            { label: 'Total Quantity', value: `${totalQty.toFixed(2)} L` },
            { label: 'Avg Price/L', value: `₹${formatAmount(avgPrice)}` },
            { label: 'Total Amount', value: `₹${formatAmount(totalAmount)}`, emphasis: 'positive' },
          ] satisfies TotalsFooterItem[]}
        />
      )}
    </motion.div>
  )
}
