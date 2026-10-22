import type { TotalsFooterItem } from '@/components/shared'
import { formatAmount } from '@/lib/utils'

const num = (v: unknown) => Number(v) || 0
const fmtQty = (n: number) => n.toLocaleString('en-IN', { maximumFractionDigits: 2 })

// Totals over a set of fuel rows, shared by Fuel Entry and Fuel Approved
// Reports so both work the figures out the same way. Both averages are
// weighted by litres: average bill = total bill / total quantity (rupees per
// litre) and average KMPL = total km / total quantity, not the mean of each
// row's own average.
export function fuelTotalItems(rows: Record<string, unknown>[]): TotalsFooterItem[] {
  const qty = rows.reduce((s, r) => s + num(r.quantity_filled), 0)
  const bill = rows.reduce((s, r) => s + num(r.total_bill), 0)
  const km = rows.reduce((s, r) => s + num(r.kilometers), 0)
  return [
    { label: 'Entries', value: rows.length },
    { label: 'Total Liters (Qty)', value: `${fmtQty(qty)} L` },
    { label: 'Total Amount', value: `₹${formatAmount(bill)}` },
    { label: 'Total KM', value: fmtQty(km) },
    { label: 'Average Bill (₹/L)', value: `₹${formatAmount(qty > 0 ? bill / qty : 0)}` },
    { label: 'Average KMPL', value: (qty > 0 ? km / qty : 0).toFixed(2) },
  ]
}

// The totals as cards, shown above the table (the bar below uses TotalsFooter).
export function FuelTotalsCards({ items }: { items: TotalsFooterItem[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{it.label}</div>
          <div className="text-lg font-bold text-slate-900 mt-0.5">{it.value}</div>
        </div>
      ))}
    </div>
  )
}
