import { CheckCircle, XCircle, Clock, Eye, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { Button } from './Button'
import { usePermissions } from '@/lib/usePermissions'

// The approval flow Voucher Approvals uses, packaged so the fuel and laundry
// pages review their records the same way: three status tabs with counts,
// Approve buttons on each pending row (Reopen / Approve directly on a
// rejected one), the same buttons in the bulk bar over selected rows. Edit and
// Delete ask for a reason (see ReasonPrompt).

export type ApprovalTab = 'pending' | 'approved' | 'rejected'

// admin_status as every module stores it: 0 pending, 1 approved, 2 rejected.
export const approvalTabOf = (adminStatus: unknown): ApprovalTab =>
  Number(adminStatus) === 1 ? 'approved' : Number(adminStatus) === 2 ? 'rejected' : 'pending'

// `leading` puts a page's own extra stage in front of the three standard ones
// (Trip Approvals' "To Authorize"); it is picked the same way, by its key.
export type ApprovalLeadingTab = { key: string; label: string; desc: string; count: number; Icon: typeof Clock; color: string; activeBg: string; activeBorder: string }

export function ApprovalStatusTabs({ tab, onChange, counts, leading = [] }: {
  tab: string
  onChange: (tab: any) => void
  counts: Record<ApprovalTab, number>
  leading?: ApprovalLeadingTab[]
}) {
  const tabs = [
    { key: 'pending' as const, label: 'Awaiting Approval', desc: 'Needs review', color: 'text-amber-700', activeBg: 'bg-amber-50', activeBorder: 'border-amber-300', Icon: Clock },
    { key: 'approved' as const, label: 'Approved', desc: 'Posted & confirmed', color: 'text-emerald-700', activeBg: 'bg-emerald-50', activeBorder: 'border-emerald-300', Icon: CheckCircle },
    { key: 'rejected' as const, label: 'Rejected', desc: 'Declined / not posted', color: 'text-red-700', activeBg: 'bg-red-50', activeBorder: 'border-red-300', Icon: XCircle },
  ]
  const all = [...leading.map((l) => ({ ...l, n: l.count })), ...tabs.map((t) => ({ ...t, n: counts[t.key] }))]
  return (
    <div className="flex gap-3 flex-wrap">
      {all.map((t) => (
        <button key={t.key} type="button" onClick={() => onChange(t.key)}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${tab === t.key ? `${t.activeBg} shadow-sm ${t.color} ${t.activeBorder}` : 'bg-white/60 text-slate-500 border-transparent hover:bg-white/80 hover:border-slate-200'}`}>
          <t.Icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex flex-col items-start leading-tight">
            <span>{t.label}</span>
            <span className={`text-[10px] font-normal leading-none mt-0.5 ${tab === t.key ? 'opacity-70' : 'text-slate-400'}`}>{t.desc}</span>
          </span>
          <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-black flex-shrink-0 ${tab === t.key ? 'bg-white border border-current/30' : 'bg-slate-100 text-slate-500'}`}>{t.n}</span>
        </button>
      ))}
    </div>
  )
}

// The per-row button group, in the same order everywhere: View, Edit, Approve,
// Delete. Edit and Delete ask for a reason first (the caller's handler opens the
// reason prompt). View is always there; Edit and Delete only while the record
// is still pending (an approved or rejected one is on the books or declined,
// and the server refuses to change it). Reopen (rejected rows) sits last.
export function ApprovalRowActions({ tab, onView, onEdit, editLocked, onDelete, onApprove, onReopen }: {
  tab: ApprovalTab
  // Show Edit on approved / rejected rows too (for pages whose server lets approved editors change them).
  editLocked?: boolean
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onApprove: () => void
  onReopen: () => void
}) {
  const { canView, canEdit, canDelete, canApprove } = usePermissions()
  return (
    <div className="flex gap-1.5">
      {canView && onView && <button type="button" onClick={onView} title="View" className="p-1.5 text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100"><Eye className="w-4 h-4" /></button>}
      {canEdit && (tab === 'pending' || editLocked) && onEdit && <button type="button" onClick={onEdit} title="Edit" className="p-1.5 text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"><Pencil className="w-4 h-4" /></button>}
      {canApprove && tab === 'pending' && <button type="button" onClick={onApprove} title="Approve" className="p-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100"><CheckCircle className="w-4 h-4" /></button>}
      {canApprove && tab === 'rejected' && <button type="button" onClick={onApprove} title="Approve directly" className="p-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100"><CheckCircle className="w-4 h-4" /></button>}
      {canDelete && tab === 'pending' && onDelete && <button type="button" onClick={onDelete} title="Delete" className="p-1.5 text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
      {canApprove && tab === 'rejected' && <button type="button" onClick={onReopen} title="Reopen for review" className="p-1.5 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100"><RotateCcw className="w-4 h-4" /></button>}
    </div>
  )
}

// The Approve Selected button for the table's selection bar.
export function ApprovalBulkButtons({ onApprove, approving }: {
  onApprove: () => void
  approving?: boolean
}) {
  const { canApprove } = usePermissions()
  if (!canApprove) return null
  return (
    <button type="button" onClick={onApprove} disabled={approving}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
      <CheckCircle className="w-3.5 h-3.5" /> {approving ? 'Approving…' : 'Approve Selected'}
    </button>
  )
}

// The Approve (or Reopen / Approve directly) buttons at the foot of a record's
// view popup. Reject is no longer offered here.
export function ApprovalModalButtons({ tab, onApprove, onReopen }: {
  tab: ApprovalTab
  onApprove: () => void
  onReopen: () => void
}) {
  const { canApprove } = usePermissions()
  if (!canApprove || tab === 'approved') return null
  return (
    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
      {tab === 'pending' && (
        <Button variant="success" onClick={onApprove}><CheckCircle className="w-4 h-4" /> Approve</Button>
      )}
      {tab === 'rejected' && (
        <>
          <Button variant="outline" onClick={onReopen} className="border-amber-300 text-amber-700 hover:bg-amber-50"><RotateCcw className="w-4 h-4" /> Reopen</Button>
          <Button variant="success" onClick={onApprove}><CheckCircle className="w-4 h-4" /> Approve Directly</Button>
        </>
      )}
    </div>
  )
}

// Why a record was declined, shown on the Rejected tab and in the view popup.
export function RejectionReasonNote({ reason }: { reason: unknown }) {
  if (!reason) return null
  return (
    <div className="p-4 bg-red-50/60 border border-red-100 rounded-2xl">
      <p className="text-xs font-bold uppercase text-red-500 mb-1">Rejection reason</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{String(reason)}</p>
    </div>
  )
}
