import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader, TotalsFooter } from '@/components/shared'
import type { Column, TotalsFooterItem } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'
import { mastersService } from '@/services/masters.service'
import { formatDate, formatAmount, todayISO, toLocalISODate } from '@/lib/utils'

const today = todayISO()

// Default filter to the current calendar month so the target-vs-actual
// comparison is meaningful without the user needing to pick dates.
function monthBounds(d = new Date()) {
  const y = d.getFullYear()
  const m = d.getMonth()
  const first = new Date(y, m, 1)
  const last = new Date(y, m + 1, 0)
  const iso = (dt: Date) => toLocalISODate(dt)
  return { fromdate: iso(first), todate: iso(last) }
}

export default function TargetReportPage() {
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [filter, setFilter] = useState({ ...monthBounds(), bus_no: '' })
  const [applied, setApplied] = useState<typeof filter | null>(null)

  const { data: busesResp } = useQuery({
    queryKey: ['buses'],
    queryFn: () => mastersService.getBuses(),
  })
  const buses = (busesResp?.data ?? []) as { id: number; bus_no: string }[]

  const { data, isLoading } = useQuery({
    queryKey: ['fuel-target-report', applied],
    queryFn: () => fuelService.getTargetReports(applied),
    enabled: !!applied,
  })
  const rows = (data?.data ?? []) as Record<string, unknown>[]

  // Aggregate summary chips
  const totalTarget = rows.reduce((s, r) => s + Number(r.target_liters || 0), 0)
  const totalConsumed = rows.reduce((s, r) => s + Number(r.consumed_liters || 0), 0)
  const totalVariance = totalConsumed - totalTarget

  const cols: Column[] = useMemo(() => [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _r, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Bus No', key: 'bus_no', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Target (L/mo)', key: 'target_liters', render: (v) => v ? `${Number(v).toFixed(2)} L` : <span className="text-slate-400">— no target —</span> },
    { label: 'Consumed (L)', key: 'consumed_liters', render: (v) => <span className="font-medium">{Number(v || 0).toFixed(2)} L</span> },
    { label: 'Fills', key: 'fill_count' },
    { label: 'Total Bill', key: 'total_bill', render: (v) => v ? `₹${formatAmount(v)}` : '—' },
    {
      label: 'Variance', key: 'target_liters',
      render: (_v, r: Record<string, unknown>) => {
        const t = Number(r.target_liters || 0)
        const c = Number(r.consumed_liters || 0)
        if (!r.target_liters) return <span className="text-slate-400">—</span>
        const diff = c - t
        const color = diff > 0 ? 'text-red-600' : 'text-emerald-600'
        const sign = diff > 0 ? '+' : ''
        return <span className={`font-bold ${color}`}>{sign}{diff.toFixed(2)} L</span>
      },
    },
    {
      label: 'Status', key: 'admin_status',
      render: (_v, r: Record<string, unknown>) => {
        const t = Number(r.target_liters || 0)
        const c = Number(r.consumed_liters || 0)
        if (!r.target_liters) return <Badge variant="warning">No target</Badge>
        if (c > t) return <Badge variant="danger">Over</Badge>
        if (c < t) return <Badge variant="success">Under</Badge>
        return <Badge variant="info">On target</Badge>
      },
    },
  ], [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Target vs Actual" subtitle="Compare monthly fuel targets against actual consumption per bus" />

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
            <Label>Bus (optional)</Label>
            <Select value={filter.bus_no}
              onChange={(e) => setFilter({ ...filter, bus_no: e.target.value })}>
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
        <p className="text-xs text-slate-500 mt-3">
          Target is a per-bus monthly figure. Pick a full calendar month for a direct comparison; other ranges compare against the same monthly target.
        </p>
      </GlassCard>

      {applied && rows.length > 0 && (
        <div className="flex gap-4 flex-wrap text-sm">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Buses:</span> <b>{rows.length}</b>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Total Target:</span> <b>{totalTarget.toFixed(2)} L</b>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Total Consumed:</span> <b>{totalConsumed.toFixed(2)} L</b>
          </div>
          <div className={`border rounded-xl px-4 py-2 ${totalVariance > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <span className="text-slate-600">Overall Variance:</span> <b>{totalVariance > 0 ? '+' : ''}{totalVariance.toFixed(2)} L</b>
          </div>
        </div>
      )}

      <DataTable
        title="Bus Wise Target vs Actual"
        columns={cols} columnFilters={columnFilters} onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
        data={applied ? rows : []}
        loading={isLoading}
        onAction={() => {}}
        actions={[]}
      />

      {applied && rows.length > 0 && (
        <TotalsFooter
          items={[
            { label: 'Quantity Filled', value: `${totalConsumed.toFixed(2)} L` },
            { label: 'Target Set', value: `${totalTarget.toFixed(2)} L` },
            { label: 'Achieved (Consumed − Target)', value: `${totalVariance > 0 ? '+' : ''}${totalVariance.toFixed(2)} L`, emphasis: totalVariance > 0 ? 'negative' : 'positive' },
          ] satisfies TotalsFooterItem[]}
        />
      )}
    </motion.div>
  )
}
