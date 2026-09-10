import type { ReactNode } from 'react'

// Reusable "totals bar" that sits directly under a DataTable. DataTable
// doesn't render a footer row, so report pages use this to mimic the
// Angular Mat Table footer that the old app relied on.
export interface TotalsFooterItem {
  label: string
  value: ReactNode
  emphasis?: 'default' | 'positive' | 'negative' | 'muted'
}

interface Props {
  items: TotalsFooterItem[]
  title?: string
}

const emphasisClass = {
  default: 'text-slate-900',
  positive: 'text-emerald-700',
  negative: 'text-red-700',
  muted: 'text-slate-500',
}

export function TotalsFooter({ items, title = 'Total' }: Props) {
  if (items.length === 0) return null
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 -mt-4">
      <div className="flex items-center flex-wrap gap-x-8 gap-y-2">
        <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{title}</span>
        {items.map((it) => (
          <span key={it.label} className="text-sm">
            <span className="text-slate-500">{it.label}:</span>{' '}
            <b className={emphasisClass[it.emphasis ?? 'default']}>{it.value}</b>
          </span>
        ))}
      </div>
    </div>
  )
}
