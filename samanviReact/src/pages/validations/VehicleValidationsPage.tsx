import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { DataTable, MiniDatePicker, PageHeader, TopNavTabs } from '@/components/shared'
import type { Column } from '@/components/shared'
import { mastersService } from '@/services/masters.service'
import { cn } from '@/lib/utils'

const VALIDATION_FIELDS: { key: string; label: string }[] = [
  { key: 'fc_validity', label: 'Fitness' },
  { key: 'home_tax_validity', label: 'Home Tax' },
  { key: 'insurance_validity', label: 'Insurance' },
  { key: 'pollution_validity', label: 'PUCC' },
  { key: 'base_point_validity', label: 'Permit' },
  { key: 'atp_validity', label: 'AITP' },
  { key: 'atp_authentication_validity', label: 'Authorization' },
]

const TABS = ['All', 'Overdue', '1 Week', '15 Days', '1 Month', '3 Months'] as const
type Tab = (typeof TABS)[number]

type Band = 'unset' | 'overdue' | 'urgent' | 'soon' | 'upcoming' | 'safe'

const BAND_STYLES: Record<Band, string> = {
  unset: 'text-slate-400 bg-slate-50 border-slate-200',
  overdue: 'text-red-700 bg-red-50 border-red-300 font-bold',
  urgent: 'text-orange-700 bg-orange-50 border-orange-300 font-bold',
  soon: 'text-amber-700 bg-amber-50 border-amber-200 font-semibold',
  upcoming: 'text-blue-700 bg-blue-50 border-blue-200',
  safe: 'text-emerald-700 bg-emerald-50/60 border-transparent',
}

function fmtDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return String(d)
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
}

// YYYY-MM-DD in the fleet's local timezone — used both as the picker's selected value
// and as the basis for day-diff math, so it stays correct regardless of the browser's timezone.
function toKolkataISO(d: any): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

function daysRemaining(d: any): number | null {
  const iso = toKolkataISO(d)
  if (!iso) return null
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const [ty, tm, td] = todayIso.split('-').map(Number)
  const [dy, dm, dd] = iso.split('-').map(Number)
  return Math.round((Date.UTC(dy, dm - 1, dd) - Date.UTC(ty, tm - 1, td)) / 86400000)
}

function bandFor(days: number | null): Band {
  if (days == null) return 'unset'
  if (days < 0) return 'overdue'
  if (days <= 7) return 'urgent'
  if (days <= 15) return 'soon'
  if (days <= 30) return 'upcoming'
  return 'safe'
}

function matchesTab(tab: Exclude<Tab, 'All'>, days: number | null): boolean {
  if (days == null) return false
  if (tab === 'Overdue') return days < 0
  if (tab === '1 Week') return days >= 0 && days <= 7
  if (tab === '15 Days') return days >= 0 && days <= 15
  if (tab === '1 Month') return days >= 0 && days <= 30
  return days >= 0 && days <= 90 // '3 Months'
}

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

  const rows = useMemo(() => {
    if (tab === 'All') return busList
    return busList.filter((b: any) =>
      VALIDATION_FIELDS.some((f) => matchesTab(tab as Exclude<Tab, 'All'>, daysRemaining(b[f.key])))
    )
  }, [busList, tab])

  const columns: Column[] = useMemo(() => {
    const base: Column[] = [
      { label: 'Sl No', key: '_idx', align: 'center', render: (_v, _row, i) => <span className="text-sm text-slate-500">{i + 1}</span> },
      { label: 'Bus No', key: 'bus_no', filterable: true, render: (v) => <span className="font-bold text-blue-600 whitespace-nowrap">{String(v)}</span> },
      { label: 'Vehicle Type', key: 'vehicle_type', filterable: true, render: (v) => <span className="text-sm">{v ? String(v) : '—'}</span> },
      { label: 'Company', key: 'company', filterable: true, render: (v) => <span className="text-sm">{v ? String(v) : '—'}</span> },
    ]

    const dateCols: Column[] = VALIDATION_FIELDS.map(({ key, label }) => ({
      label,
      key,
      filterable: true,
      render: (v: any, row: any) => {
        const days = daysRemaining(v)
        const band = bandFor(days)
        const highlighted = tab !== 'All' && matchesTab(tab as Exclude<Tab, 'All'>, days)

        return (
          <MiniDatePicker
            value={toKolkataISO(v)}
            onChange={(iso) => saveDate({ bus_id: row.id, field: key, value: iso })}
            className={cn(
              'inline-flex flex-col items-start px-2.5 py-1 rounded-lg border text-xs whitespace-nowrap transition-all hover:ring-2 hover:ring-blue-300',
              BAND_STYLES[band],
              highlighted && 'ring-2 ring-offset-1 ring-blue-500'
            )}
          >
            <span className="text-sm">{fmtDate(v)}</span>
            {days != null && (
              <span className="text-[10px] opacity-80">{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}</span>
            )}
          </MiniDatePicker>
        )
      },
    }))

    return [...base, ...dateCols]
  }, [tab, saveDate])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Vehicle Validations" subtitle="Track document expiry across the fleet and edit dates inline" />
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
