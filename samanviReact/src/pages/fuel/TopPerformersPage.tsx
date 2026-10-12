import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Search, Trophy, Medal, Award } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Label, DataTable, PageHeader, TotalsFooter } from '@/components/shared'
import type { Column, TotalsFooterItem } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'
import { formatDate, formatAmount, todayISO, toLocalISODate } from '@/lib/utils'

const today = todayISO()

function monthBounds(d = new Date()) {
  const y = d.getFullYear()
  const m = d.getMonth()
  const iso = (dt: Date) => toLocalISODate(dt)
  return { fromdate: iso(new Date(y, m, 1)), todate: iso(new Date(y, m + 1, 0)) }
}

// Rank rendering: gold/silver/bronze medals for top 3, plain numeric for the rest.
function RankCell({ rank }: { rank: number }) {
  if (rank === 1) return <span className="inline-flex items-center gap-1 font-bold text-amber-600"><Trophy className="w-4 h-4" /> 1</span>
  if (rank === 2) return <span className="inline-flex items-center gap-1 font-bold text-slate-500"><Medal className="w-4 h-4" /> 2</span>
  if (rank === 3) return <span className="inline-flex items-center gap-1 font-bold text-orange-700"><Award className="w-4 h-4" /> 3</span>
  return <span className="text-slate-600">{rank}</span>
}

export default function TopPerformersPage() {
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [filter, setFilter] = useState(monthBounds())
  const [applied, setApplied] = useState<typeof filter | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['fuel-top-performers', applied],
    queryFn: () => fuelService.getTopPerformers(applied),
    enabled: !!applied,
  })
  const rows = (data?.data ?? []) as Record<string, unknown>[]
  const ranked = useMemo(() => rows.map((r, i) => ({ ...r, rank: i + 1 })), [rows])

  const totalKms = rows.reduce((s, r) => s + Number(r.kilometers || 0), 0)
  const totalLitres = rows.reduce((s, r) => s + Number(r.quantity_filled || 0), 0)
  const totalBill = rows.reduce((s, r) => s + Number(r.total_bill || 0), 0)
  const overallKmpl = totalLitres > 0 ? totalKms / totalLitres : 0

  const cols: Column[] = useMemo(() => [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _r, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Rank', key: 'rank', render: (v) => <RankCell rank={Number(v)} /> },
    { label: 'Date', key: 'date', render: (v) => formatDate(v) },
    { label: 'Bus No', key: 'bus_no', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
    { label: 'Paired Driver', key: 'driver1', render: (_v, r: Record<string, unknown>) => {
        const d1 = r.driver1 ? String(r.driver1) : ''
        const d2 = r.driver2 ? String(r.driver2) : ''
        if (d1 && d2) return `${d1}, ${d2}`
        return d1 || d2 || '—'
      } },
    { label: 'Kms Run', key: 'kilometers', render: (v) => Number(v || 0).toFixed(2) },
    { label: 'Quantity', key: 'quantity_filled', render: (v) => `${Number(v || 0).toFixed(2)} L` },
    { label: 'Avg KMPL', key: 'avg_kmpl', render: (v) => <span className="font-bold text-emerald-600">{Number(v || 0).toFixed(2)}</span> },
    { label: 'Price/L', key: 'price_per_liter', render: (v) => v ? `₹${formatAmount(v)}` : '—' },
    { label: 'Amount', key: 'total_bill', render: (v) => `₹${formatAmount(v || 0)}` },
  ], [])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Top Performers" subtitle="Fuel entries ranked by KMPL efficiency" />

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
          <Button onClick={() => setApplied({ ...filter })}>
            <Search className="w-4 h-4" /> Search
          </Button>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          Each row is one fuel fill ranked by its recorded avg KMPL. Paired driver comes from the trip on that bus that day. Entries with zero kilometers are excluded.
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
            <span className="text-slate-600">Total Litres:</span> <b>{totalLitres.toFixed(2)} L</b>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Overall KMPL:</span> <b>{overallKmpl.toFixed(2)}</b>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Total Bill:</span> <b>₹{formatAmount(totalBill)}</b>
          </div>
        </div>
      )}

      <DataTable
        title="Ranked Fuel Entries"
        columns={cols} columnFilters={columnFilters} onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
        data={applied ? ranked : []}
        loading={isLoading}
        onAction={() => {}}
        actions={[]}
      />

      {applied && rows.length > 0 && (
        <TotalsFooter
          items={[
            { label: 'Kms Run', value: totalKms.toFixed(2) },
            { label: 'Quantity', value: `${totalLitres.toFixed(2)} L` },
            { label: 'Avg KMPL', value: overallKmpl.toFixed(2), emphasis: 'positive' },
            { label: 'Total Amount', value: `₹${formatAmount(totalBill)}` },
          ] satisfies TotalsFooterItem[]}
        />
      )}
    </motion.div>
  )
}
