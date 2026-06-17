import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Clock, X, Eye } from 'lucide-react'
import { GlassCard, DataTable, Badge, TopNavTabs, PageHeader, Button } from '@/components/shared'
import type { Column } from '@/components/shared'
import { tripsService } from '@/services/trips.service'
import ActivityHistory, { HistoryEntry } from '@/components/shared/ActivityHistory'
import { calculateTripDiff } from '@/lib/diffUtils'

const tabs = ['Updated Logs', 'Deleted Logs', 'Counts']

const updatedCols: Column[] = [
  { label: 'Trip No', key: 'c_number', render: (v) => <span className="font-bold text-blue-600">{String(v)}</span> },
  { label: 'Bus No', key: 'bus_no' },
  { label: 'Service No', key: 'service_no' },
  { label: 'Trip Date', key: 'trip_date' },
  { label: 'Driver 1', key: 'driver1_name' },
  { label: 'Updated By', key: 'updatedby_name' },
  { label: 'Updated At', key: 'updatedby_date' },
]

const deletedCols: Column[] = [
  { label: 'Trip No', key: 'c_number', render: (v) => <span className="font-bold text-red-600">{String(v)}</span> },
  { label: 'Deleted By', key: 'delete_by_name' },
  { label: 'Deleted At', key: 'delete_by_date' },
  { label: 'Remarks', key: 'remarks' },
]

export default function TripLogsPage() {
  const [tab, setTab] = useState('Updated Logs')
  const [viewModal, setViewModal] = useState<any>(null)

  const { data: updatedLogs, isLoading: loadingUpdated } = useQuery({ queryKey: ['trip-updated-logs'], queryFn: () => tripsService.getTripUpdatedLogs() })
  const { data: deletedLogs, isLoading: loadingDeleted } = useQuery({ queryKey: ['trip-deleted-logs'], queryFn: () => tripsService.getTripDeletedLogs() })
  const { data: counts } = useQuery({ queryKey: ['trip-logs-count'], queryFn: () => tripsService.getTripLogsCount() })

  const updatedList: any[] = updatedLogs?.data ?? []
  const deletedList: any[] = deletedLogs?.data ?? []
  const countsData: any = counts?.data ?? {}

  const { data: auditRes, isLoading: loadingAudit } = useQuery({
    queryKey: ['trip-audit', viewModal?.c_number],
    queryFn: () => tripsService.getTripUpdatedModal({ serviceNo: viewModal.c_number }),
    enabled: !!viewModal,
  })

  const auditTrail: HistoryEntry[] = (auditRes?.data ?? []).map((curr: any, i: number, arr: any[]) => {
    const prev = i > 0 ? arr[i - 1] : null
    const changes = prev ? calculateTripDiff(prev, curr) : []
    
    // For trips, we don't have a separate audit table, so we synthesize the entries
    // from the historical records found in the main table (d_in=2).
    return {
      action: i === 0 ? 'created' : 'edited',
      action_by_name: curr.updatedby_name || curr.action_by_name || 'System',
      action_at: curr.updatedby_date || curr.admin_action_date || curr.date,
      changes_note: JSON.stringify({
        reason: curr.remarks,
        changes: changes
      })
    }
  })

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Trip Logs" subtitle="Full audit trail of all trip modifications" />
      <TopNavTabs tabs={tabs} activeTab={tab} onChange={setTab} />

      {tab === 'Counts' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { label: 'Total Trips', value: countsData.total ?? '—', color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Updated', value: countsData.updated ?? updatedList.length, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Deleted', value: countsData.deleted ?? deletedList.length, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Active', value: countsData.active ?? '—', color: 'text-green-600', bg: 'bg-green-50' },
          ].map((s) => (
            <GlassCard key={s.label} className={`p-6 ${s.bg}`}>
              <div className="flex items-center gap-3 mb-3"><Activity className={`w-5 h-5 ${s.color}`} /></div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{s.label}</p>
              <h3 className={`text-3xl font-extrabold mt-1 ${s.color}`}>{s.value}</h3>
            </GlassCard>
          ))}
        </div>
      )}

      {tab === 'Updated Logs' && (
        <DataTable title="Trip Update History" columns={updatedCols} data={updatedList} loading={loadingUpdated} onAction={(action, row) => action === 'view' && setViewModal(row)} actions={['view']} />
      )}
      {tab === 'Deleted Logs' && (
        <DataTable title="Trip Deletion History" columns={deletedCols} data={deletedList} loading={loadingDeleted} onAction={(action, row) => action === 'view' && setViewModal(row)} actions={['view']} />
      )}

      {/* History Modal */}
      <AnimatePresence>
        {viewModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
              
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Activity History</h3>
                    <p className="text-xs font-medium text-slate-500">Trip Reference: <span className="text-blue-600">{viewModal.c_number}</span></p>
                  </div>
                </div>
                <button onClick={() => setViewModal(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                {loadingAudit ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-10 h-10 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                    <p className="text-sm font-medium text-slate-500 animate-pulse">Retrieving audit trail...</p>
                  </div>
                ) : (
                  <ActivityHistory 
                    data={auditTrail} 
                    initialCreator={viewModal?.usr_nm} 
                    initialDate={viewModal?.date} 
                  />
                )}
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <Button variant="outline" onClick={() => setViewModal(null)}>Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
