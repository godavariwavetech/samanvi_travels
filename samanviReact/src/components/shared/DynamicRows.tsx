import type { ReactNode } from 'react'
import { PlusCircle, MinusCircle } from 'lucide-react'
import { Button } from './Button'

type ColumnDef = string | { label: string; className?: string }

interface DynamicRowsProps<T> {
  columns: ColumnDef[]
  rows: T[]
  onAdd: () => void
  onRemove: (index: number) => void
  renderRow: (row: T, index: number) => ReactNode
  title?: string
  hideAdd?: boolean
  hideRemove?: boolean
}

export function DynamicRows<T>({ columns, rows, onAdd, onRemove, renderRow, title = 'Line Items', hideAdd = false, hideRemove = false }: DynamicRowsProps<T>) {
  return (
    <div className="space-y-3">
      <div className={`flex items-center mb-2 ${title ? 'justify-between' : 'justify-end'}`}>
        {title && <h4 className="text-sm font-bold text-slate-700">{title}</h4>}
        {!hideAdd && (
          <Button variant="outline" size="sm" onClick={onAdd}>
            <PlusCircle className="w-3.5 h-3.5" /> Add Row
          </Button>
        )}
      </div>
      <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-1">
        <div className="flex gap-2 p-3 border-b border-slate-200/60 pb-2">
          {columns.map((c, i) => {
            const label = typeof c === 'string' ? c : c.label
            const cls = typeof c === 'string' ? 'flex-1' : (c.className ?? 'flex-1')
            return (
              <div key={i} className={`${cls} min-w-0 text-xs font-bold text-slate-500 uppercase`}>
                {label}
              </div>
            )
          })}
          <div className="w-8 shrink-0" />
        </div>
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 p-2 items-center">
            {renderRow(row, i)}
            {!hideRemove && (
              <button
                onClick={() => onRemove(i)}
                className="w-8 text-slate-400 hover:text-red-500 p-2 transition-colors"
              >
                <MinusCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {rows.length === 0 && (
          <div className="p-4 text-center text-sm text-slate-400">No rows. Click Add Row.</div>
        )}
      </div>
    </div>
  )
}
