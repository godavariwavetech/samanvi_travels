import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Search, Filter, Download, Printer, Eye, Edit2, FileText, Trash2, AlertCircle, X } from 'lucide-react'
import { GlassCard } from './GlassCard'
import { Button } from './Button'
import { Input } from './Input'

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
  columnFilters?: Record<string, string>
  onColumnFilterChange?: (key: string, val: string) => void
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
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<T | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())

  const filterableCols = columns.filter(c => c.filterable)
  const activeFilterCount = columnFilters
    ? Object.values(columnFilters).filter(v => v.trim()).length
    : 0

  const clearAllFilters = () => {
    filterableCols.forEach(col => onColumnFilterChange?.(col.key, ''))
  }

  const filtered = data
    .filter((row) =>
      Object.values(row).some((v) =>
        String(v ?? '').toLowerCase().includes(search.toLowerCase())
      )
    )
    .filter((row) => {
      if (!columnFilters) return true
      return Object.entries(columnFilters).every(([key, val]) => {
        if (!val) return true
        const v = (row as any)[key]
        const str = Array.isArray(v) ? v.join(' ') : String(v ?? '')
        return str.toLowerCase().includes(val.toLowerCase())
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
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-white/40 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
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

          {filterableCols.length > 0 && (
            <button
              onClick={() => setFilterOpen(o => !o)}
              className={`relative inline-flex items-center gap-1.5 h-9 sm:h-10 px-3 rounded-xl border text-sm font-medium transition-all flex-shrink-0
                ${filterOpen || activeFilterCount > 0
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
              {activeFilterCount > 0 && (
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full leading-none
                  ${filterOpen ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}

          <Button variant="outline" size="sm" className="h-9 sm:h-10 bg-white flex-shrink-0">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Expandable filter panel */}
      <AnimatePresence>
        {filterOpen && filterableCols.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden border-b border-blue-100 bg-blue-50/40"
          >
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filterableCols.map(col => {
                  const val = columnFilters?.[col.key] ?? ''
                  const type = col.filterType ?? 'text'
                  return (
                    <div key={col.key} className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        {col.label}
                      </label>

                      {type === 'select' ? (
                        <select
                          value={val}
                          onChange={e => onColumnFilterChange?.(col.key, e.target.value)}
                          className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-300 transition-colors appearance-none cursor-pointer text-slate-700"
                        >
                          <option value="">All</option>
                          {col.filterOptions?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>

                      ) : type === 'date' ? (
                        <div className="relative">
                          <input
                            type="date"
                            value={val}
                            onChange={e => onColumnFilterChange?.(col.key, e.target.value)}
                            onClick={e => (e.target as HTMLInputElement).showPicker?.()}
                            className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 pr-7 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-300 transition-colors cursor-pointer"
                          />
                          {val && (
                            <button
                              onClick={() => onColumnFilterChange?.(col.key, '')}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                      ) : (
                        <div className="relative">
                          <input
                            type="text"
                            value={val}
                            onChange={e => onColumnFilterChange?.(col.key, e.target.value)}
                            placeholder={`Search…`}
                            className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2.5 pr-7 text-xs shadow-sm placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400/40 focus:border-blue-300 transition-colors"
                          />
                          {val && (
                            <button
                              onClick={() => onColumnFilterChange?.(col.key, '')}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {activeFilterCount > 0 && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-blue-100">
                  <span className="text-xs text-blue-600 font-semibold">
                    {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
                    {' · '}{filtered.length} result{filtered.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-slate-500 hover:text-red-500 font-medium underline underline-offset-2 transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <tr className="border-b border-slate-200 bg-slate-50/50">
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
                  className={`p-4 text-xs font-bold text-slate-500 uppercase tracking-wider ${!selectable && i === 0 ? 'pl-6' : ''}`}
                >
                  <div className="flex items-center gap-1.5">
                    {col.label}
                    {col.filterable && columnFilters?.[col.key] && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    )}
                  </div>
                </th>
              ))}
              {actionButtons.length > 0 && (
                <th className="p-4 text-right pr-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-[220px]">
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
