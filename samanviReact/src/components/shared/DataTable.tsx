import { useMemo, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Search, Download, Printer, Eye, Edit2, FileText, Trash2, AlertCircle } from 'lucide-react'
import { GlassCard } from './GlassCard'
import { Button } from './Button'
import { Input } from './Input'
import { ColumnFilterDropdown } from './ColumnFilterDropdown'

export interface Column<T = Record<string, unknown>> {
  label: string
  key: string
  filterable?: boolean
  filterType?: 'text' | 'select' | 'date'
  filterOptions?: { label: string; value: string }[]
  render?: (value: any, row: T, index: number) => ReactNode
}

type ActionType = 'view' | 'edit' | 'pdf' | 'print' | 'delete'

interface DataTableProps<T extends Record<string, unknown>> {
  title?: string
  columns: Column<T>[]
  data: T[]
  onAction?: (action: ActionType, row: T) => void
  loading?: boolean
  actions?: ActionType[]
  icon?: ReactNode
  selectable?: boolean
  sumKey?: string
  onSelectionChange?: (rows: T[]) => void
  selectionActions?: ReactNode
  columnFilters?: Record<string, string[]>
  onColumnFilterChange?: (key: string, vals: string[]) => void
  filterBar?: ReactNode
}

export function DataTable<T extends Record<string, unknown>>({
  title = 'Records',
  columns,
  data,
  onAction,
  loading = false,
  actions = ['view', 'edit', 'delete'],
  icon,
  selectable = false,
  sumKey,
  onSelectionChange,
  selectionActions,
  columnFilters,
  onColumnFilterChange,
  filterBar,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<T | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const filterableCols = columns.filter(c => c.filterable)
  const activeFilterCount = columnFilters
    ? Object.values(columnFilters).filter(v => v && v.length > 0).length
    : 0

  const clearAllFilters = () => {
    filterableCols.forEach(col => onColumnFilterChange?.(col.key, []))
  }

  const colOptions = useMemo(() => {
    const result: Record<string, string[]> = {}
    filterableCols.forEach(col => {
      if (col.filterOptions) {
        result[col.key] = col.filterOptions.map(o => o.label)
        return
      }
      const set = new Set<string>()
      data.forEach(row => {
        const v = (row as any)[col.key]
        if (Array.isArray(v)) v.forEach(item => { if (item != null && item !== '') set.add(String(item)) })
        else if (v != null && v !== '') set.add(String(v))
      })
      result[col.key] = Array.from(set).sort()
    })
    return result
  }, [filterableCols, data])

  const filtered = data
    .filter((row) =>
      Object.values(row).some((v) =>
        String(v ?? '').toLowerCase().includes(search.toLowerCase())
      )
    )
    .filter((row) => {
      if (!columnFilters) return true
      return Object.entries(columnFilters).every(([key, vals]) => {
        if (!vals || vals.length === 0) return true
        const v = (row as any)[key]
        if (Array.isArray(v)) return v.some((item: any) => vals.includes(String(item)))
        return vals.includes(String(v ?? ''))
      })
    })

  const allSelected = filtered.length > 0 && filtered.every((_, i) => selected.has(i))
  const someSelected = selected.size > 0

  const toggleAll = () => {
    const next = allSelected ? new Set<number>() : new Set(filtered.map((_, i) => i))
    setSelected(next)
    onSelectionChange?.(allSelected ? [] : [...filtered])
  }

  const toggleRow = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      onSelectionChange?.(filtered.filter((_, idx) => next.has(idx)))
      return next
    })
  }

  const selectedSum = sumKey
    ? Array.from(selected).reduce((acc, i) => {
        const val = Number((filtered[i] as any)?.[sumKey] ?? 0)
        return acc + (isNaN(val) ? 0 : val)
      }, 0)
    : 0

  const handleAction = (action: ActionType, row: T) => {
    if (action === 'delete') { setConfirmDelete(row); return }
    onAction?.(action, row)
  }

  const actionButtons = [
    { type: 'view' as const, icon: Eye, cls: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100' },
    { type: 'edit' as const, icon: Edit2, cls: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100' },
    { type: 'pdf' as const, icon: FileText, cls: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-100' },
    { type: 'print' as const, icon: Printer, cls: 'text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200' },
    { type: 'delete' as const, icon: Trash2, cls: 'text-red-600 bg-red-50 hover:bg-red-100 border-red-100' },
  ].filter((b) => actions.includes(b.type))

  return (
    <GlassCard className="flex flex-col overflow-hidden mt-6">

      {/* Header */}
      <div className="border-b border-slate-100 bg-white/40">
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <h3 className="font-bold text-slate-900 text-base sm:text-lg truncate">{title}</h3>
          <p className="text-xs text-slate-500 font-medium whitespace-nowrap">
            {`${filtered.length} record${filtered.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9 h-9 sm:h-10 w-full sm:w-48 lg:w-56 bg-white"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-3 rounded-xl border text-sm font-medium transition-all flex-shrink-0 bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200"
            >
              <span className="text-[11px] font-bold bg-white text-blue-600 px-1.5 py-0.5 rounded-full leading-none">
                {activeFilterCount}
              </span>
              <span className="hidden sm:inline">Clear filters</span>
            </button>
          )}

          <Button variant="outline" size="sm" className="h-9 sm:h-10 bg-white flex-shrink-0">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>
      {filterBar && (
        <div className="px-4 sm:px-5 pb-3 pt-2 flex flex-wrap items-center gap-2 border-t border-slate-100/80">
          {filterBar}
        </div>
      )}
      </div>

      {/* Selection summary bar */}
      <AnimatePresence>
        {selectable && someSelected && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-4 flex-wrap px-5 py-3 bg-blue-50 border-b border-blue-100"
          >
            <span className="text-sm font-semibold text-blue-700 whitespace-nowrap">
              {selected.size} row{selected.size !== 1 ? 's' : ''} selected
            </span>
            {sumKey && (
              <span className="text-sm font-bold text-blue-900 whitespace-nowrap">
                Total: ₹{selectedSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            )}
            {selectionActions && (
              <div className="flex items-center gap-2 flex-wrap">
                {selectionActions}
              </div>
            )}
            <button
              onClick={() => { setSelected(new Set()); onSelectionChange?.([]) }}
              className="ml-auto text-xs text-blue-500 hover:text-blue-700 underline whitespace-nowrap"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-blue-600 text-white">
              {selectable && (
                <th className="pl-5 pr-2 py-4 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`p-4 text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap ${!selectable && i === 0 ? 'pl-6' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {col.filterable && (
                      <ColumnFilterDropdown
                        options={colOptions[col.key] ?? []}
                        selected={columnFilters?.[col.key] ?? []}
                        onChange={vals => onColumnFilterChange?.(col.key, vals)}
                        variant="light"
                      />
                    )}
                  </div>
                </th>
              ))}
              {actionButtons.length > 0 && (
                <th className="p-4 text-right pr-6 text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap w-[220px]">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white/30">
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {selectable && <td className="px-4 py-3"><div className="h-4 w-4 bg-slate-100 rounded animate-pulse" /></td>}
                  {columns.map((_, ci) => (
                    <td key={ci} className="px-5 py-3">
                      <div className="h-3.5 bg-slate-100 rounded-full animate-pulse" style={{ width: `${55 + ((i + ci) * 17) % 40}%` }} />
                    </td>
                  ))}
                  <td className="px-5 py-3"><div className="h-3.5 w-16 bg-slate-100 rounded-full animate-pulse" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 2 : 1)} className="p-10 text-center text-slate-400 font-medium">
                  {activeFilterCount > 0 ? (
                    <span>
                      No results match your filters.{' '}
                      <button onClick={clearAllFilters} className="text-blue-500 underline hover:text-blue-700">
                        Clear filters
                      </button>
                    </span>
                  ) : 'No records found.'}
                </td>
              </tr>
            ) : (
              filtered.map((row, i) => (
                <tr
                  key={i}
                  className={`hover:bg-blue-50/30 transition-colors ${selected.has(i) ? 'bg-blue-50/50' : ''}`}
                >
                  {selectable && (
                    <td className="pl-5 pr-2 py-4 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(i)}
                        onChange={() => toggleRow(i)}
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col, j) => (
                    <td
                      key={j}
                      className={`p-4 align-middle ${j === 0 && !selectable ? 'pl-6 font-semibold text-slate-900' : 'text-slate-600 text-sm'}`}
                    >
                      {col.render ? col.render(row[col.key], row, i) : String(row[col.key] ?? '')}
                    </td>
                  ))}
                  {actionButtons.length > 0 && (
                    <td className="p-4 align-middle text-right pr-6">
                      <div className="flex items-center justify-end gap-1.5">
                        {actionButtons.map(({ type, icon: Icon, cls }) => (
                          <button
                            key={type}
                            onClick={() => handleAction(type, row)}
                            className={`p-1.5 border rounded-lg transition-colors ${cls}`}
                            title={type.charAt(0).toUpperCase() + type.slice(1)}
                          >
                            <Icon className="w-4 h-4" />
                          </button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white p-6 rounded-3xl max-w-sm w-full shadow-2xl mx-4"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Delete Record?</h3>
              <p className="text-slate-500 text-sm mt-2 mb-6">
                This action cannot be undone. Are you sure?
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    onAction?.('delete', confirmDelete)
                    setConfirmDelete(null)
                  }}
                >
                  Yes, Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}
