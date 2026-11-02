import { usePermissions } from '@/lib/usePermissions'
﻿import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle, XCircle, Clock, X, User, FileText, ShieldCheck, Pencil } from 'lucide-react'
import { useCanReviseApproved } from '@/lib/approvedEditors'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GlassCard, Button, Label, DataTable, Badge, PageHeader, DateRangePicker, ApprovalStatusTabs, ApprovalRowActions, ApprovalBulkButtons, ApprovalModalButtons, RejectReasonModal, RejectionReasonNote } from '@/components/shared'
import type { Column, ApprovalTab } from '@/components/shared'
import { tripsService } from '@/services/trips.service'
import { formatDate, todayISO, localDateTime } from '@/lib/utils'
import ReferenceAuditModal from '@/components/shared/ReferenceAuditModal'
import VoucherApprovalsPage from '@/pages/accounting/VoucherApprovalsPage'
import TripCreationPage from './TripCreationPage'
import { needsAuthorization, awaitingApproval } from '@/lib/tripAuthorization'

const isAuthorized = (t: any) => Number(t.admin_status) === 0 && !!t.authorized_at
const today = todayISO()
const firstOfMonth = today.slice(0, 8) + '01'
// Approved trips open on the last 10 days, so the long history is not loaded
// into view; the date range can still be widened.
const daysAgoISO = (n: number) => {
  const d = new Date(); d.setDate(d.getDate() - n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
type TabKey = ApprovalTab | 'To Authorize' | 'Authorized'
// A trip's voucher ledgers, one entry per debit / credit line with its amount.
const ledgerLines = (r: any, side: 'debit' | 'credit'): { name: string; amount: number }[] => {
  const names = String(r[`${side}_lines_names`] ?? '').split('|').filter(Boolean)
  const amounts = String(r[`${side}_lines_amounts`] ?? '').split('|')
  if (names.length) return names.map((name, i) => ({ name, amount: Number(amounts[i]) || 0 }))
  const single = String(r[`${side}_ledger_name`] ?? '').trim()
  return single ? [{ name: single, amount: 0 }] : []
}

// The step between filing and approval. It only exists once someone has been
// given the Authorize grant (the server sends auth_required with every trip);
// until then trips go straight to Approval as before.

export default function AdminApprovalsPage() {
  const { canApprove, canAuthorize, canEdit } = usePermissions()
  // 'To Authorize' is this page's own first stage; the other three are the
  // standard approval tabs Fuel uses.
  const [tab, setTab] = useState<TabKey>(canAuthorize ? 'To Authorize' : 'pending')
  const [rejectTarget, setRejectTarget] = useState<{ rows: any[] } | null>(null)
  const [bulkRejecting, setBulkRejecting] = useState(false)
  const [viewTrip, setViewTrip] = useState<any>(null)
  const [editRef, setEditRef] = useState<string | null>(null)
  const [selectedTrips, setSelectedTrips] = useState<any[]>([])
  const [bulkApproving, setBulkApproving] = useState(false)
  // To Authorize / Authorized open with no date selected, so every trip is listed until a range is picked.
  const [applied, setApplied] = useState(canAuthorize ? { from: '', to: '' } : { from: firstOfMonth, to: today })
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({})
  const qc = useQueryClient()
  const canReviseApproved = useCanReviseApproved()

  // All trips from trip_created table (same source as TripCreationPage)
  const { data: tripData, isLoading } = useQuery({
    queryKey: ['trips'],
    queryFn: () => tripsService.getTrips1(),
  })

  const refreshAfterStatus = () => {
    for (const key of ['trips', 'trip-expenses', 'bs-transactions', 'pl-transactions', 'trial-balance', 'trial-balance-opening', 'daybook']) {
      qc.invalidateQueries({ queryKey: [key] })
    }
  }
  const sendStatus = (row: any, status: 0 | 1 | 2, reason = '') => tripsService.updateTripAdminStatus({
    vouchervalue: status,
    voucherdata: { id: row.id, c_number: row.c_number },
    rejection_reason: reason,
    user_id: localStorage.getItem('user_id'),
    user_nm: localStorage.getItem('usr_nm'),
    updated_date: localDateTime(),
  })
  const [updating, setUpdating] = useState(false)
  const onStatusChange = async (row: any, status: 0 | 1 | 2, reason = '') => {
    setUpdating(true)
    const res = await sendStatus(row, status, reason).catch(() => null)
    setUpdating(false)
    if (res?.status === 200) {
      toast.success(status === 1 ? 'Trip approved' : status === 2 ? 'Trip rejected' : 'Trip reopened for review')
      refreshAfterStatus()
      setViewTrip(null)
    } else {
      const message = typeof res?.data === 'string' ? res.data : res?.message || res?.msg
      toast.error(message || 'Failed to update status')
    }
  }

  const { mutate: authorize, isPending: authorizing } = useMutation({
    mutationFn: (row: any) => tripsService.authorizeTrip({
      c_number: row.c_number,
      user_id: localStorage.getItem('user_id'),
      user_nm: localStorage.getItem('usr_nm'),
    }),
    onSuccess: (res) => {
      if (res?.status === 200) {
        toast.success('Trip authorized')
        qc.invalidateQueries({ queryKey: ['trips'] })
        qc.invalidateQueries({ queryKey: ['trip-expenses'] })
        qc.invalidateQueries({ queryKey: ['trip-audit'] })
      } else toast.error(res?.data?.msg || 'Could not authorize')
    },
    onError: () => toast.error('Server error'),
  })

  const allTrips: any[] = tripData?.data ?? []

  // Approve / reject the selected trips one after another, as Fuel does.
  const runBulk = async (rows: any[], status: 1 | 2, reason = '') => {
    const eligible = rows.filter(awaitingApproval)
    if (!canApprove || !eligible.length) { toast.error('Select trips that are awaiting approval'); return }
    if (status === 1) setBulkApproving(true); else setBulkRejecting(true)
    let done = 0
    for (const row of eligible) {
      const result = await sendStatus(row, status, reason).catch(() => null)
      if (result?.status === 200) done++
    }
    setBulkApproving(false); setBulkRejecting(false)
    setSelectedTrips([])
    const verb = status === 1 ? 'approved' : 'rejected'
    if (done === eligible.length) toast.success(`${done} trip${done === 1 ? '' : 's'} ${verb}`)
    else toast.error(`${done} of ${eligible.length} trips ${verb}`)
    refreshAfterStatus()
  }
  const askReject = (rows: any[]) => { if (rows.length) setRejectTarget({ rows }) }
  const confirmReject = (reason: string) => {
    const rows = rejectTarget?.rows ?? []
    setRejectTarget(null)
    if (rows.length === 1) onStatusChange(rows[0], 2, reason)
    else runBulk(rows, 2, reason)
  }

  const changeTab = (next: TabKey) => {
    setTab(next); setSelectedTrips([]); setColFilters({})
    setApplied(next === 'To Authorize' || next === 'Authorized' ? { from: '', to: '' } : next === 'approved' ? { from: daysAgoISO(10), to: today } : { from: firstOfMonth, to: today })
  }

  // Date-range filter + status filter
  const filtered = useMemo(() => {
    const statusMap: Record<string, number> = { approved: 1, rejected: 2 }
    return allTrips.filter((t) => {
      if (tab === 'To Authorize') { if (!needsAuthorization(t)) return false }
      else if (tab === 'Authorized') { if (!isAuthorized(t)) return false }
      else if (tab === 'pending') { if (!awaitingApproval(t)) return false }
      else if (Number(t.admin_status) !== statusMap[tab]) return false
      // The date range only narrows the list once one is picked; the authorization
      // tabs start with none, so no older trip is hidden.
      const d = String(t.trip_date ?? t.cts ?? '').split('T')[0]
      if (!d) return true
      if (applied.from && d < applied.from) return false
      if (applied.to && d > applied.to) return false
      return true
    })
  }, [allTrips, tab, applied])

  // Debit / credit ledgers as lists, so the column filters see each ledger.
  const rows = useMemo(() => filtered.map((t) => ({
    ...t,
    debit_ledger_name: ledgerLines(t, 'debit').map((l) => l.name),
    credit_ledger_name: ledgerLines(t, 'credit').map((l) => l.name),
    _debit: ledgerLines(t, 'debit'), _credit: ledgerLines(t, 'credit'),
  })), [filtered])

  const pendingCount = allTrips.filter(awaitingApproval).length
  const authorizedCount = allTrips.filter(isAuthorized).length
  const authorizeCount = allTrips.filter(needsAuthorization).length
  const approvedCount = allTrips.filter((t) => Number(t.admin_status) === 1).length
  const rejectedCount = allTrips.filter((t) => Number(t.admin_status) === 2).length

  const dash = (v: unknown) => String(v ?? '').trim() ? String(v) : <span className="text-slate-300">—</span>
  const money = (v: unknown) => Number(v) ? <span className="text-sm font-semibold">{Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> : <span className="text-slate-300 text-xs">—</span>
  // Same columns, in the same order, as the Trip Records table on Trip Creation;
  // the money columns are picked out with a green header.
  const authStage = tab === 'To Authorize' || tab === 'Authorized'
  // Each ledger on its own line with its amount under the name.
  const ledgerCell = (lines: { name: string; amount: number }[]) => !lines?.length ? <span className="text-slate-300">—</span> : (
    <div className="space-y-1.5">
      {lines.map((l, i) => (
        <div key={i} className="leading-tight">
          <div className="text-sm text-slate-800">{l.name}</div>
          {l.amount > 0 && <div className="text-xs font-semibold text-slate-500">₹{l.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
        </div>
      ))}
    </div>
  )
  const buildCols = (): Column[] => [
    { label: 'Sl No', key: '_sl', align: 'center', render: (_v, _r, i) => i + 1 },
    {
      label: 'Vehicle Type', key: 'vehicle_type', filterable: true,
      filterOptions: [{ label: 'bus', value: 'bus' }, { label: 'van', value: 'van' }],
      render: (_v, r: any) => r.vehicle_type === 'van' ? <Badge variant="purple">Van</Badge> : <Badge variant="info">Bus</Badge>,
    },
    {
      label: 'Ref ID', key: 'c_number', ownRefRender: true, filterable: true,
      render: (v, r: any) => (
        <button type="button" onClick={() => r.c_number && setViewTrip(r)}
          className="font-bold text-blue-600 hover:text-blue-800 hover:underline">{String(v ?? `#${r.id}`)}</button>
      ),
    },
    { label: 'Date', key: 'trip_date', render: (v) => formatDate(v) },
    {
      label: 'Status', key: 'trip_run_status', filterable: true,
      filterOptions: [{ label: 'Running', value: 'Running' }, { label: 'Full Trip', value: 'Full Trip' }, { label: 'Halt', value: 'Halt' }],
      render: (v) => <Badge variant={v === 'Halt' ? 'danger' : v === 'Full Trip' ? 'info' : 'success'}>{String(v ?? 'Running')}</Badge>,
    },
    { label: 'Bus No', key: 'bus_no', filterable: true, render: (v) => <span className="font-semibold">{String(v ?? '—')}</span> },
    { label: 'Service No', key: 'service_no', filterable: true, render: dash },
    { label: 'Service For', key: 'trip_for', filterable: true, render: dash },
    { label: 'Up/Down', key: 'up_down', filterable: true, render: dash },
    { label: 'Driver 1', key: 'driver1_name', filterable: true, render: (v, r: any) => dash(v || r.opt_driver1_name) },
    { label: 'Driver 2', key: 'driver2_name', filterable: true, render: (v, r: any) => dash(v || r.opt_driver2_name) },
    { label: 'Helper', key: 'helper_name', filterable: true, render: (v, r: any) => dash(v || r.opt_helper_name) },
    { label: 'Conductor', key: 'conductor_name', filterable: true, render: dash },
    { label: 'Paid To', key: 'paid_to_name', filterable: true, render: dash },
    ...(authStage ? [] : [
      { label: 'Amount', key: 'booking_amount', headerClassName: 'bg-emerald-600', render: (v: unknown, r: any) => money(v || r.total_amount) } as Column,
      { label: 'Debit Ledger', key: 'debit_ledger_name', filterable: true, headerClassName: 'bg-emerald-600', render: (_v: unknown, r: any) => ledgerCell(r._debit) } as Column,
      { label: 'Credit Ledger', key: 'credit_ledger_name', filterable: true, headerClassName: 'bg-emerald-600', render: (_v: unknown, r: any) => ledgerCell(r._credit) } as Column,
    ]),
    { label: 'Remarks', key: 'remarks', render: (v) => <span className="text-xs text-slate-500 truncate max-w-[10rem] block">{String(v ?? '—')}</span> },
    ...(tab === 'rejected' ? [{ label: 'Reason', key: 'rejection_reason', render: (v: unknown) => v ? <span className="text-red-700 text-xs max-w-[220px] line-clamp-2 block">{String(v)}</span> : <span className="text-slate-300">—</span> } as Column] : []),
    {
      label: 'Action', key: 'id',
      render: (_, row: any) => (
        <div className="flex gap-1.5 items-center">
          {canAuthorize && needsAuthorization(row) && (
            <Button size="sm" disabled={authorizing} onClick={() => authorize(row)}>
              <ShieldCheck className="w-3.5 h-3.5" /> Authorize
            </Button>
          )}
          {!authStage && (
            <ApprovalRowActions tab={tab as ApprovalTab}
              onView={() => setViewTrip(row)}
              onApprove={() => onStatusChange(row, 1)} onReject={() => askReject([row])} onReopen={() => onStatusChange(row, 0)} />
          )}
          {authStage && (
            <button type="button" onClick={() => setViewTrip(row)} className="text-xs font-bold text-blue-600 hover:underline">View</button>
          )}
          {canReviseApproved && (
            <button type="button" title="Edit the trip" onClick={() => setEditRef(String(row.c_number))}
              className="p-1.5 text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"><Pencil className="w-4 h-4" /></button>
          )}
        </div>
      ),
    },
  ]

  const leadingTabs = [
    ...(canAuthorize ? [{ key: 'To Authorize', label: 'To Authorize', desc: 'Needs authorization', count: authorizeCount, Icon: ShieldCheck, color: 'text-teal-700', activeBg: 'bg-teal-50', activeBorder: 'border-teal-300' }] : []),
    ...(canAuthorize || authorizedCount > 0 ? [{ key: 'Authorized', label: 'Authorized', desc: 'Authorized, not yet approved', count: authorizedCount, Icon: CheckCircle, color: 'text-sky-700', activeBg: 'bg-sky-50', activeBorder: 'border-sky-300' }] : []),
  ]
  const tabCounts = { pending: pendingCount, approved: approvedCount, rejected: rejectedCount }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <PageHeader title="Trip Approvals" subtitle="Review pending trips and approve or reject them" />

      <ApprovalStatusTabs tab={tab} onChange={changeTab} counts={tabCounts} leading={leadingTabs} />

      {/* Date filter */}
      <GlassCard className="p-4" colorBar="bg-gradient-to-r from-slate-400 to-slate-500">
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <Label>Date / Date range</Label>
            <DateRangePicker max={today} from={applied.from} to={applied.to}
              onChange={(r) => setApplied({ from: r.fromdate, to: r.todate })} />
          </div>
          {(applied.from || applied.to) && (
            <Button variant="outline" onClick={() => setApplied({ from: '', to: '' })}>Clear dates</Button>
          )}
        </div>
      </GlassCard>

      {/* Table */}
      <DataTable
        title={tab === 'To Authorize' ? `Trips To Authorize (${filtered.length})` : tab === 'Authorized' ? `Authorized Trips (${filtered.length})` : tab === 'pending' ? `Trips Awaiting Approval (${filtered.length})` : tab === 'approved' ? `Approved Trips (${filtered.length})` : `Rejected Trips (${filtered.length})`}
        columns={buildCols()}
        data={rows}
        actions={[]}
        columnFilters={colFilters}
        onColumnFilterChange={(key, vals) => setColFilters((f) => ({ ...f, [key]: vals }))}
        loading={isLoading}
        selectable={canApprove && tab === 'pending'}
        onSelectionChange={(rows) => setSelectedTrips(rows as any[])}
        selectionActions={canApprove && tab === 'pending' ? (
          <ApprovalBulkButtons approving={bulkApproving} rejecting={bulkRejecting}
            onApprove={() => runBulk(selectedTrips, 1)} onReject={() => askReject(selectedTrips)} />
        ) : undefined}
        icon={
          tab === 'To Authorize' ? <ShieldCheck className="w-5 h-5 text-teal-500" />
          : tab === 'Authorized' ? <CheckCircle className="w-5 h-5 text-sky-500" />
          : tab === 'pending' ? <Clock className="w-5 h-5 text-amber-500" />
          : tab === 'approved' ? <CheckCircle className="w-5 h-5 text-emerald-500" />
          : <XCircle className="w-5 h-5 text-red-500" />
        }
      />

      <RejectReasonModal open={!!rejectTarget} onCancel={() => setRejectTarget(null)} onConfirm={confirmReject}
        subject={rejectTarget && rejectTarget.rows.length === 1
          ? `Trip ${String(rejectTarget.rows[0].c_number ?? '')}`
          : `Rejecting ${rejectTarget?.rows.length ?? 0} trips`} />

      {/* Edit the trip in place - the Trip Creation edit form, with no navigation */}
      {editRef && <TripCreationPage editRef={editRef} onEditClose={() => { setEditRef(null); qc.invalidateQueries({ queryKey: ['trips'] }) }} />}

      {/* View modal */}
      {/* The trip's full record (trip, filed expense, ledger entries, activity) with
          the stage's actions in its footer; the Ref ID and the eye open the same view. */}
      {viewTrip && viewTrip.voucher_number && (
        <VoucherApprovalsPage viewRef={String(viewTrip.voucher_number)}
          onViewClose={() => { setViewTrip(null); refreshAfterStatus(); qc.invalidateQueries({ queryKey: ['voucher-search'] }) }} />
      )}
      {viewTrip && !viewTrip.voucher_number && (
        <ReferenceAuditModal reference={String(viewTrip.c_number ?? '')} initialRecord={viewTrip} moduleLabel="Trip"
          onClose={() => setViewTrip(null)}
          footerActions={<>
            {(canReviseApproved || (canEdit && !viewTrip.authorized_at && Number(viewTrip.admin_status) === 0)) && (
              <Button variant="outline" onClick={() => { const r = viewTrip; setViewTrip(null); setEditRef(String(r.c_number)) }}>
                <Pencil className="w-4 h-4" /> Edit
              </Button>
            )}
            {canAuthorize && needsAuthorization(viewTrip) ? (
              <Button disabled={authorizing} onClick={() => { authorize(viewTrip); setViewTrip(null) }}>
                <ShieldCheck className="w-4 h-4" /> Authorize
              </Button>
            ) : awaitingApproval(viewTrip) || Number(viewTrip.admin_status) === 2 ? (
              <ApprovalModalButtons tab={Number(viewTrip.admin_status) === 2 ? 'rejected' : 'pending'}
                onApprove={() => onStatusChange(viewTrip, 1)} onReject={() => { const t = viewTrip; setViewTrip(null); askReject([t]) }} onReopen={() => onStatusChange(viewTrip, 0)} />
            ) : undefined}
          </>} />
      )}
    </motion.div>
  )
}
