import { useState } from 'react'
import { History } from 'lucide-react'
import ReferenceAuditModal from './ReferenceAuditModal'

// Shared by module lists and accounting reports.
export function ReferenceDetailsLink({ value, onOtherClick, initialRecord, moduleLabel, loadAudit = true }: {
  value: unknown
  onOtherClick?: () => void
  initialRecord?: Record<string, unknown>
  moduleLabel?: string
  loadAudit?: boolean
}) {
  const [open, setOpen] = useState(false)
  const reference = String(value ?? '').trim()
  if (!reference || reference === '-') return <>{reference || '—'}</>
  return <>
    <button type="button" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
      title="View record details and activity"
      onClick={event => { event.stopPropagation(); setOpen(true) }}>
      {reference || '—'}
    </button>
    {onOtherClick && <button type="button" className="ml-1.5 text-slate-500 hover:text-blue-600" title="View record details / history" onClick={onOtherClick}><History className="inline h-3.5 w-3.5" /></button>}
    {open && <ReferenceAuditModal reference={reference} onClose={() => setOpen(false)} initialRecord={initialRecord} moduleLabel={moduleLabel} loadAudit={loadAudit} />}
  </>
}
