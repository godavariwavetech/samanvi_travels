import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Search, Calendar } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'
import { formatDate, withStatusLabel, formatAmount } from '@/lib/utils'

const today = new Date().toISOString().split('T')[0]

const weekday = (isoDate: string) => {
  try { return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) }
  catch { return '' }
}

// Dates read dd/mm/yy here like everywhere else: formatDate from '@/lib/utils'.

export default function DayWisePage() {
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [fromdate, setFromdate] = useState(today)
  const [applied, setApplied] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['fuel-day-wise', applied],
    queryFn: () => fuelService.getDayWiseReports({ fromdate: applied }),
    enabled: !!applied,
  })

  const rows = (data?.data ?? []) as Record<string, unknown>[]

  const totalQty = rows.reduce((s, r) => s + Number(r.quantity_filled || 0), 0)
  const totalAmount = rows.reduce((s, r) => s + Number(r.total_bill || 0), 0)
  const avgPrice = totalQty > 0 ? totalAmount / totalQty : 0

  // Old Angular Day Wise table had Driver1 / Driver2 / Service / Target /
  // Balance columns — all four dropped here to stay consistent with the Fuel
  // Entry form changes. Target vs single-day quantity wouldn't compare
  // meaningfully against a monthly per-bus target anyway.
  const cols: Column[] = useMemo(() => [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _r, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Ref #', key: 'c_number', filterable: true },
    { label: 'Bus No', key: 'vehicle_number', filterable: true },
    { label: 'Debit Ledger', key: 'debit_ledger', filterable: true, render: (v) => v ? String(v) : '—' },
    { label: 'Credit Ledger', key: 'fuel_station', filterable: true, render: (v) => v ? String(v) : '—' },
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
      <PageHeader title="Day Wise Fuel Report" subtitle="All fuel entries for a single day, across the fleet" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-amber-400 to-orange-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <Label>Date</Label>
            <Input type="date" max={today} value={fromdate}
              onChange={(e) => setFromdate(e.target.value)} />
          </div>
          <Button onClick={() => setApplied(fromdate)} disabled={!fromdate}>
            <Search className="w-4 h-4" /> Search
          </Button>
        </div>
      </GlassCard>

      {applied && (
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Calendar className="w-4 h-4" />
          <span><b>{formatDate(applied)}</b> · {weekday(applied)}</span>
        </div>
      )}

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
        title="Day Wise Entries"
        columns={cols} columnFilters={columnFilters} onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
        data={applied ? withStatusLabel(rows) : []}
        loading={isLoading}
        onAction={() => {}}
        actions={[]}
      />
    </motion.div>
  )
}
