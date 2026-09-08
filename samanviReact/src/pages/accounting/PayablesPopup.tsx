import { useEffect } from 'react'
import { PayablesView } from './PayablesViewPage'

// Payables for one ledger, opened over the report the user is on rather than
// in a second tab. The ledger - and, for an edit from Voucher Approvals, the
// voucher - come in as props, so nothing goes through localStorage, and
// closing (the Close button, a click outside, or Escape) returns to the report
// with nothing to reload.
export function PayablesPopup({ ledger, editVoucher, onClose }: {
  ledger: { id: number; name: string }
  editVoucher?: any
  onClose: () => void
}) {
  const data = {
    groupName: ledger.name,
    entries: [{ id: ledger.id, name: ledger.name, temple_name: ledger.name }],
    editVoucher,
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm overflow-y-auto p-3 sm:p-6" onClick={onClose}>
      {/* The view's own modals are fixed at z-50, so they sit above this sheet. */}
      <div className="mx-auto max-w-[96rem] rounded-3xl bg-slate-50 shadow-2xl p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <PayablesView initialData={data} onClose={onClose} />
      </div>
    </div>
  )
}
