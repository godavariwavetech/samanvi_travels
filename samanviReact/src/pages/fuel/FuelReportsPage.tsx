import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, X, Fuel } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Button, Input, Select, Label, DataTable, Badge, PageHeader, RecordModal, DetailGrid, DetailField, RemarksBlock, LedgerSideLists } from '@/components/shared'
import type { Column } from '@/components/shared'
import { fuelService } from '@/services/fuel.service'
import { formatDate, formatDateTime, withStatusLabel, formatAmount } from '@/lib/utils'

const today = new Date().toISOString().split('T')[0]
const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

export default function FuelReportsPage() {
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [filter, setFilter] = useState({ fromdate: weekAgo, todate: today, admin_status: '1' })
  const [applied, setApplied] = useState(filter)
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['fuel-approved-reports', applied],
    queryFn: () => fuelService.getFuelSearchData(applied),
  })

  const rows = (data?.data ?? []) as Record<string, unknown>[]

  const onView = async (row: Record<string, unknown>) => {
    const accRes = await fuelService.getFuelAccounts({ id: row.id })
    setViewRow({ ...row, _accounts: accRes?.data || [] })
  }

  // Same column layout as the old Angular Approved Fuel Reports table, minus
  // the Driver 1 / Driver 2 / Target columns we cut alongside the Fuel Entry
  // form fields — the data isn't collected anymore, so no point rendering
  // empty cells for it.
  const columns: Column[] = useMemo(() => [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _r, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Ref #', key: 'c_number', filterable: true, render: (v, r: Record<string, unknown>) => (
        <button onClick={() => onView(r)} className="text-blue-600 hover:underline font-medium">{String(v)}</button>
      ) },
    { label: 'Date', key: 'date', render: (v) => formatDate(v) },
    { label: 'Bus No', key: 'vehicle_number', filterable: true },
    { label: 'Prev Odo', key: 'previous_odometer' },
    { label: 'Present Odo', key: 'present_odometer' },
    { label: 'Dr Ledger', key: 'debit_ledger_id', filterable: true },
    { label: 'Cr Ledger', key: 'credit_ledger_id', filterable: true },
    { label: 'KMs', key: 'kilometers' },
    { label: 'Qty (L)', key: 'quantity_filled' },
    { label: 'Price/L', key: 'price_per_liter', render: (v) => v ? `₹${formatAmount(v)}` : '—' },
    { label: 'Bill', key: 'total_bill', render: (v) => v ? <span className="font-bold">₹{formatAmount(v)}</span> : '—' },
    { label: 'Avg KMPL', key: 'avg_kmpl' },
    { label: 'Remarks', key: 'remarks', render: (v) => v ? <span className="text-slate-600 text-xs">{String(v)}</span> : '—' },
    { label: 'Action Date', key: 'admin_status_bydate', render: (v) => formatDateTime(v) },
    { label: 'Action By', key: 'admin_status_byname' },
    {
      label: 'Status', key: 'status_label', filterable: true,
      render: (_v, r: Record<string, unknown>) => Number(r.admin_status) === 1
        ? <Badge variant="success">Approved</Badge>
        : Number(r.admin_status) === 2 ? <Badge variant="danger">Rejected</Badge>
        : <Badge variant="warning">Pending</Badge>,
    },
  ], [])

  const totalBill = rows.reduce((s, r) => s + Number(r.total_bill || 0), 0)
  const totalQty = rows.reduce((s, r) => s + Number(r.quantity_filled || 0), 0)

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Fuel Approved Reports" subtitle="Filter approved or rejected fuel entries by date range" />

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
          <div>
            <Label>Status</Label>
            <Select value={filter.admin_status}
              onChange={(e) => setFilter({ ...filter, admin_status: e.target.value })}>
              <option value="1">Approved</option>
              <option value="2">Rejected</option>
            </Select>
          </div>
          <Button onClick={() => setApplied(filter)}><Search className="w-4 h-4" /> Apply</Button>
        </div>
      </GlassCard>

      {rows.length > 0 && (
        <div className="flex gap-4 flex-wrap text-sm">
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Entries:</span> <b>{rows.length}</b>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Total Litres:</span> <b>{totalQty.toFixed(2)} L</b>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
            <span className="text-slate-600">Total Amount:</span> <b>₹{formatAmount(totalBill)}</b>
          </div>
        </div>
      )}

      <DataTable
        title="Filtered Fuel Entries"
        columns={columns} columnFilters={columnFilters} onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
        data={withStatusLabel(rows)}
        loading={isLoading}
        onAction={() => {}}
        actions={[]}
      />

      {/* View modal */}
      <AnimatePresence>
        {viewRow && (
          <RecordModal size="lg" title="Fuel Entry" subtitle={String(viewRow.c_number ?? '')} icon={<Fuel className="w-4 h-4 text-amber-500" />} onClose={() => setViewRow(null)}>
            <DetailGrid>
              <DetailField label="Date" value={formatDate(String(viewRow.date ?? ''))} />
              <DetailField label="Vehicle No" value={String(viewRow.vehicle_number ?? '—')} />
              <DetailField label="Quantity" value={`${String(viewRow.quantity_filled ?? 0)} L`} />
              <DetailField label="Price / Litre" value={`₹${formatAmount(viewRow.price_per_liter)}`} />
              <DetailField label="Bill" value={`₹${formatAmount(viewRow.total_bill)}`} strong />
              <DetailField label="Avg KMPL" value={String(viewRow.avg_kmpl ?? '—')} />
              <DetailField label="Previous Odometer" value={String(viewRow.previous_odometer || viewRow.prev_odometer || '—')} />
              <DetailField label="Present Odometer" value={String(viewRow.present_odometer ?? '—')} />
              <DetailField label="Kilometres" value={String(viewRow.kilometers ?? '—')} />
              <DetailField label="Status" value={<Badge variant={Number(viewRow.admin_status) === 1 ? 'success' : Number(viewRow.admin_status) === 2 ? 'danger' : 'warning'}>{Number(viewRow.admin_status) === 1 ? 'Approved' : Number(viewRow.admin_status) === 2 ? 'Rejected' : 'Pending'}</Badge>} />
              <DetailField label="Action Date" value={viewRow.admin_status_bydate ? formatDateTime(String(viewRow.admin_status_bydate)) : '—'} />
              <DetailField label="Action By" value={String(viewRow.admin_status_byname || '—')} />
            </DetailGrid>
            <RemarksBlock text={viewRow.remarks} />
            <LedgerSideLists rows={(viewRow._accounts as Array<Record<string, unknown>>) || []} />
          </RecordModal>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
