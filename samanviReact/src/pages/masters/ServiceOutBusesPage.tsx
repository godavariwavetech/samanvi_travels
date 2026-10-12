import { useState } from 'react'
import { motion } from 'motion/react'
import { LogOut, RotateCcw } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DataTable, PageHeader, Button } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mastersService } from '@/services/masters.service'

function fmtDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return String(d)
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Kolkata' })
}

export default function ServiceOutBusesPage() {
  const qc = useQueryClient()
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})

  const { data, isLoading } = useQuery({
    queryKey: ['service-out-buses'],
    queryFn: () => mastersService.getServiceOutBuses(),
  })
  const busList: any[] = data?.data ?? []

  const { mutate: reactivate, isPending: reactivating } = useMutation({
    mutationFn: (id: number) => {
      const userid = localStorage.getItem('user_id') ?? ''
      const usrnm = localStorage.getItem('usr_nm') ?? ''
      return mastersService.reactivateBus({ id, userid, usrnm })
    },
    onSuccess: (res) => {
      if (res.status === 200) {
        toast.success('Bus reactivated — back in the active fleet')
        qc.invalidateQueries({ queryKey: ['service-out-buses'] })
        qc.invalidateQueries({ queryKey: ['buses'] })
      } else toast.error('Failed to reactivate')
    },
    onError: () => toast.error('Server error'),
  })

  const cols: Column[] = [
    { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
    { label: 'Bus No', key: 'bus_no', filterable: true, render: (v) => <span className="font-bold text-blue-600 whitespace-nowrap">{String(v)}</span> },
    { label: 'Vehicle Type', key: 'vehicle_type', filterable: true, render: (v) => <span className="text-sm">{v ? String(v) : '—'}</span> },
    { label: 'Company', key: 'company', filterable: true, render: (v) => <span className="text-sm">{v ? String(v) : '—'}</span> },
    { label: 'Service Out Date', key: 'service_out_date', filterable: true, render: (v) => <span className="text-sm whitespace-nowrap font-semibold text-red-600">{fmtDate(v)}</span> },
    { label: 'Description', key: 'service_out_reason', filterable: true, render: (v) => <span className="text-sm max-w-sm block">{String(v ?? '—')}</span> },
    { label: 'Owner', key: 'ownername', filterable: true, render: (v) => <span className="text-sm whitespace-nowrap">{String(v ?? '—')}</span> },
    {
      label: 'Action', key: 'id', align: 'center',
      render: (_v, row: any) => (
        <Button variant="success" size="sm" onClick={() => reactivate(row.id)} disabled={reactivating}>
          <RotateCcw className="w-3.5 h-3.5" /> Reactivate
        </Button>
      ),
    },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Sold Out / Service Out" subtitle="Buses sold or taken out of service — reactivate to bring one back into the active fleet" />
      <DataTable
        title="Sold Out / Service Out Vehicles"
        icon={<LogOut className="w-5 h-5 text-red-500" />}
        columns={cols}
        data={busList}
        loading={isLoading}
        actions={[]}
        columnFilters={columnFilters}
        onColumnFilterChange={(k, v) => setColumnFilters((prev) => ({ ...prev, [k]: v }))}
        className="border-2 border-slate-200"
      />
    </motion.div>
  )
}
