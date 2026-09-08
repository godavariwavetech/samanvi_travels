import { motion } from 'motion/react'
import { Map, Bus, Fuel, Wrench, Users, FileText, Shirt, CheckCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { GlassCard, Badge, PageHeader, DualScrollTable } from '@/components/shared'
import { mastersService } from '@/services/masters.service'
import { tripsService } from '@/services/trips.service'
import { fuelService } from '@/services/fuel.service'
import { laundryService } from '@/services/laundry.service'
import { accountingService } from '@/services/accounting.service'
import { useAuthStore } from '@/store/auth.store'
import { useFYStore } from '@/store/fy.store'

function KpiCard({ label, value, icon: Icon, color, bg, loading }: {
  label: string; value: string | number; icon: React.ElementType
  color: string; bg: string; loading?: boolean
}) {
  return (
    <GlassCard className="p-6 flex flex-col justify-between group">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
      <div>
        {loading
          ? <div className="h-9 w-16 bg-slate-200 rounded-lg animate-pulse" />
          : <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</h3>
        }
      </div>
    </GlassCard>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const selectedFY = useFYStore(s => s.selectedFY)

  const fyFrom = new Date(selectedFY.fromDate)
  const fyTo = new Date(selectedFY.toDate)

  const inFY = (dateStr: string | null | undefined): boolean => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    return d >= fyFrom && d <= fyTo
  }

  const { data: buses, isLoading: loadBus } = useQuery({ queryKey: ['buses'], queryFn: () => mastersService.getBuses() })
  const { data: trips, isLoading: loadTrip } = useQuery({ queryKey: ['trips-dash'], queryFn: () => tripsService.getTrips() })
  const { data: fuelData, isLoading: loadFuel } = useQuery({ queryKey: ['fuel-dash'], queryFn: () => fuelService.getFuelEntries() })
  const { data: drivers, isLoading: loadDrv } = useQuery({ queryKey: ['drivers'], queryFn: () => mastersService.getDrivers() })
  const { data: laundry, isLoading: loadLaundry } = useQuery({ queryKey: ['laundry-dash'], queryFn: () => laundryService.getLaundryBills() })
  const { data: vouchers, isLoading: loadVoucher } = useQuery({ queryKey: ['vouchers-dash'], queryFn: () => accountingService.getVoucherEntries() })

  const activeBuses = (buses?.data ?? []).filter((b: any) => b.d_in === 0).length
  const activeDrivers = (drivers?.data ?? []).filter((d: any) => d.d_in === 0).length

  const allTrips: any[] = (trips?.data ?? [])
  const fyTrips = allTrips.filter((t: any) => inFY(t.trip_date ?? t.cts))
  const totalTrips = fyTrips.length
  const pendingApprovals = fyTrips.filter((t: any) => t.admin_status === 0).length
  const approvedTrips = fyTrips.filter((t: any) => t.admin_status === 1).length

  const fuelEntries = (fuelData?.data ?? fuelData ?? []).filter((f: any) => inFY(f.date)).length
  const laundryBills = (laundry?.data ?? laundry ?? []).filter((l: any) => inFY(l.date)).length
  const voucherEntries = (vouchers?.data ?? vouchers ?? []).filter((v: any) => inFY(v.voucherdate)).length

  const recentTrips: any[] = fyTrips.slice(0, 8)

  const kpis = [
    { label: 'Active Buses', value: activeBuses, icon: Bus, color: 'text-blue-600', bg: 'bg-blue-50', loading: loadBus },
    { label: 'Total Trips', value: totalTrips, icon: Map, color: 'text-emerald-600', bg: 'bg-emerald-50', loading: loadTrip },
    { label: 'Pending Approvals', value: pendingApprovals, icon: CheckCircle, color: 'text-amber-600', bg: 'bg-amber-50', loading: loadTrip },
    { label: 'Approved Trips', value: approvedTrips, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', loading: loadTrip },
    { label: 'Fuel Entries', value: fuelEntries, icon: Fuel, color: 'text-orange-600', bg: 'bg-orange-50', loading: loadFuel },
    { label: 'Active Drivers', value: activeDrivers, icon: Users, color: 'text-violet-600', bg: 'bg-violet-50', loading: loadDrv },
    { label: 'Laundry Bills', value: laundryBills, icon: Shirt, color: 'text-teal-600', bg: 'bg-teal-50', loading: loadLaundry },
    { label: 'Voucher Entries', value: voucherEntries, icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100', loading: loadVoucher },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle={`FY ${selectedFY.label}`}
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {/* Recent Trips */}
      <GlassCard className="overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Map className="w-5 h-5 text-blue-500" /> Recent Trips
          </h3>
          <span className="text-xs text-slate-400 font-medium">Last {recentTrips.length} entries</span>
        </div>
        {loadTrip ? (
          <div className="p-8 text-center text-slate-400">Loading trips…</div>
        ) : recentTrips.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No trip records yet. Start by creating a trip in Trip Management.</div>
        ) : (
          <DualScrollTable tableClassName="overflow-auto max-h-[70vh]">
            <table className="w-full text-left">
              <thead>
                <tr className="sticky top-0 z-10 bg-slate-50/60 border-b border-slate-100">
                  {['Trip ID', 'Date', 'Bus', 'Service', 'Driver', 'Status'].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentTrips.map((t: any, i) => (
                  <tr key={t.id ?? i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-bold text-blue-600 text-sm">{t.c_number ?? `#${t.id}`}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{String(t.trip_date ?? t.cts ?? '—').split('T')[0]}</td>
                    <td className="px-5 py-3 text-sm font-medium">{t.bus_no ?? '—'}</td>
                    <td className="px-5 py-3 text-sm">{t.service_no ?? '—'}</td>
                    <td className="px-5 py-3 text-sm text-slate-600">{t.driver1_name ?? '—'}</td>
                    <td className="px-5 py-3">
                      <Badge variant={t.admin_status === 1 ? 'success' : t.admin_status === 2 ? 'danger' : 'warning'}>
                        {t.admin_status === 1 ? 'Approved' : t.admin_status === 2 ? 'Rejected' : 'Pending'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DualScrollTable>
        )}
      </GlassCard>

      {/* Garage Repairs summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <GlassCard className="p-5 md:col-span-2">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Wrench className="w-4 h-4 text-red-500" /> Garage & Maintenance
          </h3>
          <p className="text-sm text-slate-500">Navigate to <span className="font-semibold text-slate-700">Garage & Maintenance → Repair Entry</span> to log and track vehicle repairs.</p>
        </GlassCard>
        <GlassCard className="p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
            <Fuel className="w-4 h-4 text-amber-500" /> Fuel Module
          </h3>
          <p className="text-sm text-slate-500">Go to <span className="font-semibold text-slate-700">Fuel → Fuel Entry</span> to log daily fuel fills per bus.</p>
        </GlassCard>
      </div>
    </motion.div>
  )
}
