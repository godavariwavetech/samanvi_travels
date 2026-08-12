import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { FileSpreadsheet, X, AlertTriangle } from 'lucide-react'
import { Button } from './Button'
import { Badge } from './Badge'

export interface ExcelPreviewRow {
  /** Values rendered in the preview table, aligned with `headers`. */
  values: (string | number)[]
  /** True if this row's key already exists in the current data set. */
  isDuplicate: boolean
}

interface ExcelImportPreviewModalProps {
  open: boolean
  title: string
  headers: string[]
  rows: ExcelPreviewRow[]
  submitting?: boolean
  onCancel: () => void
  onConfirm: (selectedIndexes: number[]) => void
  /** What ticking a duplicate row actually does on submit — differs by importer (some skip, some replace). */
  duplicateHint?: string
  /** Whether duplicate rows start ticked (for importers where including a duplicate safely
   * replaces the existing record) or unticked (for importers where it would just be skipped
   * anyway, so opt-in avoids an unnecessary manual step for the common no-duplicate case). */
  duplicatesSelectedByDefault?: boolean
}

export function ExcelImportPreviewModal({
  open, title, headers, rows, submitting, onCancel, onConfirm,
  duplicateHint = 'Duplicates are unchecked by default — tick to insert anyway.',
  duplicatesSelectedByDefault = false,
}: ExcelImportPreviewModalProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set())

  useEffect(() => {
    setSelected(new Set(rows.map((_, i) => i).filter((i) => duplicatesSelectedByDefault || !rows[i].isDuplicate)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows])

  const duplicateCount = useMemo(() => rows.filter((r) => r.isDuplicate).length, [rows])
  const allSelected = rows.length > 0 && selected.size === rows.length

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((_, i) => i)))
  const toggleRow = (i: number) => setSelected((prev) => {
    const next = new Set(prev)
    if (next.has(i)) next.delete(i); else next.add(i)
    return next
  })

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.96 }} animate={{ scale: 1 }} exit={{ scale: 0.96 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> {title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {rows.length} row{rows.length !== 1 ? 's' : ''} parsed
                  {duplicateCount > 0 && <> · {duplicateCount} flagged as duplicate</>}
                  {' · '}{selected.size} selected to insert
                </p>
              </div>
              <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-100 shrink-0 flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded accent-blue-600" checked={allSelected} onChange={toggleAll} />
                Select all
              </label>
              {duplicateCount > 0 && (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="w-3.5 h-3.5" /> {duplicateHint}
                </span>
              )}
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr>
                    <th className="px-4 py-2 w-10" />
                    {headers.map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, i) => (
                    <tr key={i} className={row.isDuplicate ? 'bg-amber-50/50' : undefined}>
                      <td className="px-4 py-2">
                        <input type="checkbox" className="w-4 h-4 rounded accent-blue-600" checked={selected.has(i)} onChange={() => toggleRow(i)} />
                      </td>
                      {row.values.map((v, j) => (
                        <td key={j} className="px-4 py-2 text-slate-700 whitespace-nowrap max-w-[220px] truncate">
                          {j === 0 && row.isDuplicate
                            ? <span className="inline-flex items-center gap-1.5">{String(v ?? '—')}<Badge variant="warning">Duplicate</Badge></span>
                            : String(v ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
              <Button onClick={() => onConfirm(Array.from(selected).sort((a, b) => a - b))} disabled={submitting || selected.size === 0}>
                {submitting ? 'Inserting…' : `Insert ${selected.size} record${selected.size !== 1 ? 's' : ''}`}
              </Button>
              <Button variant="ghost" onClick={onCancel} disabled={submitting}>Cancel</Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
