import { useState } from 'react'
import { motion } from 'motion/react'
import { MapPin, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader } from '@/components/shared'
import type { Column } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'

const today = new Date().toISOString().split('T')[0]

const cols: Column[] = [
  { label: '#', key: 'i', render: (v) => <span className="text-slate-400 text-xs font-medium">{String(v)}</span> },
  { label: 'Date', key: 'i_ts', render: (v) => <span className="font-medium">{String(v ?? '').split('T')[0]}</span> },
  { label: 'Bus Number', key: 'vehicleNo', render: (v) => <Badge variant="info">{String(v ?? '—')}</Badge> },
  { label: 'Quantity (L)', key: 'quantity_filled', render: (v) => <span className="font-bold text-blue-600">{v} L</span> },
  { label: 'Price/Litre (₹)', key: 'price_per_liter', render: (v) => <span>₹{v}</span> },
  { label: 'Amount (₹)', key: 'total_bill', render: (v) => <span className="font-bold text-emerald-600">₹{v}</span> },
]

export default function FuelStationWisePage() {
  const [filter, setFilter] = useState({ fromdate: today, todate: today, ledger_name: '' })
  const [applied, setApplied] = useState(filter)

  const { data: ledgers } = useQuery({ queryKey: ['fuel-ledgers'], queryFn: () => fuelService.getFuelLedgerName() })
  const { data, isLoading } = useQuery({
    queryKey: ['fuel-station-wise', applied],
    queryFn: () => fuelService.getStationWiseReports(applied),
  })

  const rawList: any[] = data?.data ?? []
  const list = rawList.map((r, i) => ({ ...r, i: i + 1 }))

  const totalQty = list.reduce((s, r) => s + (Number(r.quantity_filled) || 0), 0)
  const totalAmt = list.reduce((s, r) => s + (Number(r.total_bill) || 0), 0)

  const ledgerList: any[] = ledgers?.data ?? []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Fuel Station Wise Reports" subtitle="Track fuel consumption per station across the fleet" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-amber-400 to-orange-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div><Label>From Date</Label><Input type="date" max={today} value={filter.fromdate} onChange={(e) => setFilter({ ...filter, fromdate: e.target.value })} /></div>
          <div><Label>To Date</Label><Input type="date" max={today} value={filter.todate} onChange={(e) => setFilter({ ...filter, todate: e.target.value })} /></div>
          <div className="min-w-[200px]">
            <Label>Fuel Station</Label>
            <Select value={filter.ledger_name} onChange={(e) => setFilter({ ...filter, ledger_name: e.target.value })}>
              <option value="">All Stations</option>
              {ledgerList.map((l: any) => <option key={l.id} value={l.ledger_name ?? l.name}>{l.ledger_name ?? l.name}</option>)}
            </Select>
          </div>
          <Button onClick={() => setApplied(filter)}><Search className="w-4 h-4" /> Search</Button>
        </div>
      </GlassCard>

      {list.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Records', value: list.length, color: 'from-blue-500 to-indigo-500', unit: '' },
            { label: 'Total Quantity', value: totalQty.toFixed(2), color: 'from-amber-400 to-orange-500', unit: ' L' },
            { label: 'Total Amount', value: `₹${totalAmt.toLocaleString('en-IN')}`, color: 'from-emerald-400 to-teal-500', unit: '' },
            { label: 'Avg Price/L', value: totalQty > 0 ? `₹${(totalAmt / totalQty).toFixed(2)}` : '—', color: 'from-purple-400 to-violet-500', unit: '' },
          ].map((s) => (
            <GlassCard key={s.label} className="p-4">
              <div className={`text-2xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}{s.unit}</div>
              <div className="text-xs text-slate-500 font-semibold mt-1">{s.label}</div>
            </GlassCard>
          ))}
        </div>
      )}

      <DataTable
        title={`Station Wise Fuel Report ${applied.ledger_name ? `— ${applied.ledger_name}` : '(All Stations)'}`}
        columns={cols}
        data={list}
        loading={isLoading}
        onAction={() => {}}
        actions={[]}
        icon={<MapPin className="w-5 h-5 text-amber-500" />}
      />
    </motion.div>
  )
}
