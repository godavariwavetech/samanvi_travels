import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'motion/react'
import { AlertCircle } from 'lucide-react'
import { Button } from './Button'

// The "Reason is mandatory" popup used before any Edit or Delete. The action
// only goes ahead once a non-empty reason is typed and confirmed.

export type ReasonRequest = {
  /** Heading, e.g. "Reason for Edit". */
  title: string
  /** What is being changed, e.g. "Bus KA-01-1234". */
  subject: ReactNode
  /** Confirm button text, e.g. "Continue to Edit". */
  confirmLabel: string
  /** Red styling for destructive actions such as Delete. */
  danger?: boolean
  onConfirm: (reason: string) => void
}

function ReasonModal({ request, onCancel }: { request: ReasonRequest | null; onCancel: () => void }) {
  const [reason, setReason] = useState('')
  const [lastRequest, setLastRequest] = useState(request)
  // A fresh request starts with an empty reason.
  if (request !== lastRequest) { setLastRequest(request); setReason('') }

  return createPortal(
    <AnimatePresence>
      {request && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${request.danger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">{request.title}</h3>
                <p className="text-sm text-slate-500">{request.subject}</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Reason <span className="text-red-500">*</span></label>
              <textarea autoFocus rows={4} placeholder="Enter the reason…" value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400/40 placeholder:text-slate-400" />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={() => { setReason(''); onCancel() }}>Cancel</Button>
              <Button variant={request.danger ? 'danger' : 'primary'} disabled={!reason.trim()}
                onClick={() => { const r = reason.trim(); setReason(''); request.onConfirm(r) }}>
                {request.confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// One prompt for the whole app, mounted once (ReasonPromptHost). Any button can
// call askEdit / askDelete / askReason: `run` gets the typed reason once it is
// confirmed, and nothing runs if the prompt is cancelled.
let setHostRequest: ((r: ReasonRequest | null) => void) | null = null

export function askReason(next: ReasonRequest) {
  setHostRequest?.({ ...next, onConfirm: (reason) => { setHostRequest?.(null); next.onConfirm(reason) } })
}
export const askEdit = (subject: ReactNode, run: (reason: string) => void) =>
  askReason({ title: 'Reason for Edit', subject, confirmLabel: 'Continue to Edit', onConfirm: run })
export const askDelete = (subject: ReactNode, run: (reason: string) => void) =>
  askReason({ title: 'Reason for Delete', subject, confirmLabel: 'Delete', danger: true, onConfirm: run })

export function ReasonPromptHost() {
  const [request, setRequest] = useState<ReasonRequest | null>(null)
  useEffect(() => {
    setHostRequest = setRequest
    return () => { setHostRequest = null }
  }, [])
  return <ReasonModal request={request} onCancel={() => setRequest(null)} />
}
