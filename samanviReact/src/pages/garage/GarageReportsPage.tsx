import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, SearchableSelect } from '@/components/shared'
import type { Column } from '@/components/shared'
import { garageService } from '@/services/garage.service'
import { fuelService } from '@/services/fuel.service'
import { formatCurrency } from '@/lib/utils'

function fmtDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Kolkata' })
}

const categoryOf = (r: any) => r.all_categories || r.repair_category_name || ''

// "Name:amount|Name:amount" -> [{ name, amount }]
function parseLedgers(v: any): { name: string; amount: number }[] {
  if (!v) return []
  return String(v).split('|').map((part) => {
    const idx = part.lastIndexOf(':')
    if (idx === -1) return { name: part, amount: 0 }
    return { name: part.slice(0, idx), amount: Number(part.slice(idx + 1)) || 0 }
  })
}

function ledgerChips(v: any, cls: string) {
  const entries = parseLedgers(v)
  if (entries.length === 0) return <span className="text-slate-300">—</span>
  return (
    <div className="flex flex-col gap-1">
      {entries.map((e, i) => (
        <span key={i} className={`inline-flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
          {e.name}: ₹{e.amount.toLocaleString('en-IN')}
        </span>
      ))}
    </div>
  )
}

const cols: Column[] = [
  { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
  { label: 'Job Card', key: 'job_card_number', filterable: true, render: (v) => <span className="font-bold text-blue-600">{String(v ?? '—')}</span> },
  { label: 'Bus', key: 'vehicle_number', filterable: true, render: (v) => <span>{String(v ?? '—')}</span> },
  { label: 'Category', key: 'display_category', filterable: true, render: (v) => v ? <Badge variant="warning">{String(v)}</Badge> : <span className="text-slate-300">—</span> },
  { label: 'Parts Cost', key: 'parts_cost', align: 'right', render: (v) => <span className="font-medium">₹{Number(v ?? 0).toLocaleString('en-IN')}</span> },
  { label: 'Labour', key: 'labour_cost', align: 'right', render: (v) => <span className="font-medium">₹{Number(v ?? 0).toLocaleString('en-IN')}</span> },
  { label: 'Total', key: 'total_amount', align: 'right', render: (v) => <span className="font-bold text-slate-900">₹{Number(v ?? 0).toLocaleString('en-IN')}</span> },
  { label: 'Debit Ledgers', key: 'debit_ledgers', render: (v) => ledgerChips(v, 'bg-blue-50 text-blue-700 border border-blue-100') },
  { label: 'Credit Ledgers', key: 'credit_ledgers', render: (v) => ledgerChips(v, 'bg-emerald-50 text-emerald-700 border border-emerald-100') },
  { label: 'Completed', key: 'completed_date', align: 'center', render: (v) => <span className="text-sm">{fmtDate(v)}</span> },
]

const today = new Date().toISOString().split('T')[0]

export default function GarageReportsPage() {
  const [filter, setFilter] = useState({ bus_no: '', from_date: '', to_date: '', category: '' })
  const [applied, setApplied] = useState(filter)
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({ queryKey: ['garage-reports', applied], queryFn: () => garageService.getRepairEntries(applied) })
  const { data: buses, refetch: reloadBuses, isFetching: loadingBuses } = useQuery({ queryKey: ['buses'], queryFn: () => fuelService.getBusNumbers() })
  const { data: categories, refetch: reloadCats, isFetching: loadingCats } = useQuery({ queryKey: ['repair-cats'], queryFn: () => garageService.getCategories() })

  const rawList: any[] = data?.data ?? []
  const catList: any[] = categories?.data ?? []
  const busList: any[] = buses?.data ?? []

  // The list endpoint returns every job card — filters are applied client-side.
  const list = useMemo(() => {
    const from = applied.from_date ? new Date(applied.from_date).setHours(0, 0, 0, 0) : null
    const to = applied.to_date ? new Date(applied.to_date).setHours(23, 59, 59, 999) : null
    return rawList
      .filter((r) => !applied.bus_no || r.vehicle_number === applied.bus_no)
      .filter((r) => !applied.category || categoryOf(r).split(',').map((s: string) => s.trim()).includes(applied.category))
      .filter((r) => {
        if (!from && !to) return true
        const d = new Date(r.job_date || r.created_at).getTime()
        if (isNaN(d)) return true
        if (from && d < from) return false
        if (to && d > to) return false
        return true
      })
      .map((r) => ({ ...r, display_category: categoryOf(r) }))
  }, [rawList, applied])

  const totalCost = list.reduce((s, r) => s + (Number(r.total_amount) || 0), 0)

  const chartData = catList.map(c => ({
    name: c.name,
    cost: list.filter(r => categoryOf(r).split(',').map((s: string) => s.trim()).includes(c.name)).reduce((s, r) => s + (Number(r.total_amount) || 0), 0)
  })).filter(d => d.cost > 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Garage Reports" subtitle="Vehicle repair cost analysis and maintenance history" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-orange-500 to-red-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div><Label>Bus</Label>
            <SearchableSelect
              value={filter.bus_no}
              onChange={(v) => setFilter({ ...filter, bus_no: v })}
              options={busList.map((b) => ({ value: b.bus_no, label: b.bus_no }))}
              placeholder="All Buses"
              onReload={() => reloadBuses()}
              reloading={loadingBuses}
            /></div>
          <div><Label>Category</Label>
            <SearchableSelect
              value={filter.category}
              onChange={(v) => setFilter({ ...filter, category: v })}
              options={catList.map((c) => ({ value: c.name, label: c.name }))}
              placeholder="All Categories"
              onReload={() => reloadCats()}
              reloading={loadingCats}
            /></div>
          <div><Label>From</Label><Input type="date" max={today} value={filter.from_date} onChange={(e) => setFilter({ ...filter, from_date: e.target.value })} /></div>
          <div><Label>To</Label><Input type="date" max={today} value={filter.to_date} onChange={(e) => setFilter({ ...filter, to_date: e.target.value })} /></div>
          <Button onClick={() => setApplied(filter)}><Search className="w-4 h-4" /> Apply</Button>
        </div>
      </GlassCard>

      {list.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Job Cards', value: list.length, color: 'text-blue-600' },
              { label: 'Total Cost', value: formatCurrency(totalCost), color: 'text-red-600' },
              { label: 'Avg Per Job', value: formatCurrency(totalCost / list.length), color: 'text-amber-600' },
            ].map((s) => <GlassCard key={s.label} className="p-5"><p className="text-xs font-bold text-slate-500 uppercase">{s.label}</p><h3 className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</h3></GlassCard>)}
          </div>
          {chartData.length > 0 && (
            <GlassCard className="p-6">
              <h3 className="font-bold text-slate-900 mb-4">Cost by Category</h3>
              <div className="h-56">
                <ResponsiveContainer><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="cost" fill="#f59e0b" name="Cost (₹)" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer>
              </div>
            </GlassCard>
          )}
        </>
      )}

      <DataTable
        title="Repair Reports"
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={() => {}}
        actions={['view', 'pdf', 'print']}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
