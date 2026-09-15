import { useState, useMemo, useEffect } from 'react'
import { motion } from 'motion/react'
import { Search, X, ExternalLink, Receipt, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { GlassCard, Button, Input, Label, PageHeader, ColumnFilterDropdown, FYSelector, DualScrollTable, ExportMenu, ReportColumnPicker, REPORT_EXTRA_COLS, toggleInSet, reportQuantity, reportRate, LedgerGroupTag } from '@/components/shared'
import { PayablesPopup } from './PayablesPopup'
import { ledgerGroupName } from '@/lib/utils'
import { accountingService } from '@/services/accounting.service'
import { getCurrentFY } from '@/lib/fy'
import { useFYStore } from '@/store/fy.store'

const currentFY = getCurrentFY()

function fmt(dateStr: any): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`
}

// dd-mm-yyyy, hyphen-separated — used in export filenames, which can't contain slashes
function fmtFileDate(dateStr: any): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
}

function fmtAmt(n: number): string {
  if (!n) return '—'
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

export default function DayBookPage() {
  const navigate = useNavigate()
  const today = new Date().toISOString().split('T')[0]
  const selectedFY = useFYStore(s => s.selectedFY)
  const fyMin = selectedFY.fromDate
  const fyMax = selectedFY.startYear === currentFY.startYear ? today : selectedFY.toDate
  const [range, setRange] = useState({ fromdate: today, todate: today })
  const [applied, setApplied] = useState(range)
  const [search, setSearch] = useState('')
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({})

  // Selecting a financial year snaps the range to that year's full span and
  // re-fetches immediately — otherwise the FY tabs look like they do nothing.
  useEffect(() => {
    const next = { fromdate: fyMin, todate: fyMax }
    setRange(next)
    setApplied(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fyMin, fyMax])

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['daybook', applied],
    queryFn: () => accountingService.getDayBook({ fromdate: applied.fromdate, todate: applied.todate }),
  })

  const { data: ledgersRes } = useQuery({
    queryKey: ['ledger-names'],
    queryFn: () => accountingService.getLedgerName(),
  })
  const ledgerIdToGroup = useMemo(() => {
    const m = new Map<number, string>()
    const list: any[] = ledgersRes?.data ?? []
    list.forEach(l => { const id = Number(l.id ?? l.ledger_id); if (id) m.set(id, ledgerGroupName(l)) })
    return m
  }, [ledgersRes])

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
          ledger_id:   item.ledger_id   ?? null,
          group:       ledgerIdToGroup.get(Number(item.ledger_id)) || '',
          expensives:  item.expensives  || '—',
          valueDate:   item.valuedate   || item.valueDate || '',
          bus_no:      item.vehicleNo   || item.bus_no    || '—',
          // Optional columns: the trip behind a trip expense or its voucher,
          // and the litres / price per litre behind a fuel fill (pieces on a
          // laundry bill).
          trip_date:   item.trip_date   || '',
          quantity:    item.quantity    ?? null,
          rate:        item.rate        ?? null,
          quantity_unit: item.quantity_unit || '',
          name:        item.name        || '—',
          description: item.description || '—',
          debit,
          credit,
          balance,
        }
      })
  }, [allRows, ledgerIdToGroup])

  // Client-side search filter
  const filteredRows = useMemo(() => {
    if (!search.trim()) return tableRows
    const q = search.trim().toLowerCase()
    return tableRows.filter(r =>
      [r.c_number, r.vouchertype, r.expensives, r.bus_no, r.name, r.description, r.amount_type]
        .some(v => String(v).toLowerCase().includes(q))
    )
  }, [tableRows, search])

  // Trip Date, Quantity and Rate, ticked on and off above the table the way
  // Voucher Approvals' "Show columns" works; all three start visible.
  const [extraCols, setExtraCols] = useState<Set<string>>(new Set(REPORT_EXTRA_COLS))
  const showCol = (c: string) => extraCols.has(c)
  const extraCount = extraCols.size

  const FILTER_KEYS = ['c_number', 'vouchertype', 'date', 'amount_type', 'expensives', 'valueDate', 'bus_no', 'tripDate', 'quantity', 'rate', 'name', 'description', 'debit', 'credit'] as const

  const colValue = (row: any, key: string): string => {
    switch (key) {
      case 'c_number': return row.c_number
      case 'vouchertype': return row.vouchertype
      case 'date': return fmt(row.i_ts)
      case 'amount_type': return row.amount_type === 'Debit Account' ? 'DR' : row.amount_type === 'Credit Account' ? 'CR' : row.amount_type
      case 'expensives': return row.expensives
      case 'valueDate': return fmt(row.valueDate)
      case 'bus_no': return row.bus_no
      case 'tripDate': return row.trip_date ? fmt(row.trip_date) : '—'
      case 'quantity': return reportQuantity(row) || '—'
      case 'rate': return reportRate(row) || '—'
      case 'name': return row.name
      case 'description': return row.description
      case 'debit': return row.debit ? fmtAmt(row.debit) : '—'
      case 'credit': return row.credit ? fmtAmt(row.credit) : '—'
      default: return ''
    }
  }

  const filterColOptions = useMemo(() => {
    const result: Record<string, string[]> = {}
    FILTER_KEYS.forEach(key => {
      result[key] = Array.from(new Set(tableRows.map(r => colValue(r, key)))).sort()
    })
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableRows])

  const displayRows = useMemo(() => {
    const hasFilter = Object.values(colFilters).some(v => v && v.length > 0)
    if (!hasFilter) return filteredRows
    return filteredRows.filter(row => {
      for (const [key, vals] of Object.entries(colFilters)) {
        if (!vals || vals.length === 0) continue
        if (!vals.includes(colValue(row, key))) return false
      }
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRows, colFilters])

  const activeFilterCount = Object.values(colFilters).filter(v => v && v.length > 0).length

  const totalDebit  = tableRows.reduce((s, r) => s + r.debit,  0)
  const totalCredit = tableRows.reduce((s, r) => s + r.credit, 0)
  const difference  = totalDebit - totalCredit
  // The table footer and both downloads sum the rows actually shown - the
  // search and column filters applied - and number them from 1. The cards
  // above keep the whole date range.
  const shownDebit  = displayRows.reduce((s, r) => s + r.debit,  0)
  const shownCredit = displayRows.reduce((s, r) => s + r.credit, 0)
  const shownDifference = shownDebit - shownCredit

  const exportExcel = () => {
    // The ticked optional columns go out too, after Vehicle No as on screen.
    const extras = REPORT_EXTRA_COLS.filter(showCol)
    const pad = extras.map(() => '')
    const extraValues = (r: any) => extras.map((c) => c === 'Trip Date' ? (r.trip_date ? fmt(r.trip_date) : '') : c === 'Quantity' ? reportQuantity(r) : reportRate(r))
    const header = ['S.No', 'Ref No', 'Voucher Type', 'Date', 'Account Type', 'Ledger Name', 'Group', 'Value Date', 'Vehicle No', ...extras, 'Name', 'Description', 'Debit', 'Credit', 'Balance']
    const body = displayRows.map((r, i) => [
      i + 1, r.c_number, r.vouchertype, fmt(r.i_ts),
      r.amount_type === 'Debit Account' ? 'DR' : r.amount_type === 'Credit Account' ? 'CR' : r.amount_type,
      r.expensives, r.group, fmt(r.valueDate), r.bus_no, ...extraValues(r), r.name, r.description,
      r.debit || '', r.credit || '',
      r.balance >= 0 ? `${r.balance.toFixed(2)} Dr` : `${Math.abs(r.balance).toFixed(2)} Cr`,
    ])
    body.push(['', '', '', '', '', '', '', '', '', ...pad, '', 'Total', shownDebit || '', shownCredit || '', ''])
    body.push(['', '', '', '', '', '', '', '', '', ...pad, '', 'Difference (Dr - Cr)',
      shownDifference >= 0 ? shownDifference : '',
      shownDifference < 0 ? Math.abs(shownDifference) : '',
      shownDifference === 0 ? 'Balanced' : shownDifference > 0 ? `${shownDifference.toFixed(2)} Dr` : `${Math.abs(shownDifference).toFixed(2)} Cr`,
    ])
    const ws = XLSX.utils.aoa_to_sheet([header, ...body])
    ws['!cols'] = header.map((_, ci) => ({ wch: Math.max(...[header, ...body].map(r => String(r[ci] ?? '').length)) + 2 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Day Book')
    const dateStamp = fmtFileDate(new Date())
    XLSX.writeFile(wb, `DayBook_${fmtFileDate(applied.fromdate)}_to_${fmtFileDate(applied.todate)}_${dateStamp}.xlsx`)
  }

  // ── Export PDF ────────────────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF('landscape')
    const pageWidth = doc.internal.pageSize.getWidth()

    // App name + date range, centered at the top of the page
    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Samanvi Travels', pageWidth / 2, 14, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`Day Book (${fmt(applied.fromdate)} to ${fmt(applied.todate)})`, pageWidth / 2, 22, { align: 'center' })

    // Header cell alignment is set explicitly per column so it matches the
    // body/columnStyles alignment below (autoTable doesn't otherwise carry
    // columnStyles' halign over to the head/foot rows, only the body).
    const colAlign = ['center', 'center', 'center', 'center', 'center', 'left', 'left', 'center', 'center', 'center', 'left', 'right', 'right', 'right'] as const
    const headers = ['S.No', 'Ref No', 'Voucher Type', 'Date', 'Account Type', 'Ledger Name', 'Group', 'Value Date', 'Vehicle No', 'Name', 'Description', 'Debit', 'Credit', 'Balance']
      .map((h, i) => ({ content: h, styles: { halign: colAlign[i] } }))

    // The ₹ glyph isn't in jsPDF's default font — it measures as the wrong
    // width, which throws off right-alignment. Plain numbers render correctly.
    const balStr = (b: number) => b >= 0 ? `${fmtAmt(b)} Dr` : `${fmtAmt(Math.abs(b))} Cr`

    const body = displayRows.map((r, i) => [
      String(i + 1), r.c_number, r.vouchertype, fmt(r.i_ts),
      r.amount_type === 'Debit Account' ? 'DR' : r.amount_type === 'Credit Account' ? 'CR' : r.amount_type,
      r.expensives, r.group || '-', fmt(r.valueDate), r.bus_no, r.name, r.description,
      { content: r.debit ? fmtAmt(r.debit) : '-', styles: { halign: 'right' as const } },
      { content: r.credit ? fmtAmt(r.credit) : '-', styles: { halign: 'right' as const } },
      { content: balStr(r.balance), styles: { halign: 'right' as const } },
    ])

    const TABLE_WIDTH_MM = 243
    const marginX = Math.max((pageWidth - TABLE_WIDTH_MM) / 2, 14)

    autoTable(doc, {
      startY: 27,
      head: [headers],
      body,
      foot: [[
        '', '', '', '', '', '', '', '', '', '',
        { content: 'Total', styles: { halign: 'right' as const } },
        { content: fmtAmt(shownDebit), styles: { halign: 'right' as const } },
        { content: fmtAmt(shownCredit), styles: { halign: 'right' as const } },
        { content: '', styles: { halign: 'right' as const } },
      ], [
        '', '', '', '', '', '', '', '', '', '',
        { content: 'Difference (Dr − Cr)', styles: { halign: 'right' as const } },
        { content: shownDifference > 0 ? fmtAmt(shownDifference) : '-', styles: { halign: 'right' as const } },
        { content: shownDifference < 0 ? fmtAmt(Math.abs(shownDifference)) : '-', styles: { halign: 'right' as const } },
        { content: shownDifference === 0 ? 'Balanced' : balStr(shownDifference), styles: { halign: 'right' as const } },
      ]],
      // Totals once, under the last row - not repeated on every page.
      showFoot: 'lastPage',
      theme: 'grid',
      margin: { left: marginX, right: marginX },
      tableWidth: TABLE_WIDTH_MM,
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [239, 246, 255], textColor: [30, 64, 175], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 8 },  1: { cellWidth: 14 }, 2: { cellWidth: 16 }, 3: { cellWidth: 16 },
        4: { cellWidth: 14 }, 5: { cellWidth: 24 }, 6: { cellWidth: 18 }, 7: { cellWidth: 16 },
        8: { cellWidth: 15 }, 9: { cellWidth: 16 }, 10: { cellWidth: 30 },
        11: { cellWidth: 18, halign: 'right' }, 12: { cellWidth: 18, halign: 'right' }, 13: { cellWidth: 20, halign: 'right' },
      },
    })
    const dateStamp = fmtFileDate(new Date())
    doc.save(`DayBook_${fmtFileDate(applied.fromdate)}_to_${fmtFileDate(applied.todate)}_${dateStamp}.pdf`)
  }

  const handleLedgerClick = (row: { ledger_id: number | null }) => {
    if (!row.ledger_id) return
    navigate('/accounting/ledger-wise', { state: { ledgerId: row.ledger_id } })
  }

  // Payables opens as a popup over this report rather than in another tab.
  const [payablesFor, setPayablesFor] = useState<{ id: number; name: string } | null>(null)
  const handlePayables = (row: { ledger_id: number | null; expensives: string }) => {
    if (!row.ledger_id) return
    setPayablesFor({ id: row.ledger_id, name: row.expensives })
  }

  const TH = ({ children, cls = '', filterKey }: { children: React.ReactNode; cls?: string; filterKey?: string }) => (
    <th className={`sticky top-0 z-10 px-3 py-2.5 text-left text-xs font-bold text-white whitespace-nowrap bg-blue-600 border-r border-blue-500 ${cls}`}>
      {/* text-align on the <th> doesn't affect this flex row's own layout —
          justify-end is needed too so the label+filter icon actually sit on
          the same side as the right-aligned amount cells below */}
      <div className={`flex items-center gap-1.5 ${cls.includes('text-right') ? 'justify-end' : ''}`}>
        <span>{children}</span>
        {filterKey && (
          <ColumnFilterDropdown
            variant="light"
            options={filterColOptions[filterKey] ?? []}
            selected={colFilters[filterKey] ?? []}
            onChange={vals => setColFilters(f => ({ ...f, [filterKey]: vals }))}
          />
        )}
      </div>
    </th>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Day Book" subtitle="All vouchers for a selected date range" />

      {/* Filters */}
      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-blue-500 to-indigo-500">
        <FYSelector className="mb-4 pb-4 border-b border-slate-100" />
        <div className="flex items-end gap-4 flex-wrap">
          <div>
            <Label>From Date</Label>
            <Input type="date" min={fyMin} max={fyMax} value={range.fromdate} onChange={e => setRange(r => ({ ...r, fromdate: e.target.value }))} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} />
          </div>
          <div>
            <Label>To Date</Label>
            <Input type="date" min={fyMin} max={fyMax} value={range.todate} onChange={e => setRange(r => ({ ...r, todate: e.target.value }))} onClick={(e) => (e.target as HTMLInputElement).showPicker?.()} />
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
          <Button onClick={() => refetch()} disabled={isFetching} className="bg-slate-600 hover:bg-slate-700">
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </GlassCard>

      {/* Summary cards + Export button */}
      {tableRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-end gap-3">
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active · {displayRows.length} of {tableRows.length} rows
                <button onClick={() => setColFilters({})} className="text-blue-600 font-semibold hover:underline">Clear all</button>
              </span>
            )}
            <ExportMenu onExport={(f) => f === 'excel' ? exportExcel() : exportPDF()} />
          </div>
          <ReportColumnPicker options={REPORT_EXTRA_COLS} visible={extraCols} onToggle={(c) => setExtraCols((v) => toggleInSet(v, c))} />
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
          <DualScrollTable tableClassName="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <TH>S.No</TH>
                  <TH filterKey="c_number">Ref No</TH>
                  <TH filterKey="vouchertype">Voucher Type</TH>
                  <TH filterKey="date">Date</TH>
                  <TH filterKey="amount_type">Account Type</TH>
                  <TH filterKey="expensives">Ledger Name</TH>
                  <TH filterKey="valueDate">Value Date</TH>
                  <TH filterKey="bus_no">Vehicle No</TH>
                  {showCol('Trip Date') && <TH filterKey="tripDate">Trip Date</TH>}
                  {showCol('Quantity') && <TH cls="text-right" filterKey="quantity">Quantity</TH>}
                  {showCol('Rate') && <TH cls="text-right" filterKey="rate">Rate</TH>}
                  <TH filterKey="name">Name</TH>
                  <TH filterKey="description">Description</TH>
                  <TH cls="text-right" filterKey="debit">Debit</TH>
                  <TH cls="text-right" filterKey="credit">Credit</TH>
                  <TH cls="text-right">Balance</TH>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-500 text-center">{idx + 1}</td>
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
                    <td className="px-3 py-2 border-b border-slate-100 max-w-[200px] group/ledger">
                      {row.ledger_id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleLedgerClick(row)}
                            title="View in Ledger Wise"
                            className="inline-flex items-center gap-1 text-blue-600 font-medium hover:text-blue-800 hover:underline truncate"
                          >
                            <span className="truncate">{row.expensives}<LedgerGroupTag group={row.group} /></span>
                            <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />
                          </button>
                          <button
                            onClick={() => handlePayables(row)}
                            title="Open Payables for this ledger"
                            className="flex-shrink-0 p-1 rounded-lg border border-emerald-300 text-emerald-600 bg-white hover:bg-emerald-50 transition-colors"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-700 truncate">{row.expensives}<LedgerGroupTag group={row.group} /></span>
                      )}
                    </td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">{fmt(row.valueDate)}</td>
                    <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">{row.bus_no}</td>
                    {showCol('Trip Date') && <td className="px-3 py-2 border-b border-slate-100 text-slate-600 whitespace-nowrap">{row.trip_date ? fmt(row.trip_date) : '—'}</td>}
                    {showCol('Quantity') && <td className="px-3 py-2 border-b border-slate-100 text-slate-600 text-right tabular-nums whitespace-nowrap">{reportQuantity(row) || '—'}</td>}
                    {showCol('Rate') && <td className="px-3 py-2 border-b border-slate-100 text-slate-600 text-right tabular-nums whitespace-nowrap">{reportRate(row) || '—'}</td>}
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
                  <td colSpan={10 + extraCount} className="px-3 py-2.5 text-right text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Total{displayRows.length !== tableRows.length ? ` (${displayRows.length} of ${tableRows.length} rows)` : ''}
                  </td>
                  <td className="px-3 py-2.5 text-right text-red-600 tabular-nums">{fmtAmt(shownDebit)}</td>
                  <td className="px-3 py-2.5 text-right text-emerald-600 tabular-nums">{fmtAmt(shownCredit)}</td>
                  <td className={`px-3 py-2.5 text-right tabular-nums ${displayRows[displayRows.length - 1]?.balance >= 0 ? 'text-slate-700' : 'text-red-500'}`}>
                    {(() => {
                      const b = displayRows[displayRows.length - 1]?.balance ?? 0
                      return b >= 0 ? `${fmtAmt(b)} Dr` : `${fmtAmt(Math.abs(b))} Cr`
                    })()}
                  </td>
                </tr>
                <tr className={`font-bold border-t border-dashed ${shownDifference === 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                  <td colSpan={10 + extraCount} className={`px-3 py-2.5 text-right text-xs font-bold uppercase tracking-wide ${shownDifference === 0 ? 'text-green-700' : 'text-amber-700'}`}>
                    Difference (Dr − Cr)
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-red-600">
                    {shownDifference > 0 ? fmtAmt(shownDifference) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">
                    {shownDifference < 0 ? fmtAmt(Math.abs(shownDifference)) : '—'}
                  </td>
                  <td className={`px-3 py-2.5 text-right tabular-nums font-extrabold ${shownDifference === 0 ? 'text-green-600' : shownDifference > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {shownDifference === 0 ? '✓ Balanced' : shownDifference > 0 ? `${fmtAmt(shownDifference)} Dr` : `${fmtAmt(Math.abs(shownDifference))} Cr`}
                  </td>
                </tr>
              </tfoot>
            </table>
          </DualScrollTable>
        </GlassCard>
      )}
      {payablesFor && <PayablesPopup ledger={payablesFor} onClose={() => setPayablesFor(null)} />}
    </motion.div>
  )
}
