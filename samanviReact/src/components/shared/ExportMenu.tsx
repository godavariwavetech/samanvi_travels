import { useEffect, useRef, useState } from 'react'
import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'
import type { ExportFormat } from '@/lib/tableExport'

/** The one Export button a page shows: opens Excel / PDF. */
export function ExportMenu({ onExport, disabled, className }: {
  onExport: (format: ExportFormat) => void | Promise<void>
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const run = async (format: ExportFormat) => {
    setOpen(false)
    setBusy(true)
    try { await onExport(format) } finally { setBusy(false) }
  }

  return (
    <div ref={ref} className={cn('relative flex-shrink-0', className)}>
      <Button type="button" variant="outline" size="sm" className="h-9 sm:h-10 bg-white" disabled={disabled || busy} onClick={() => setOpen((o) => !o)}>
        <Download className="w-4 h-4" /> <span className="hidden sm:inline">{busy ? 'Exporting…' : 'Export'}</span>
      </Button>
      {open && (
        <div className="absolute right-0 mt-1 z-30 w-40 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          <button type="button" onClick={() => run('excel')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-emerald-50">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
          </button>
          <button type="button" onClick={() => run('pdf')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-red-50">
            <FileText className="w-4 h-4 text-red-500" /> PDF
          </button>
        </div>
      )}
    </div>
  )
}
