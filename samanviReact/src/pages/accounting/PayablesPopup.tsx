import { useEffect } from 'react'
import { createPortal } from 'react-dom'
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
    const onKey = (e: KeyboardEvent) => {
      // A voucher / payment-history modal opened from inside the sheet takes
      // Escape first — otherwise one keypress would tear down the whole sheet
      // underneath it.
      if (e.key !== 'Escape') return
      if (document.querySelector('[data-payables-inner-modal]')) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // The page behind must not scroll under the sheet — two live scrollbars made
  // the wheel act on whichever the pointer happened to be over.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Portalled to <body> so the sheet covers the whole window. Rendered in
  // place it stays inside <main>, and the sidebar (its own stacking context at
  // z-50) painted straight over the left edge of the panel with no dimming.
  return createPortal(
    <div
      id="modal-scroll-container"
      className="fixed inset-0 z-[70] bg-slate-900/50 backdrop-blur-sm overflow-y-auto p-3 sm:p-6"
      onClick={onClose}
    >
      {/* The view's own modals portal to <body> at z-80, so they sit above this sheet. */}
      <div
        className="mx-auto max-w-[96rem] min-w-0 rounded-3xl bg-slate-50 shadow-2xl p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <PayablesView initialData={data} onClose={onClose} />
      </div>
    </div>,
    document.body
  )
}
