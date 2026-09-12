import { formatAmount } from '@/lib/utils'

// The "Show columns" checkbox strip Voucher Approvals uses, for the ledger
// reports: a set of optional columns the reader ticks on and off, so the
// table only widens for the detail they want at the time.
export function ReportColumnPicker({ options, visible, onToggle, label = 'Show columns:' }: {
  options: readonly string[]
  visible: Set<string>
  onToggle: (col: string) => void
  label?: string
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap px-1">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{label}</span>
      {options.map((col) => (
        <label key={col} className="inline-flex items-center gap-1.5 cursor-pointer select-none">
          <input type="checkbox" className="w-3.5 h-3.5 accent-blue-600" checked={visible.has(col)} onChange={() => onToggle(col)} />
          <span className={`text-xs font-semibold ${visible.has(col) ? 'text-slate-700' : 'text-slate-400'}`}>{col}</span>
        </label>
      ))}
    </div>
  )
}

// The extra detail a ledger line can carry beyond the voucher itself: the
// trip it was filed for, and for a fuel fill or a laundry bill the quantity
// and rate behind the amount. Ledger Wise and Day Book offer these three as
// optional columns.
export const REPORT_EXTRA_COLS = ['Trip Date', 'Quantity', 'Rate'] as const

export const toggleInSet = (set: Set<string>, col: string) => {
  const next = new Set(set)
  if (next.has(col)) next.delete(col); else next.add(col)
  return next
}

// "10.00 L" for a fuel fill, "24 pcs" for a laundry bill, blank otherwise.
export function reportQuantity(row: { quantity?: unknown; quantity_unit?: unknown }): string {
  const q = Number(row.quantity)
  if (!row.quantity || !Number.isFinite(q) || q === 0) return ''
  const unit = String(row.quantity_unit ?? '')
  const text = unit === 'pcs' ? String(Math.round(q)) : q.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return unit ? `${text} ${unit}` : text
}

// "₹95.50" per litre for a fuel fill; blank where no single rate applies.
export function reportRate(row: { rate?: unknown }): string {
  const r = Number(row.rate)
  if (!row.rate || !Number.isFinite(r) || r === 0) return ''
  return `₹${formatAmount(r)}`
}
