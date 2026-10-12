import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { DataTable, PageHeader, TopNavTabs } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mastersService } from '@/services/masters.service'
import { ExpirySummary, TABS, rowsForTab, validityColumns, type Tab, type ValidityField } from './validity'

const VALIDATION_FIELDS: ValidityField[] = [
  { key: 'fc_validity', label: 'Fitness' },
  { key: 'home_tax_validity', label: 'Home Tax' },
  { key: 'insurance_validity', label: 'Insurance' },
  { key: 'pollution_validity', label: 'PUCC' },
  { key: 'base_point_validity', label: 'Permit' },
  { key: 'atp_validity', label: 'AITP' },
  { key: 'atp_authentication_validity', label: 'Authorization' },
]

export default function VehicleValidationsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('All')
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({ queryKey: ['buses'], queryFn: () => mastersService.getBuses() })

  // Validity dates only get captured on the "normal" bus form — spare tanks and hire
  // buses never have them, so they'd just clutter this view as all-"unset" rows.
  const busList: any[] = useMemo(
    () => (data?.data ?? []).filter((b: any) => b.issparetank != 1 && b.bus_category !== 'hire'),
    [data]
  )

  const { mutate: saveDate } = useMutation({
    mutationFn: (payload: { bus_id: number; field: string; value: string }) => {
      const userid = localStorage.getItem('user_id') ?? ''
      const usrnm = localStorage.getItem('usr_nm') ?? ''
      return mastersService.updateBusValidityDate({ ...payload, userid, usrnm })
    },
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success('Validity date updated')
        qc.invalidateQueries({ queryKey: ['buses'] })
      } else toast.error('Failed to update')
    },
    onError: () => toast.error('Server error'),
  })

  const rows = useMemo(() => rowsForTab(busList, VALIDATION_FIELDS, tab), [busList, tab])

  const columns: Column[] = useMemo(() => [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Vehicle No', key: 'bus_no', filterable: true, render: (v) => <span className="font-bold text-blue-600 whitespace-nowrap">{String(v)}</span> },
    { label: 'Vehicle Type', key: 'vehicle_type', filterable: true, render: (v) => <span className="text-sm">{v ? String(v) : '—'}</span> },
    { label: 'Company', key: 'company', filterable: true, render: (v) => <span className="text-sm">{v ? String(v) : '—'}</span> },
    ...validityColumns(VALIDATION_FIELDS, tab, (row, field, value) => saveDate({ bus_id: row.id, field, value })),
  ], [tab, saveDate])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Vehicle Validations" subtitle="Track document expiry across the fleet and edit dates inline" />
      <ExpirySummary rows={busList} fields={VALIDATION_FIELDS} noun="Vehicle" onPick={setTab} />
      <TopNavTabs tabs={[...TABS]} activeTab={tab} onChange={(t) => setTab(t as Tab)} />
      <DataTable
        title="Vehicle Validations"
        icon={<ShieldCheck className="w-5 h-5 text-blue-600" />}
        columns={columns}
        data={rows}
        loading={isLoading}
        actions={[]}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
      />
    </motion.div>
  )
}
