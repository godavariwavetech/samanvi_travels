import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Search, X, FileSpreadsheet, Filter, ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { GlassCard, Button, Input, Label, PageHeader } from '@/components/shared'
import { accountingService } from '@/services/accounting.service'

function fmt(dateStr: any): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function fmtAmt(n: number): string {
  if (!n) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

export default function DayBookPage() {
  const today = new Date().toISOString().split('T')[0]
  const [range, setRange] = useState({ fromdate: today, todate: today })
  const [applied, setApplied] = useState(range)
  const [search, setSearch] = useState('')
  const [colFilters, setColFilters] = useState({
    c_number: '', vouchertype: '', date: '', amount_type: '',
    expensives: '', valueDate: '', bus_no: '', name: '', description: '',
  })
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['daybook', applied],
    queryFn: () => accountingService.getDayBook({ fromdate: applied.fromdate, todate: applied.todate }),
  })

  const raw = data?.data
  const allRows: any[] = useMemo(() => {
    if (!raw) return []
    return [
      ...(raw.expensiveDetails   ?? []),
      ...(raw.mainVoucherDetails ?? []),
      ...(raw.fuelEntryDetails   ?? []),
      ...(raw.laundryDetails     ?? []),
    ]
  }, [raw])

  // Build flat table rows with running balance
  const tableRows = useMemo(() => {
    let balance = 0
    return allRows
      .map((item, idx) => {
        const acct = item.account_type || item.amount_type || ''
        const amount = parseFloat(item.amount || '0')
        const debit  = acct === 'Debit Account'  ? amount : 0
        const credit = acct === 'Credit Account' ? amount : 0
        balance += debit - credit
        return {
          i:           idx + 1,
          c_number:    item.c_number    || '—',
          vouchertype: item.vouchertype || '—',
          i_ts:        item.i_ts        || item.trip_date || '',
          amount_type: acct,
          expensives:  item.expensives  || '—',
          valueDate:   item.valuedate   || item.valueDate || '',
          bus_no:      item.vehicleNo   || item.bus_no    || '—',
          name:        item.name        || '—',
          description: item.description || '—',
          debit,
          credit,
          balance,
        }
      })
  }, [allRows])

  // Client-side search filter
  const filteredRows = useMemo(() => {
    if (!search.trim()) return tableRows
    const q = search.trim().toLowerCase()
    return tableRows.filter(r =>
      [r.c_number, r.vouchertype, r.expensives, r.bus_no, r.name, r.description, r.amount_type]
        .some(v => String(v).toLowerCase().includes(q))
    )
  }, [tableRows, search])

  const voucherTypeOpts = useMemo(() =>
    ['', ...Array.from(new Set(tableRows.map(r => r.vouchertype).filter(v => v && v !== '—'))).sort()], [tableRows])
  const vehicleOpts = useMemo(() =>
    ['', ...Array.from(new Set(tableRows.map(r => r.bus_no).filter(v => v && v !== '—'))).sort()], [tableRows])
  const accountTypeOpts = ['', 'Debit Account', 'Credit Account']

  const displayRows = useMemo(() => {
    const cf = colFilters
    const hasFilter = Object.values(cf).some(v => v !== '')
    if (!hasFilter) return filteredRows
    return filteredRows.filter(row => {
      if (cf.c_number    && !String(row.c_number).toLowerCase().includes(cf.c_number.toLowerCase()))      return false
      if (cf.vouchertype && row.vouchertype !== cf.vouchertype)                                            return false
      if (cf.date        && !String(row.i_ts).startsWith(cf.date))                                         return false
      if (cf.amount_type && row.amount_type !== cf.amount_type)                                            return false
      if (cf.expensives  && !String(row.expensives).toLowerCase().includes(cf.expensives.toLowerCase()))  return false
      if (cf.valueDate   && !String(row.valueDate || '').startsWith(cf.valueDate))                         return false
      if (cf.bus_no      && row.bus_no !== cf.bus_no)                                                      return false
      if (cf.name        && !String(row.name).toLowerCase().includes(cf.name.toLowerCase()))               return false
      if (cf.description && !String(row.description).toLowerCase().includes(cf.description.toLowerCase())) return false
      return true
    })
  }, [filteredRows, colFilters])

  const activeFilterCount = Object.values(colFilters).filter(v => v !== '').length

  const totalDebit  = tableRows.reduce((s, r) => s + r.debit,  0)
  const totalCredit = tableRows.reduce((s, r) => s + r.credit, 0)
  const difference  = totalDebit - totalCredit

  const exportExcel = () => {
    const header = ['S.No', 'Ref No', 'Voucher Type', 'Date', 'Account Type', 'Ledger Name', 'Value Date', 'Vehicle No', 'Name', 'Description', 'Debit', 'Credit', 'Balance']
    const body = displayRows.map(r => [
      r.i, r.c_number, r.vouchertype, fmt(r.i_ts),
      r.amount_type === 'Debit Account' ? 'DR' : r.amount_type === 'Credit Account' ? 'CR' : r.amount_type,
      r.expensives, fmt(r.valueDate), r.bus_no, r.name, r.description,
      r.debit || '', r.credit || '',
      r.balance >= 0 ? `${r.balance.toFixed(2)} Dr` : `${Math.abs(r.balance).toFixed(2)} Cr`,
    ])
    body.push(['', '', '', '', '', '', '', '', '', 'Total', totalDebit || '', totalCredit || '', ''])
    body.push(['', '', '', '', '', '', '', '', '', 'Difference (Dr - Cr)',
      difference >= 0 ? difference : '',
      difference < 0 ? Math.abs(difference) : '',
      difference === 0 ? 'Balanced' : difference > 0 ? `${difference.toFixed(2)} Dr` : `${Math.abs(difference).toFixed(2)} Cr`,
    ])
    const ws = XLSX.utils.aoa_to_sheet([header, ...body])
    ws['!cols'] = header.map((_, ci) => ({ wch: Math.max(...[header, ...body].map(r => String(r[ci] ?? '').length)) + 2 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Day Book')
    XLSX.writeFile(wb, `DayBook_${applied.fromdate}_to_${applied.todate}_${Date.now()}.xlsx`)
  }

  const TH = ({ children, cls = '' }: { children: React.ReactNode; cls?: string }) => (
    <th className={`px-3 py-2.5 text-left text-xs font-bold text-white whitespace-nowrap bg-blue-600 border-r border-blue-500 ${cls}`}>
      {children}
    </th>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Day Book" subtitle="All vouchers for a selected date range" />

      {/* Filters */}
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-blue-500 to-indigo-500">
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <Label>From Date</Label>
            <Input type="date" max={today} value={range.fromdate} onChange={e => setRange(r => ({ ...r, fromdate: e.target.value }))} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} />
          </div>
          <div>
            <Label>To Date</Label>
            <Input type="date" max={today} value={range.todate} onChange={e => setRange(r => ({ ...r, todate: e.target.value }))} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} />
          </div>
          <div className="min-w-[260px]">
            <Label>Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Ref no, ledger, name, description…"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <Button onClick={() => setApplied({ ...range })}>
            <Search className="w-4 h-4" /> Search
          </Button>
          <button
            onClick={() => setFilterPanelOpen(p => !p)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm border ${
              activeFilterCount > 0 || filterPanelOpen
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters{activeFilterCount > 0 && ` (${activeFilterCount})`}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${filterPanelOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </GlassCard>

      {/* Column Filter Panel */}
      <AnimatePresence>
        {filterPanelOpen && (
          <motion.div
            key="col-filter-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <GlassCard className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs mb-1 block">Ref No</Label>
                  <input
                    type="text"
                    value={colFilters.c_number}
                    onChange={e => setColFilters(f => ({ ...f, c_number: e.target.value }))}
                    placeholder="Search ref no…"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Voucher Type</Label>
                  <select
                    value={colFilters.vouchertype}
                    onChange={e => setColFilters(f => ({ ...f, vouchertype: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    {voucherTypeOpts.map(v => <option key={v} value={v}>{v || 'All Types'}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Date</Label>
                  <input
                    type="date"
                    value={colFilters.date}
                    onChange={e => setColFilters(f => ({ ...f, date: e.target.value }))}
                    onClick={e => (e.target as HTMLInputElement).showPicker?.()}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Account Type</Label>
                  <select
                    value={colFilters.amount_type}
                    onChange={e => setColFilters(f => ({ ...f, amount_type: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    {accountTypeOpts.map(v => <option key={v} value={v}>{v || 'All'}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Ledger Name</Label>
                  <input
                    type="text"
                    value={colFilters.expensives}
                    onChange={e => setColFilters(f => ({ ...f, expensives: e.target.value }))}
                    placeholder="Search ledger…"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Value Date</Label>
                  <input
                    type="date"
                    value={colFilters.valueDate}
                    onChange={e => setColFilters(f => ({ ...f, valueDate: e.target.value }))}
                    onClick={e => (e.target as HTMLInputElement).showPicker?.()}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Vehicle No</Label>
                  <select
                    value={colFilters.bus_no}
                    onChange={e => setColFilters(f => ({ ...f, bus_no: e.target.value }))}
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  >
                    {vehicleOpts.map(v => <option key={v} value={v}>{v || 'All Vehicles'}</option>)}
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Name</Label>
                  <input
                    type="text"
                    value={colFilters.name}
                    onChange={e => setColFilters(f => ({ ...f, name: e.target.value }))}
                    placeholder="Search name…"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Description</Label>
                  <input
                    type="text"
                    value={colFilters.description}
                    onChange={e => setColFilters(f => ({ ...f, description: e.target.value }))}
                    placeholder="Search description…"
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
                {activeFilterCount > 0 && (
                  <div className="flex items-end">
                    <button
                      onClick={() => setColFilters({ c_number: '', vouchertype: '', date: '', amount_type: '', expensives: '', valueDate: '', bus_no: '', name: '', description: '' })}
                      className="h-9 w-full rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors"
                    >
                      Clear All ({activeFilterCount})
                    </button>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary cards + Excel button */}
      {tableRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={exportExcel}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" /> Download Excel
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <GlassCard className="p-5">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Entries</p>
              <h3 className="text-xl font-extrabold mt-1 text-blue-600">{tableRows.length}</h3>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Debit</p>
              <h3 className="text-xl font-extrabold mt-1 text-red-600">₹{fmtAmt(totalDebit)}</h3>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="text-xs font-bold text-slate-500 uppercase">Total Credit</p>
              <h3 className="text-xl font-extrabold mt-1 text-emerald-600">₹{fmtAmt(totalCredit)}</h3>
            </GlassCard>
            <GlassCard className="p-5">
              <p className="text-xs font-bold text-slate-500 uppercase">Difference (Dr − Cr)</p>
              <h3 className={`text-xl font-extrabold mt-1 ${difference === 0 ? 'text-green-600' : difference > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {difference === 0
                  ? 'Balanced'
                  : difference > 0
                  ? `₹${fmtAmt(difference)} Dr`
                  : `₹${fmtAmt(Math.abs(difference))} Cr`}
              </h3>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : tableRows.length === 0 ? (
        <GlassCard className="p-10 text-center text-slate-400 text-sm">
          No entries found for the selected date range.
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <TH>S.No</TH>
                  <TH>Ref No</TH>
                  <TH>Voucher Type</TH>
                  <TH>Date</TH>
                  <TH>Account Type</TH>
                  <TH>Ledger Name</TH>
                  <TH>Value Date</TH>
                  <TH>Vehicle No</TH>
                  <TH>Name</TH>
                  <TH>Description</TH>
                  <TH cls="text-right">Debit</TH>
                  <TH cls="text-right">Credit</TH>
                  <TH cls="text-right">Balance</TH>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-500 text-center">{row.i}</td>
                    <td className="px-3 py-2 border-b border-slate-100 font-medium text-blue-600 whitespace-nowrap">{row.c_number}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-700 whitespace-nowrap">{row.vouchertype}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">{fmt(row.i_ts)}</td>
                    <td className="px-3 py-2 border-b border-slate-100 whitespace-nowrap">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        row.amount_type === 'Debit Account'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {row.amount_type === 'Debit Account' ? 'DR' : row.amount_type === 'Credit Account' ? 'CR' : row.amount_type}
                      </span>
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-700 max-w-[160px] truncate">{row.expensives}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">{fmt(row.valueDate)}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">{row.bus_no}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">{row.name}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-500 max-w-[200px] truncate">{row.description}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-right font-medium text-red-600 tabular-nums whitespace-nowrap">
                      {row.debit ? fmtAmt(row.debit) : '—'}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-right font-medium text-emerald-600 tabular-nums whitespace-nowrap">
                      {row.credit ? fmtAmt(row.credit) : '—'}
                    </td>
                    <td className={`px-3 py-2 border-b border-slate-100 text-right font-bold tabular-nums whitespace-nowrap ${
                      row.balance >= 0 ? 'text-slate-700' : 'text-red-500'
                    }`}>
                      {row.balance >= 0
                        ? `${fmtAmt(row.balance)} Dr`
                        : `${fmtAmt(Math.abs(row.balance))} Cr`}
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals + Difference rows */}
              <tfoot>
                <tr className="bg-blue-50 font-bold border-t-2 border-blue-200">
                  <td colSpan={10} className="px-3 py-2.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Total
                  </td>
                  <td className="px-3 py-2.5 text-right text-red-600 tabular-nums">{fmtAmt(totalDebit)}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-600 tabular-nums">{fmtAmt(totalCredit)}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${tableRows[tableRows.length - 1]?.balance >= 0 ? 'text-slate-700' : 'text-red-500'}`}>
                    {(() => {
                      const b = tableRows[tableRows.length - 1]?.balance ?? 0
                      return b >= 0 ? `${fmtAmt(b)} Dr` : `${fmtAmt(Math.abs(b))} Cr`
                    })()}
                  </td>
                </tr>
                <tr className={`font-bold border-t border-dashed ${difference === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <td colSpan={10} className={`px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide ${difference === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                    Difference (Dr − Cr)
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-red-600">
                    {difference > 0 ? fmtAmt(difference) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">
                    {difference < 0 ? fmtAmt(Math.abs(difference)) : '—'}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums font-extrabold ${difference === 0 ? 'text-green-600' : difference > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {difference === 0 ? '✓ Balanced' : difference > 0 ? `${fmtAmt(difference)} Dr` : `${fmtAmt(Math.abs(difference))} Cr`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </GlassCard>
      )}
    </motion.div>
  )
}
