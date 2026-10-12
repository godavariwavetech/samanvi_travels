import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Search, Printer, Eye, Edit2, FileText, Trash2, AlertCircle, History } from 'lucide-react'
import { GlassCard } from './GlassCard'
import { Button } from './Button'
import { Input } from './Input'
import { ColumnFilterDropdown } from './ColumnFilterDropdown'
import { ExportMenu } from './ExportMenu'
import { cn } from '@/lib/utils'
import { exportRows, loadCellRenderer, nodeText, type ExportFormat } from '@/lib/tableExport'

export interface Column<T = Record<string, unknown>> {
  label: string
  key: string
  filterable?: boolean
  filterType?: 'text' | 'select' | 'date'
  filterOptions?: { label: string; value: string }[]
  align?: 'left' | 'center' | 'right'
  render?: (value: any, row: T, index: number) => ReactNode
}

const alignText: Record<'left' | 'center' | 'right', string> = { left: 'text-left', center: 'text-center', right: 'text-right' }
const alignJustify: Record<'left' | 'center' | 'right', string> = { left: 'justify-start', center: 'justify-center', right: 'justify-end' }

type ActionType = 'view' | 'edit' | 'pdf' | 'print' | 'delete' | 'history'

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
  /** What identifies a row across renders for selection. Defaults to id, then
   *  c_number, then the row's own contents. */
  rowKey?: (row: T) => string
  selectionActions?: ReactNode
  columnFilters?: Record<string, string[]>
  onColumnFilterChange?: (key: string, vals: string[]) => void
  /** The rows left after the search box and column filters, whenever that set
   *  changes - so a page's Excel / PDF download can carry exactly what the
   *  table shows. */
  onFilteredChange?: (rows: T[]) => void
  filterBar?: ReactNode
  className?: string
  /** Opt-in: paginate `filtered` rows and show page controls above and below the table. */
  paginated?: boolean
  /** Rows per page when `paginated` is set. Default 25. */
  pageSize?: number
  /** Opt-in: mirror a slim scrollbar above the table, synced with the table's own horizontal scroll — lets wide tables be scrolled without hunting for the scrollbar below a long list of rows. */
  topScrollbar?: boolean
  /** Export button (Excel / PDF of the rows left after search and filters). On by default. */
  exportable?: boolean
  /** File / PDF heading for the export. Defaults to the title. */
  exportTitle?: string
  /** A page whose export has its own layout (an import-ready sheet, a report
   *  with totals) plugs it into this button per format, so the page never
   *  shows two Export buttons. A format left out uses the built-in export. */
  onExport?: Partial<Record<ExportFormat, (rows: T[]) => void | Promise<void>>>
}

function buildPageList(current: number, total: number): (number | '…')[] {
  const delta = 1
  const pages: number[] = []
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) pages.push(i)
  }
  const withDots: (number | '…')[] = []
  let prev = 0
  for (const p of pages) {
    if (prev && p - prev > 1) withDots.push('…')
    withDots.push(p)
    prev = p
  }
  return withDots
}

function PaginationBar({ page, totalPages, pageSize, total, onChange }: {
  page: number
  totalPages: number
  pageSize: number
  total: number
  onChange: (page: number) => void
}) {
  if (totalPages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3">
      <span className="text-xs text-slate-500 font-medium whitespace-nowrap">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1 flex-wrap">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
        >
          Prev
        </button>
        {buildPageList(page, totalPages).map((p, i) =>
          p === '…' ? (
            <span key={`dots-${i}`} className="px-1.5 text-xs text-slate-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              className={cn(
                'min-w-[2rem] px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors',
                p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
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
  rowKey,
  selectionActions,
  columnFilters,
  onColumnFilterChange,
  onFilteredChange,
  filterBar,
  className,
  paginated = false,
  pageSize = 25,
  // On by default: every list gets a scrollbar above its header, so a wide
  // table can be swiped from the top instead of hunting for the bar under it.
  topScrollbar = true,
  exportable = true,
  exportTitle,
  onExport,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<T | null>(null)
  // Selection is held by row key, not position: rows that leave the list
  // (vouchers just approved, say) drop out of the selection instead of handing
  // their tick to whichever rows slide into their places, and a search or
  // filter that reorders the list leaves the ticked rows ticked. A key rather
  // than the object itself because owners routinely rebuild their row objects
  // on every render (mapping a query result), which would otherwise untick a
  // row the moment it was ticked.
  const keyOf = (row: T): string => {
    if (rowKey) return rowKey(row)
    const r = row as any
    if (r.id != null && r.id !== '') return 'id:' + String(r.id)
    if (r.c_number != null && r.c_number !== '') return 'cn:' + String(r.c_number)
    return 'row:' + JSON.stringify(r)
  }
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)

  const scrollTopRef = useRef<HTMLDivElement>(null)
  const scrollBodyRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)
  const syncingScroll = useRef(false)

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

  // Reset to page 1 whenever the search text or column filters change, so the
  // user never lands on a now-empty page after narrowing the result set.
  useEffect(() => { setPage(1) }, [search, columnFilters])

  // Report the visible set to the page, but only when it actually changed:
  // `data` is often rebuilt on every render, so comparing the rows' keys keeps
  // a page that stores these rows in state from re-rendering forever.
  const filteredSigRef = useRef('')
  useEffect(() => {
    if (!onFilteredChange) return
    const sig = filtered.map(keyOf).join('\u0001')
    if (sig === filteredSigRef.current) return
    filteredSigRef.current = sig
    onFilteredChange(filtered)
  })

  const totalPages = paginated ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1
  const safePage = Math.min(page, totalPages)
  const pageRows = paginated ? filtered.slice((safePage - 1) * pageSize, safePage * pageSize) : filtered

  useEffect(() => {
    if (!topScrollbar) return
    const body = scrollBodyRef.current
    if (!body) return
    const update = () => setContentWidth(body.scrollWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(body)
    window.addEventListener('resize', update)
    return () => { ro.disconnect(); window.removeEventListener('resize', update) }
  }, [topScrollbar, columns, pageRows])

  const handleTopScroll = () => {
    if (syncingScroll.current) { syncingScroll.current = false; return }
    if (!scrollTopRef.current || !scrollBodyRef.current) return
    syncingScroll.current = true
    scrollBodyRef.current.scrollLeft = scrollTopRef.current.scrollLeft
  }
  const handleBodyScroll = () => {
    if (syncingScroll.current) { syncingScroll.current = false; return }
    if (!scrollTopRef.current || !scrollBodyRef.current) return
    syncingScroll.current = true
    scrollTopRef.current.scrollLeft = scrollBodyRef.current.scrollLeft
  }

  const selectedRows = (keys: Set<string>) => data.filter((r) => keys.has(keyOf(r)))

  // Rows no longer in the data (refetched after an action) leave the selection,
  // and the owner hears about it so its own copy agrees with the checkboxes.
  useEffect(() => {
    if (!selected.size) return
    const present = new Set(data.map(keyOf))
    const kept = [...selected].filter((k) => present.has(k))
    if (kept.length === selected.size) return
    const next = new Set(kept)
    setSelected(next)
    onSelectionChange?.(selectedRows(next))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(keyOf(r)))
  const someSelected = selected.size > 0

  const toggleAll = () => {
    const next = allSelected ? new Set<string>() : new Set<string>(filtered.map(keyOf))
    setSelected(next)
    onSelectionChange?.(allSelected ? [] : [...filtered])
  }

  const toggleRow = (row: T) => {
    const k = keyOf(row)
    const next = new Set(selected)
    next.has(k) ? next.delete(k) : next.add(k)
    setSelected(next)
    onSelectionChange?.(filtered.filter((r) => next.has(keyOf(r))))
  }

  const selectedSum = sumKey
    ? selectedRows(selected).reduce((acc, r) => {
        const val = Number((r as any)?.[sumKey] ?? 0)
        return acc + (isNaN(val) ? 0 : val)
      }, 0)
    : 0

  const handleAction = (action: ActionType, row: T) => {
    if (action === 'delete') { setConfirmDelete(row); return }
    onAction?.(action, row)
  }

  // Every row the search and filters leave (all pages, not just the one shown),
  // each cell as the text it renders on screen.
  const handleExport = async (format: ExportFormat) => {
    const custom = onExport?.[format]
    if (custom) return custom(filtered)
    const render = await loadCellRenderer()
    const cols = columns.filter((c) => c.label.trim())
    const rows = filtered.map((row, i) => cols.map((col) => {
      const raw = (row as any)[col.key]
      if (col.render) return nodeText(render, col.render(raw, row, i), raw)
      return raw == null || typeof raw === 'object' ? '' : typeof raw === 'number' ? raw : String(raw)
    }))
    exportRows({ title: exportTitle || title, headers: cols.map((c) => c.label), rows, format })
  }

  const actionButtons = [
    { type: 'view' as const, icon: Eye, cls: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100' },
    { type: 'edit' as const, icon: Edit2, cls: 'text-amber-600 bg-amber-50 hover:bg-amber-100 border-amber-100' },
    { type: 'history' as const, icon: History, cls: 'text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200' },
    { type: 'pdf' as const, icon: FileText, cls: 'text-purple-600 bg-purple-50 hover:bg-purple-100 border-purple-100' },
    { type: 'print' as const, icon: Printer, cls: 'text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200' },
    { type: 'delete' as const, icon: Trash2, cls: 'text-red-600 bg-red-50 hover:bg-red-100 border-red-100' },
  ].filter((b) => actions.includes(b.type))

  return (
    <GlassCard className={cn('flex flex-col overflow-hidden mt-6', className)}>

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

          {exportable && <ExportMenu onExport={handleExport} disabled={loading || filtered.length === 0} />}
        </div>
      </div>
      {filterBar && (
        <div className="px-4 sm:px-5 pb-3 pt-2 flex flex-wrap items-center gap-2 border-t border-slate-100/80">
          {filterBar}
        </div>
      )}
      </div>

      {paginated && (
        <div className="border-b border-slate-100">
          <PaginationBar page={safePage} totalPages={totalPages} pageSize={pageSize} total={filtered.length} onChange={setPage} />
        </div>
      )}

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

      {topScrollbar && (
        <div ref={scrollTopRef} onScroll={handleTopScroll} className="overflow-x-auto scrollbar-thin border-b border-slate-100 h-3">
          <div style={{ width: contentWidth, height: 1 }} />
        </div>
      )}

      {/* Table — bounded height + overflow-auto (not just overflow-x) is required for the
          sticky header below to actually work: overflow-x-auto alone still makes the browser
          compute overflow-y as auto too (CSS spec quirk), which silently redirects the sticky
          thead's positioning context to this div — but since an unbounded div always grows to
          fit its content, it never actually scrolls, so the header just scrolled away with the
          page instead of sticking. Giving it a real height + overflow-y makes the scrolling
          (and the sticky header) happen inside the table itself. */}
      <div ref={scrollBodyRef} onScroll={topScrollbar ? handleBodyScroll : undefined} className="overflow-auto scrollbar-thin max-h-[70vh]">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-blue-600 text-white [&>th:first-child]:rounded-tl-xl [&>th:last-child]:rounded-tr-xl">
              {selectable && (
                <th className="sticky top-0 z-10 bg-blue-600 pl-5 pr-2 py-4 w-10">
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
                  className={`sticky top-0 z-10 bg-blue-600 p-4 text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap ${alignText[col.align ?? 'left']} ${!selectable && i === 0 ? 'pl-6' : ''}`}
                >
                  <div className={`flex items-center gap-1.5 ${alignJustify[col.align ?? 'left']}`}>
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
                <th className="sticky top-0 z-10 bg-blue-600 p-4 text-right pr-6 text-xs font-bold text-white uppercase tracking-wider whitespace-nowrap w-[220px]">
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
              pageRows.map((row, localIndex) => {
                const i = paginated ? (safePage - 1) * pageSize + localIndex : localIndex
                return (
                <tr
                  key={i}
                  className={`hover:bg-blue-50/30 transition-colors ${selected.has(keyOf(row)) ? 'bg-blue-50/50' : ''}`}
                >
                  {selectable && (
                    <td className="pl-5 pr-2 py-4 align-middle">
                      <input
                        type="checkbox"
                        checked={selected.has(keyOf(row))}
                        onChange={() => toggleRow(row)}
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      />
                    </td>
                  )}
                  {columns.map((col, j) => (
                    <td
                      key={j}
                      className={`p-4 align-middle ${alignText[col.align ?? 'left']} ${j === 0 && !selectable ? 'pl-6 font-semibold text-slate-900' : 'text-slate-600 text-sm'}`}
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
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {paginated && (
        <div className="border-t border-slate-100">
          <PaginationBar page={safePage} totalPages={totalPages} pageSize={pageSize} total={filtered.length} onChange={setPage} />
        </div>
      )}

      {/* Delete confirm modal — portaled to <body> so it isn't clipped/repositioned by
          this card's backdrop-blur (which creates a containing block for `fixed` children) */}
      {createPortal(
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
        </AnimatePresence>,
        document.body
      )}
    </GlassCard>
  )
}
