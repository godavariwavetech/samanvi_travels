import { useState, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { CheckCircle, XCircle, Clock, Eye, Pencil, Trash2, RotateCcw } from 'lucide-react'
import { Button } from './Button'

// The approval flow Voucher Approvals uses, packaged so the fuel and laundry
// pages review their records the same way: three status tabs with counts,
// Approve / Reject buttons on each pending row (Reopen / Approve directly on a
// rejected one), the same buttons in the bulk bar over selected rows, and a
// rejection that always asks for a reason.

export type ApprovalTab = 'pending' | 'approved' | 'rejected'

// admin_status as every module stores it: 0 pending, 1 approved, 2 rejected.
export const approvalTabOf = (adminStatus: unknown): ApprovalTab =>
  Number(adminStatus) === 1 ? 'approved' : Number(adminStatus) === 2 ? 'rejected' : 'pending'

export function ApprovalStatusTabs({ tab, onChange, counts }: {
  tab: ApprovalTab
  onChange: (tab: ApprovalTab) => void
  counts: Record<ApprovalTab, number>
}) {
  const tabs = [
    { key: 'pending' as const, label: 'Awaiting Approval', desc: 'Needs review', color: 'text-amber-700', activeBg: 'bg-amber-50', activeBorder: 'border-amber-300', Icon: Clock },
    { key: 'approved' as const, label: 'Approved', desc: 'Posted & confirmed', color: 'text-emerald-700', activeBg: 'bg-emerald-50', activeBorder: 'border-emerald-300', Icon: CheckCircle },
    { key: 'rejected' as const, label: 'Rejected', desc: 'Declined / not posted', color: 'text-red-700', activeBg: 'bg-red-50', activeBorder: 'border-red-300', Icon: XCircle },
  ]
  return (
    <div className="flex gap-3 flex-wrap">
      {tabs.map((t) => (
        <button key={t.key} type="button" onClick={() => onChange(t.key)}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold border transition-all ${tab === t.key ? `${t.activeBg} shadow-sm ${t.color} ${t.activeBorder}` : 'bg-white/60 text-slate-500 border-transparent hover:bg-white/80 hover:border-slate-200'}`}>
          <t.Icon className="w-4 h-4 flex-shrink-0" />
          <span className="flex flex-col items-start leading-tight">
            <span>{t.label}</span>
            <span className={`text-[10px] font-normal leading-none mt-0.5 ${tab === t.key ? 'opacity-70' : 'text-slate-400'}`}>{t.desc}</span>
          </span>
          <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-black flex-shrink-0 ${tab === t.key ? 'bg-white border border-current/30' : 'bg-slate-100 text-slate-500'}`}>{counts[t.key]}</span>
        </button>
      ))}
    </div>
  )
}

// The per-row button group. View is always there; Edit and Delete only while
// the record is still pending (an approved or rejected one is on the books or
// declined, and the server refuses to change it); Approve / Reject on pending,
// Reopen / Approve directly on rejected - the same set as a voucher row.
export function ApprovalRowActions({ tab, onView, onEdit, onDelete, onApprove, onReject, onReopen }: {
  tab: ApprovalTab
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onApprove: () => void
  onReject: () => void
  onReopen: () => void
}) {
  return (
    <div className="flex gap-1.5">
      {onView && <button type="button" onClick={onView} title="View" className="p-1.5 text-blue-600 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100"><Eye className="w-4 h-4" /></button>}
      {tab === 'pending' && onEdit && <button type="button" onClick={onEdit} title="Edit" className="p-1.5 text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100"><Pencil className="w-4 h-4" /></button>}
      {tab === 'pending' && onDelete && <button type="button" onClick={onDelete} title="Delete" className="p-1.5 text-slate-500 bg-slate-50 border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>}
      {tab === 'pending' && (
        <>
          <button type="button" onClick={onApprove} title="Approve" className="p-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100"><CheckCircle className="w-4 h-4" /></button>
          <button type="button" onClick={onReject} title="Reject" className="p-1.5 text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100"><XCircle className="w-4 h-4" /></button>
        </>
      )}
      {tab === 'rejected' && (
        <>
          <button type="button" onClick={onReopen} title="Reopen for review" className="p-1.5 text-amber-600 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100"><RotateCcw className="w-4 h-4" /></button>
          <button type="button" onClick={onApprove} title="Approve directly" className="p-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100"><CheckCircle className="w-4 h-4" /></button>
        </>
      )}
    </div>
  )
}

// The Approve Selected / Reject Selected pair for the table's selection bar.
export function ApprovalBulkButtons({ onApprove, onReject, approving, rejecting }: {
  onApprove: () => void
  onReject: () => void
  approving?: boolean
  rejecting?: boolean
}) {
  return (
    <>
      <button type="button" onClick={onApprove} disabled={approving || rejecting}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
        <CheckCircle className="w-3.5 h-3.5" /> {approving ? 'Approving…' : 'Approve Selected'}
      </button>
      <button type="button" onClick={onReject} disabled={approving || rejecting}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors">
        <XCircle className="w-3.5 h-3.5" /> {rejecting ? 'Rejecting…' : 'Reject Selected'}
      </button>
    </>
  )
}

// The Approve / Reject (or Reopen / Approve directly) buttons at the foot of
// a record's view popup.
export function ApprovalModalButtons({ tab, onApprove, onReject, onReopen }: {
  tab: ApprovalTab
  onApprove: () => void
  onReject: () => void
  onReopen: () => void
}) {
  if (tab === 'approved') return null
  return (
    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
      {tab === 'pending' && (
        <>
          <Button variant="danger" onClick={onReject}><XCircle className="w-4 h-4" /> Reject</Button>
          <Button variant="success" onClick={onApprove}><CheckCircle className="w-4 h-4" /> Approve</Button>
        </>
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

// The rejection-reason popup. `subject` names what is being rejected
// ("Fuel entry F260912001", "3 bills"); the reason is required.
export function RejectReasonModal({ open, subject, onCancel, onConfirm }: {
  open: boolean
  subject: ReactNode
  onCancel: () => void
  onConfirm: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Reason for Rejection</h3>
                <p className="text-sm text-slate-500">{subject}</p>
              </div>
            </div>
            <textarea autoFocus rows={4} placeholder="Enter rejection reason…" value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400/40 placeholder:text-slate-400" />
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={() => { setReason(''); onCancel() }}>Cancel</Button>
              <Button variant="danger" disabled={!reason.trim()} onClick={() => { const r = reason.trim(); setReason(''); onConfirm(r) }}>
                <XCircle className="w-4 h-4" /> Confirm Reject
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
