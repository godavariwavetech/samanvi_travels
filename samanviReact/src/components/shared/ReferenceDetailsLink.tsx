import { useState } from 'react'
import { createPortal } from 'react-dom'
import { History } from 'lucide-react'
import ReferenceAuditModal from './ReferenceAuditModal'

// Shared by module lists and accounting reports.
export function ReferenceDetailsLink({ value, onOtherClick }: { value: unknown; onOtherClick?: () => void }) {
  const [open, setOpen] = useState(false)
  const reference = String(value ?? '').trim()
  if (!reference || reference === '-') return <>{reference || '—'}</>
  return <>
    <button type="button" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
      title="View approval and authorization details"
      onClick={event => { event.stopPropagation(); setOpen(true) }}>
      {reference || '—'}
    </button>
    {onOtherClick && <button type="button" className="ml-1.5 text-slate-500 hover:text-blue-600" title="View record details / history" onClick={onOtherClick}><History className="inline h-3.5 w-3.5" /></button>}
    {open && createPortal(<ReferenceAuditModal reference={reference} onClose={() => setOpen(false)} />, document.body)}
  </>
}
