import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Scale, Search, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { GlassCard, Button, Input, Label, DataTable, Badge, PageHeader, FYSelector } from '@/components/shared'
import type { Column } from '@/components/shared'
import { accountingService } from '@/services/accounting.service'
import { formatCurrency } from '@/lib/utils'
import { useFYStore } from '@/store/fy.store'
import { getCurrentFY } from '@/lib/fy'

// Plain number formatting for PDF cells — jsPDF's default font has no ₹
// glyph, and a missing glyph throws off autoTable's right-alignment math.
function fmtAmt(n: number): string {
  return Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmt(d: any): string {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '-'
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`
}

// The day before a yyyy-mm-dd date, for the "everything before From" query.
function dayBefore(iso: string): string {
  const dt = new Date(iso + 'T00:00:00')
  dt.setDate(dt.getDate() - 1)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
}
// Where "before" starts: early enough to take in every entry ever posted.
const EPOCH = '2000-01-01'

// A balance as Dr / Cr, red for debit and green for credit as the Debit and
// Credit columns are.
const balanceCell = (v: unknown) => {
  const cb = Number(v)
  if (!cb) return <span className="text-slate-300">—</span>
  return cb > 0
    ? <span className="font-bold text-red-600">{formatCurrency(cb)} Dr</span>
    : <span className="font-bold text-emerald-600">{formatCurrency(Math.abs(cb))} Cr</span>
}

// dd-mm-yyyy, hyphen-separated — used in export filenames, which can't contain slashes
function fmtFileDate(d: any): string {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return '-'
  return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`
}

const cols: Column[] = [
  {
    label: 'Ledger Name', key: 'ledger_name', filterable: true, filterType: 'text',
    render: (v, r: any) => <div><div className="font-bold">{String(v)}</div><div className="text-xs text-slate-500">{r.group_name}</div></div>,
  },
  { label: 'Group', key: 'group_name', filterable: true, filterType: 'select', render: (v) => <Badge variant="slate">{String(v)}</Badge> },
  // The balance brought forward at the From date: every approved entry posted
  // before it. Closing then carries on from here.
  { label: 'Opening Balance', key: 'opening', filterable: true, filterType: 'select', render: balanceCell },
  { label: 'Debit (₹)', key: 'debit', filterable: true, filterType: 'select', render: (v) => v && Number(v) > 0 ? <span className="font-bold text-red-600">{formatCurrency(Number(v))}</span> : <span className="text-slate-300">—</span> },
  { label: 'Credit (₹)', key: 'credit', filterable: true, filterType: 'select', render: (v) => v && Number(v) > 0 ? <span className="font-bold text-emerald-600">{formatCurrency(Number(v))}</span> : <span className="text-slate-300">—</span> },
  { label: 'Closing Balance', key: 'closing', filterable: true, filterType: 'select', render: balanceCell },
]

const today = new Date().toISOString().split('T')[0]
const currentFY = getCurrentFY()

export default function TrialBalancePage() {
  const selectedFY = useFYStore(s => s.selectedFY)
  const fyMin = selectedFY.fromDate
  const fyMax = selectedFY.startYear === currentFY.startYear ? today : selectedFY.toDate
  const [range, setRange] = useState({ fromdate: selectedFY.fromDate, todate: selectedFY.toDate })
  const [applied, setApplied] = useState(range)
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const next = { fromdate: selectedFY.fromDate, todate: selectedFY.toDate }
    setRange(next)
    setApplied(next)
  }, [selectedFY.fromDate, selectedFY.toDate])

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['trial-balance', applied],
    queryFn: () => accountingService.getTrialBalance(applied),
  })
  // Everything posted before the From date, for the opening balance - the
  // same report, so the same approval and date rules apply to both halves.
  const { data: openData, isLoading: loadingOpen, isFetching: fetchingOpen, refetch: refetchOpen } = useQuery({
    queryKey: ['trial-balance-opening', applied.fromdate],
    queryFn: () => accountingService.getTrialBalance({ fromdate: EPOCH, todate: dayBefore(applied.fromdate) }),
    enabled: !!applied.fromdate,
  })

  const raw = data?.data
  const voucherRows: any[] = Array.isArray(raw?.mainVoucherDetails) ? raw.mainVoucherDetails : []
  const openingRows: any[] = Array.isArray(openData?.data?.mainVoucherDetails) ? openData.data.mainVoucherDetails : []

  // Aggregate per-ledger Dr/Cr totals from voucher sub-rows
  const ledgerMap = new Map<string, { ledger_name: string; group_name: string; opening: number; debit: number; credit: number }>()
  const entryFor = (r: any) => {
    const name = r.expensives || 'Unknown'
    // subchildtwo is the ledger's immediate parent group; child is one level
    // further up (the grandparent) — child was being shown first, which
    // displayed the wrong (too-high) group for ledgers nested under a child group.
    const group = r.subchildtwo || r.child || r.staticname || '—'
    if (!ledgerMap.has(name)) ledgerMap.set(name, { ledger_name: name, group_name: group, opening: 0, debit: 0, credit: 0 })
    return ledgerMap.get(name)!
  }
  // Opening is the net of what came before: debits add, credits take away.
  openingRows.forEach((r: any) => {
    const entry = entryFor(r)
    if (r.account_type === 'Debit Account') entry.opening += Number(r.amount) || 0
    else if (r.account_type === 'Credit Account') entry.opening -= Number(r.amount) || 0
  })
  voucherRows.forEach((r: any) => {
    const entry = entryFor(r)
    if (r.account_type === 'Debit Account') entry.debit += Number(r.amount) || 0
    else if (r.account_type === 'Credit Account') entry.credit += Number(r.amount) || 0
  })
  // A ledger that only has an opening and nothing in the period still belongs
  // on the trial balance; one with nothing at all does not.
  const list = Array.from(ledgerMap.values())
    .filter(r => r.opening !== 0 || r.debit !== 0 || r.credit !== 0)
    .map(r => ({ ...r, closing: r.opening + r.debit - r.credit }))
  const totalOpening = list.reduce((s, r) => s + r.opening, 0)
  const totalDr = list.reduce((s, r) => s + r.debit, 0)
  const totalCr = list.reduce((s, r) => s + r.credit, 0)
  const totalClosing = list.reduce((s, r) => s + r.closing, 0)
  const anyLoading = isLoading || loadingOpen
  const anyFetching = isFetching || fetchingOpen
  const refetchAll = () => { refetch(); refetchOpen() }

  const closingStr = (cb: number) => cb === 0 ? '-' : cb > 0 ? `${fmtAmt(cb)} Dr` : `${fmtAmt(Math.abs(cb))} Cr`

  const exportExcel = () => {
    const header = ['Ledger Name', 'Group', 'Opening Balance', 'Debit', 'Credit', 'Closing Balance']
    const body = list.map(r => [
      r.ledger_name, r.group_name, closingStr(r.opening), r.debit || '', r.credit || '', closingStr(r.closing),
    ])
    body.push(['', 'Grand Total', closingStr(totalOpening), totalDr || '', totalCr || '', closingStr(totalClosing)])
    const ws = XLSX.utils.aoa_to_sheet([header, ...body])
    ws['!cols'] = header.map((_, ci) => ({ wch: Math.max(...[header, ...body].map(r => String(r[ci] ?? '').length)) + 2 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Trial Balance')
    const dateStamp = fmtFileDate(new Date())
    XLSX.writeFile(wb, `TrialBalance_${fmtFileDate(applied.fromdate)}_to_${fmtFileDate(applied.todate)}_${dateStamp}.xlsx`)
  }

  const exportPDF = () => {
    const doc = new jsPDF('landscape')
    const pageWidth = doc.internal.pageSize.getWidth()

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text('Samanvi Travels', pageWidth / 2, 14, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(`Trial Balance (${fmt(applied.fromdate)} to ${fmt(applied.todate)})`, pageWidth / 2, 22, { align: 'center' })

    // Header/footer cell alignment is set explicitly per column so it matches
    // the body — autoTable's columnStyles halign only carries to body rows.
    const headers = [
      { content: 'Ledger Name', styles: { halign: 'left' as const } },
      { content: 'Group', styles: { halign: 'left' as const } },
      { content: 'Opening Balance', styles: { halign: 'right' as const } },
      { content: 'Debit', styles: { halign: 'right' as const } },
      { content: 'Credit', styles: { halign: 'right' as const } },
      { content: 'Closing Balance', styles: { halign: 'right' as const } },
    ]
    const body = list.map(r => [
      r.ledger_name, r.group_name,
      { content: closingStr(r.opening), styles: { halign: 'right' as const } },
      { content: r.debit ? fmtAmt(r.debit) : '-', styles: { halign: 'right' as const } },
      { content: r.credit ? fmtAmt(r.credit) : '-', styles: { halign: 'right' as const } },
      { content: closingStr(r.closing), styles: { halign: 'right' as const } },
    ])

    autoTable(doc, {
      startY: 27,
      head: [headers],
      body,
      foot: [[
        '', { content: 'Grand Total', styles: { halign: 'right' as const } },
        { content: closingStr(totalOpening), styles: { halign: 'right' as const } },
        { content: fmtAmt(totalDr), styles: { halign: 'right' as const } },
        { content: fmtAmt(totalCr), styles: { halign: 'right' as const } },
        { content: closingStr(totalClosing), styles: { halign: 'right' as const } },
      ]],
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [239, 246, 255], textColor: [30, 64, 175], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } },
    })
    const dateStamp = fmtFileDate(new Date())
    doc.save(`TrialBalance_${fmtFileDate(applied.fromdate)}_to_${fmtFileDate(applied.todate)}_${dateStamp}.pdf`)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader title="Trial Balance" subtitle="Verify that total debits equal total credits" />

      <GlassCard className="p-5" colorBar="bg-gradient-to-r from-slate-600 to-slate-800">
        <FYSelector className="mb-4 pb-4 border-b border-slate-100" />
        <div className="flex items-end gap-4 flex-wrap">
          <div><Label>From Date</Label><Input type="date" min={fyMin} max={fyMax} value={range.fromdate} onChange={(e) => setRange({ ...range, fromdate: e.target.value })} /></div>
          <div><Label>As Of Date</Label><Input type="date" min={fyMin} max={fyMax} value={range.todate} onChange={(e) => setRange({ ...range, todate: e.target.value })} /></div>
          <Button onClick={() => setApplied(range)}><Search className="w-4 h-4" /> Generate</Button>
          <Button onClick={refetchAll} disabled={anyFetching} className="bg-slate-600 hover:bg-slate-700">
            <RefreshCw className={`w-4 h-4 ${anyFetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </GlassCard>

      {list.length > 0 && (
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" /> Download Excel
          </button>
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" /> Download PDF
          </button>
        </div>
      )}

      {list.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Opening Balance', value: `${formatCurrency(Math.abs(totalOpening))} ${totalOpening < 0 ? 'Cr' : 'Dr'}`, color: totalOpening < 0 ? 'text-emerald-600' : 'text-red-600' },
            { label: 'Total Debit', value: formatCurrency(totalDr), color: 'text-red-600' },
            { label: 'Total Credit', value: formatCurrency(totalCr), color: 'text-emerald-600' },
            { label: 'Difference', value: formatCurrency(Math.abs(totalDr - totalCr)), color: totalDr === totalCr ? 'text-green-600' : 'text-red-600' },
          ].map((s) => (
            <GlassCard key={s.label} className="p-5"><p className="text-xs font-bold text-slate-500 uppercase">{s.label}</p><h3 className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</h3></GlassCard>
          ))}
        </div>
      )}

      {list.length > 0 && totalDr === totalCr && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 font-bold text-sm">
          <Scale className="w-4 h-4" /> Trial balance is balanced — Debits = Credits
        </div>
      )}

      <DataTable
        title="Trial Balance" columns={cols} data={list} loading={anyLoading} actions={[]}
        columnFilters={colFilters}
        onColumnFilterChange={(key, vals) => setColFilters(f => ({ ...f, [key]: vals }))}
      />
    </motion.div>
  )
}
