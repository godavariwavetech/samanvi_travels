import { cn } from '@/lib/utils'
import { SearchableSelect } from './SearchableSelect'

// Job priorities and their colours, used everywhere a priority is picked,
// shown or filtered on, so High always reads red, Medium amber, Low green.
export const PRIORITIES = ['High', 'Medium', 'Low'] as const

const TONES: Record<string, { badge: string; dot: string; field: string }> = {
  High:   { badge: 'bg-red-100 text-red-700 border-red-200',             dot: 'bg-red-500',     field: 'border-red-300 bg-red-50 text-red-700 font-semibold' },
  Medium: { badge: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   field: 'border-amber-300 bg-amber-50 text-amber-700 font-semibold' },
  Low:    { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', field: 'border-emerald-300 bg-emerald-50 text-emerald-700 font-semibold' },
}
const NONE = { badge: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-300', field: '' }

/** Normalises 'high' / ' HIGH ' to 'High'; '' when not a known priority. */
export const normPriority = (p: unknown) => {
  const s = String(p ?? '').trim().toLowerCase()
  return PRIORITIES.find(x => x.toLowerCase() === s) ?? ''
}
export const priorityTone = (p: unknown) => TONES[normPriority(p)] ?? NONE

/** Coloured pill for a priority (tables, reports, view screens). */
export function PriorityBadge({ value, className }: { value: unknown; className?: string }) {
  const p = normPriority(value)
  if (!p) return <span className="text-slate-300">—</span>
  const t = priorityTone(p)
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-bold whitespace-nowrap', t.badge, className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', t.dot)} />
      {p}
    </span>
  )
}

/** Filter-list option: a coloured dot before the value. */
export function PriorityOption({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', priorityTone(value).dot)} />
      {value}
    </span>
  )
}

/** Priority picker for job forms: coloured field and coloured dots in the list. */
export function PrioritySelect({ value, onChange, disabled, className, allowEmpty, placeholder = 'Priority' }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; className?: string; allowEmpty?: boolean; placeholder?: string
}) {
  return (
    <SearchableSelect
      className={className}
      buttonClassName={priorityTone(value).field}
      value={normPriority(value) || (allowEmpty ? '' : value)}
      onChange={onChange}
      onClear={allowEmpty ? () => onChange('') : undefined}
      disabled={disabled}
      placeholder={placeholder}
      options={PRIORITIES.map(p => ({ value: p, label: p, dot: TONES[p].dot }))}
    />
  )
}

// PDF exports (jspdf-autotable): fill a Priority cell in its colour.
const PDF_RGB: Record<string, [number, number, number]> = { High: [254, 226, 226], Medium: [254, 243, 199], Low: [209, 250, 229] }
const PDF_TEXT: Record<string, [number, number, number]> = { High: [185, 28, 28], Medium: [180, 83, 9], Low: [4, 120, 87] }
/** autoTable didParseCell hook colouring the column at `colIndex` by priority. */
export const priorityPdfCell = (colIndex: number) => (d: any) => {
  if (d.section !== 'body' || d.column.index !== colIndex) return
  const p = normPriority(d.cell.raw)
  if (!p) return
  d.cell.styles.fillColor = PDF_RGB[p]
  d.cell.styles.textColor = PDF_TEXT[p]
  d.cell.styles.fontStyle = 'bold'
}
