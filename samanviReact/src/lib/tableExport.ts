import type { ReactNode } from 'react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Shared Excel / PDF export behind every list's Export button. A page hands
// over a header row and body rows of plain text; the DataTable builds those
// from what its cells render, so the file says what the screen says.

export type ExportFormat = 'excel' | 'pdf'
export type ExportCell = string | number

const pad2 = (n: number) => String(n).padStart(2, '0')
const fileStamp = () => { const d = new Date(); return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}` }
const safeName = (s: string) => s.replace(/\(\d+\)\s*$/, '').replace(/[\\/:*?"<>|]+/g, ' ').trim().replace(/\s+/g, '_') || 'Export'

export function exportRows(opts: { title: string; headers: string[]; rows: ExportCell[][]; format: ExportFormat; fileName?: string }) {
  const { title, headers, rows, format } = opts
  const base = `${safeName(opts.fileName || title)}_${fileStamp()}`
  if (format === 'excel') {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = headers.map((_, ci) => ({ wch: Math.min(60, Math.max(...[headers, ...rows].map((r) => String(r[ci] ?? '').length)) + 2) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, safeName(title).slice(0, 31))
    XLSX.writeFile(wb, `${base}.xlsx`)
    return
  }
  const doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14)
  doc.text('Samanvi Travels', pageWidth / 2, 12, { align: 'center' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(title, pageWidth / 2, 18, { align: 'center' })
  // jsPDF's built-in font has no ₹ glyph.
  const pdfText = (v: ExportCell) => String(v ?? '').replace(/₹\s?/g, 'Rs. ')
  autoTable(doc, {
    startY: 22,
    head: [headers.map(pdfText)],
    body: rows.map((r) => r.map(pdfText)),
    theme: 'grid',
    margin: { left: 8, right: 8 },
    styles: { fontSize: headers.length > 12 ? 6 : 7.5, cellPadding: 1.5, overflow: 'linebreak' },
    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
  })
  doc.save(`${base}.pdf`)
}

// Text a rendered cell shows: dropdowns give their chosen option, inputs their
// value, stacked lines are joined with a space, icons are dropped.
const BLOCK = new Set(['DIV', 'P', 'LI', 'TR', 'BR', 'SECTION', 'UL', 'OL'])
function domText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ''
  if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) return Array.from(node.childNodes).map(domText).join('')
  if (node.nodeType !== Node.ELEMENT_NODE) return ''
  const el = node as Element
  const tag = el.tagName.toUpperCase()
  if (tag === 'SVG' || tag === 'STYLE' || tag === 'SCRIPT') return ''
  if (tag === 'SELECT') return (el as HTMLSelectElement).selectedOptions?.[0]?.text ?? ''
  if (tag === 'INPUT') {
    const input = el as HTMLInputElement
    if (input.type === 'checkbox' || input.type === 'radio') return input.checked ? 'Yes' : ''
    return input.value ?? ''
  }
  if (tag === 'TEXTAREA') return (el as HTMLTextAreaElement).value ?? ''
  // Sibling elements (a date and "5d left" in two spans) read as separate words.
  let joined = ''
  el.childNodes.forEach((child) => {
    const t = domText(child)
    if (child.nodeType === Node.ELEMENT_NODE && joined && t && !/\s$/.test(joined) && !/^\s/.test(t)) joined += ' '
    joined += t
  })
  return BLOCK.has(tag) ? ` ${joined} ` : joined
}

type StaticRenderer = (node: ReactNode) => string
let renderer: StaticRenderer | null = null
/** Loads react-dom/server once, on the first export, so it stays out of the main bundle. */
export async function loadCellRenderer(): Promise<StaticRenderer> {
  if (!renderer) renderer = (await import('react-dom/server')).renderToStaticMarkup as StaticRenderer
  return renderer
}

export function nodeText(render: StaticRenderer, node: ReactNode, raw: unknown): ExportCell {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return node
  try {
    const tpl = document.createElement('template')
    tpl.innerHTML = render(node)
    const text = domText(tpl.content).replace(/\s+/g, ' ').trim()
    return text === '—' || text === '-' ? '' : text
  } catch {
    return raw == null || typeof raw === 'object' ? '' : String(raw)
  }
}

/** Export an on-page <table> as it stands (for pages that draw their own table). */
export function exportHtmlTable(table: HTMLTableElement | null, title: string, format: ExportFormat, fileName?: string) {
  if (!table) return
  const cellText = (c: Element) => domText(c).replace(/\s+/g, ' ').trim()
  const headRows = Array.from(table.querySelectorAll('thead tr'))
  const headers = headRows.length ? Array.from(headRows[headRows.length - 1].children).map(cellText) : []
  const bodyRows = Array.from(table.querySelectorAll('tbody tr, tfoot tr')).map((tr) => Array.from(tr.children).map(cellText))
  // Drop a trailing Actions column - buttons carry no data.
  const actionIdx = headers.findIndex((h) => /^actions?$/i.test(h))
  const strip = <T,>(r: T[]) => actionIdx >= 0 ? r.filter((_, i) => i !== actionIdx) : r
  exportRows({ title, headers: strip(headers), rows: bodyRows.filter((r) => r.some(Boolean)).map(strip), format, fileName })
}
