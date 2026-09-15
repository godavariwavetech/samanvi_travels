import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { IdCard } from 'lucide-react'
import { motion } from 'motion/react'
import { DataTable, PageHeader, TopNavTabs } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mastersService } from '@/services/masters.service'
import { ExpirySummary, TABS, rowsForTab, validityColumns, type Tab, type ValidityField } from './validity'

// A driver's documents that expire: the driving licence, the transport
// (badge) endorsement, and the medical fitness certificate. DL expiry and
// transport validity are the same fields as on the driver form.
const VALIDATION_FIELDS: ValidityField[] = [
  { key: 'dl_expiry_date', label: 'DL Expiry' },
  { key: 'transportvalidityto', label: 'Transport (Badge)' },
  { key: 'medical_validity', label: 'Medical Fitness' },
]

export default function DriverValidationsPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('All')
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  // Active drivers only - a terminated driver's documents need no watching.
  const { data, isLoading } = useQuery({ queryKey: ['drivers'], queryFn: () => mastersService.getDrivers() })
  const driverList: any[] = useMemo(() => data?.data ?? [], [data])

  const { mutate: saveDate } = useMutation({
    mutationFn: (payload: { driver_id: number; field: string; value: string }) => mastersService.updateDriverValidityDate({
      ...payload, userid: localStorage.getItem('user_id') ?? '', usrnm: localStorage.getItem('usr_nm') ?? '',
    }),
    onSuccess: (res: any) => {
      if (res.status === 200) {
        toast.success('Validity date updated')
        qc.invalidateQueries({ queryKey: ['drivers'] })
      } else toast.error('Failed to update')
    },
    onError: () => toast.error('Server error'),
  })

  const rows = useMemo(() => rowsForTab(driverList, VALIDATION_FIELDS, tab), [driverList, tab])

  const columns: Column[] = useMemo(() => [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Driver ID', key: 'driver_id_number', filterable: true, render: (v) => <span className="font-bold text-blue-600 whitespace-nowrap">{v ? String(v) : '—'}</span> },
    {
      label: 'Driver Name', key: 'driver_name', filterable: true,
      render: (v, r: any) => (
        <div>
          <div className="font-medium whitespace-nowrap">{String(v ?? '—')}</div>
          {r.nickname && r.nickname !== v && <div className="text-xs text-slate-400">{String(r.nickname)}</div>}
        </div>
      ),
    },
    { label: 'Mobile', key: 'mobile_number', filterable: true, render: (v) => <span className="text-sm whitespace-nowrap">{v ? String(v) : '—'}</span> },
    { label: 'DL Number', key: 'dl_number', filterable: true, render: (v) => <span className="text-sm whitespace-nowrap">{v ? String(v) : '—'}</span> },
    ...validityColumns(VALIDATION_FIELDS, tab, (row, field, value) => saveDate({ driver_id: row.id, field, value })),
  ], [tab, saveDate])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Driver Validations" subtitle="Track licence, badge and medical expiry for every active driver and edit dates inline" />
      <ExpirySummary rows={driverList} fields={VALIDATION_FIELDS} noun="Driver" onPick={setTab} />
      <TopNavTabs tabs={[...TABS]} activeTab={tab} onChange={(t) => setTab(t as Tab)} />
      <DataTable
        title="Driver Validations"
        icon={<IdCard className="w-5 h-5 text-blue-600" />}
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
