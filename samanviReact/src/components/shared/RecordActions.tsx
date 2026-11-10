import { lazy, Suspense, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle, RotateCcw, ShieldCheck, Pencil } from 'lucide-react'
import { Button } from './Button'
import { usePermissions } from '@/lib/usePermissions'
import { useCanReviseApproved } from '@/lib/approvedEditors'
import { tripsService } from '@/services/trips.service'
import { fuelService } from '@/services/fuel.service'
import { laundryService } from '@/services/laundry.service'
import { localDateTime } from '@/lib/utils'
import { needsAuthorization, awaitingApproval } from '@/lib/tripAuthorization'

// The actions every approval screen offers in its record modal (Edit / Authorize /
// Approve / Reopen), for any table that opens a Trip, Fuel or Laundry record by
// its reference number - so the Ref # gives the same buttons wherever it is
// clicked, not only on the module's own approvals page. Reject is no longer
// offered. Edit asks for a reason first, then opens the record's own edit form
// over the current page (lazy-loaded, so nothing is pulled in until it is used).
const TripCreationPage = lazy(() => import('@/pages/trips/TripCreationPage'))
const FuelEntryPage = lazy(() => import('@/pages/fuel/FuelEntryPage'))

export const ACTION_MODULES = ['Trip', 'Fuel', 'Laundry']

const named = () => localStorage.getItem('usr_nm') ?? ''
const userId = () => localStorage.getItem('user_id') ?? '0'

export function RecordActions({ module, reference, record, onClose, setHidden }: {
  module: string
  reference: string
  record: any
  onClose: () => void
  /** Hides the details sheet while a reason prompt or edit form is on screen. */
  setHidden: (hidden: boolean) => void
}) {
  const qc = useQueryClient()
  const tripPerms = usePermissions('/trips/approvals')
  const fuelPerms = usePermissions('/fuel/entry')
  const laundryPerms = usePermissions('/laundry/bill')
  const canRevise = useCanReviseApproved()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  // A trip's authorization and expense state lives on the trip list.
  const { data: trips } = useQuery({ queryKey: ['trips'], queryFn: () => tripsService.getTrips1(), enabled: module === 'Trip', staleTime: 0 })
  const row: any = module === 'Trip'
    ? ((trips?.data ?? []) as any[]).find((t) => String(t.c_number) === reference) ?? record
    : record
  if (!row) return null

  const perms = module === 'Trip' ? tripPerms : module === 'Fuel' ? fuelPerms : laundryPerms
  const status = Number(row.admin_status ?? 0)

  const refresh = () => {
    for (const key of ['trips', 'trip-expenses', 'fuel-entries', 'fuel-entries-search', 'laundry-bills', 'reference-audit', 'bs-transactions', 'pl-transactions', 'trial-balance', 'daybook']) {
      qc.invalidateQueries({ queryKey: [key] })
    }
  }
  const finish = (ok: boolean, message: string, failMessage?: string) => {
    setBusy(false)
    if (ok) { toast.success(message); refresh(); onClose() } else toast.error(failMessage || 'Failed')
  }

  const setStatus = async (next: 0 | 1 | 2, reason = '') => {
    setBusy(true)
    const done = next === 1 ? 'Approved' : next === 2 ? 'Rejected' : 'Reopened for review'
    if (module === 'Trip') {
      const res = await tripsService.updateTripAdminStatus({
        vouchervalue: next, voucherdata: { id: row.id, c_number: row.c_number }, rejection_reason: reason,
        user_id: userId(), user_nm: named(), updated_date: localDateTime(),
      }).catch(() => null)
      return finish(res?.status === 200, done, typeof res?.data === 'string' ? res.data : res?.message || res?.msg)
    }
    if (module === 'Fuel') {
      const res = await fuelService.updateFuelAdminStatus({ id: row.id, admin_status: next, rejection_reason: reason, named: named(), user_id: userId() }).catch(() => null)
      return finish(res?.status === 200, done, res?.message)
    }
    const res = await laundryService.updateLaundryAdminStatus({ c_number: row.c_number, admin_status: next, rejection_reason: reason, named: named(), user_id: userId() }).catch(() => null)
    finish(res?.status === 200, done, res?.message)
  }

  const authorize = async () => {
    setBusy(true)
    const res = await tripsService.authorizeTrip({ c_number: row.c_number, user_id: userId(), user_nm: named() }).catch(() => null)
    finish(res?.status === 200, 'Trip authorized', res?.data?.msg || 'Could not authorize')
  }

  // Who may edit: the module's own Edit right while the record is still open,
  // and the approved editors (Super Admin) at any stage. Laundry's edit form is
  // the bill page itself, so it has no Edit here.
  const open = module === 'Trip' ? !row.authorized_at && status === 0 : status === 0
  const canEdit = module !== 'Laundry' && (canRevise || (perms.canEdit && open))
  const canAuthorize = module === 'Trip' && tripPerms.canAuthorize && needsAuthorization(row)
  const pending = module === 'Trip' ? awaitingApproval(row) : status === 0
  const canDecide = perms.canApprove && (pending || status === 2)

  const stopEdit = () => { setEditing(false); refresh(); onClose() }
  // The edit form itself asks for the reason, at its end above Save.
  const askEditRecord = () => { setHidden(true); setEditing(true) }

  return (
    <>
      {canEdit && <Button variant="outline" disabled={busy} onClick={askEditRecord}><Pencil className="w-4 h-4" /> Edit</Button>}
      {canAuthorize && <Button disabled={busy} onClick={authorize}><ShieldCheck className="w-4 h-4" /> Authorize</Button>}
      {canDecide && pending && (
        <Button variant="success" disabled={busy} onClick={() => setStatus(1)}><CheckCircle className="w-4 h-4" /> Approve</Button>
      )}
      {canDecide && !pending && status === 2 && (
        <>
          <Button variant="success" disabled={busy} onClick={() => setStatus(1)}><CheckCircle className="w-4 h-4" /> Approve Directly</Button>
          <Button variant="outline" disabled={busy} onClick={() => setStatus(0)} className="border-amber-300 text-amber-700 hover:bg-amber-50"><RotateCcw className="w-4 h-4" /> Reopen</Button>
        </>
      )}
      {createPortal(
        <>
          {editing && (
            <Suspense fallback={null}>
              {module === 'Trip' && <TripCreationPage editRef={reference} onEditClose={stopEdit} />}
              {module === 'Fuel' && <FuelEntryPage editRef={reference} onEditClose={stopEdit} />}
            </Suspense>
          )}
        </>,
        document.body,
      )}
    </>
  )
}
