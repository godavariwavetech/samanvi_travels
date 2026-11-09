import * as XLSX from 'xlsx'

// The bank's bulk-payment upload sheet (BULK_DDMMYYYY_Serial.xlsx): an
// "Input File" sheet with a fixed header plus the bank's "Help" sheet. The bank
// rejects a changed header, a wrong file name, > 5 MB or > 7000 transactions.

export const BANK_BULK_HEADER = ['Payment Type', 'Beneficiary Name', 'Bene Account number', 'Bene Bank IFSC', 'Narration', 'Amount(₹)']
export const BANK_BULK_MAX_ROWS = 7000
const RTGS_MIN = 200000

export interface BankPaymentLine {
  c_number: string
  ledger_name: string
  amount: number | string
  description?: string
  person_type?: string | null
  account_holder_name?: string | null
  account_number?: string | null
  ifsc_code?: string | null
}

export interface SkippedLine { c_number: string; name: string; reason: string }

const clean = (v: unknown) => String(v ?? '').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim()

export function buildBankPaymentRows(lines: BankPaymentLine[]) {
  const rows: (string | number)[][] = []
  const skipped: SkippedLine[] = []
  for (const l of lines) {
    const name = clean(l.account_holder_name) || clean(l.ledger_name)
    const acc = clean(l.account_number).replace(/\s/g, '')
    const ifsc = clean(l.ifsc_code).replace(/\s/g, '').toUpperCase()
    const amount = Math.round((Number(l.amount) || 0) * 100) / 100
    const skip = (reason: string) => skipped.push({ c_number: l.c_number, name: clean(l.ledger_name), reason })
    if (!l.person_type) { skip('Not a Staff / Driver / Helper ledger — no bank details'); continue }
    if (!acc) { skip('Account number missing'); continue }
    if (!/^[A-Za-z0-9]{1,35}$/.test(acc)) { skip('Account number is invalid'); continue }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) { skip(ifsc ? `IFSC "${ifsc}" is invalid` : 'IFSC missing'); continue }
    if (!name) { skip('Beneficiary name missing'); continue }
    if (!(amount > 0)) { skip('Amount is zero'); continue }
    const narration = clean(`${l.c_number} ${l.description ?? ''}`).slice(0, 200)
    rows.push([amount >= RTGS_MIN ? 'RTGS' : 'NEFT', name.slice(0, 35), acc, ifsc, narration, amount.toFixed(2)])
  }
  return { rows, skipped }
}

const HELP: (string | undefined)[][] = [
  ['Import FAQ'],
  ['Header', "The header is fixed and cannot be modified. Do not alter or duplicate the table header from the 'Input File' sheet. Ensure that the header remains uniform across all bulk sheets"],
  [],
  ['Payment Type ', 'Payment type have a dropdown menu containing the options: RTGS, NEFT, Within Bank, and Own Account Transfer.'],
  [],
  ['Beneficiary Name', 'Maximum 35 alphanumeric characters.'],
  [],
  ['Bene Account Number', 'Maximum 35 alphanumeric characters.'],
  [],
  ['Bene Bank IFSC', 'Maximum 11 alphanumeric characters. For example: BDBL0001011'],
  [],
  ['Narration', 'Optional. Maximum 200 alphanumeric characters.'],
  [],
  ['Amount', 'Amount to transfer to the beneficiary, within the corporate limit.'],
  [],
  ['Error Codes'],
  ['Bulk File format should be in BULK_DDMMYYYY_Serial format', 'For example: BULK_21052024_123456.'],
  ['File is not .xlsx type', 'Please upload the correct xlsx format file.'],
  ['Uploaded file Size', 'The xlsx file size should not exceed 5MB. At most 7000 transactions per upload.'],
]

// The bank's own template (public/templates/bank-bulk-template.xlsx: the
// bank's file with its sample rows cleared) is filled in place, so the
// download keeps everything the bank built into it: the Help sheet, header
// styling, column widths, sheet protection, the Payment Type dropdown and the
// name / IFSC / amount checks. Each value goes into the template's own cell,
// keeping that cell's format (account number as text, amount as #,##0.00).
const INPUT_SHEET = 'xl/worksheets/sheet2.xml'
const COLS = ['A', 'B', 'C', 'D', 'E', 'F']
// Formats of an untouched template row, for a row the template lacks.
const DEFAULT_STYLE: Record<string, string> = { A: '8', B: '8', C: '9', D: '8', E: '8', F: '13' }
const xmlEscape = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function fillBankTemplate(template: Uint8Array, rows: (string | number)[][]): Uint8Array {
  const zip = XLSX.CFB.read(template, { type: 'array' })
  // Zip entries are listed with a root prefix, so match on the path ending.
  const at = zip.FullPaths.findIndex((p: string) => p.replace(/\\/g, '/').endsWith(INPUT_SHEET))
  const entry = at >= 0 ? zip.FileIndex[at] : null
  if (!entry || !entry.content) throw new Error('Bank template is missing its Input File sheet')
  let xml = new TextDecoder().decode(entry.content as Uint8Array)
  rows.forEach((values, i) => {
    const n = i + 2
    const rowRe = new RegExp(`<row r="${n}"[^>]*?(?:/>|>[\\s\\S]*?</row>)`)
    const existing = xml.match(rowRe)?.[0] ?? ''
    const open = existing.match(/^<row [^>]*?(?=\/?>)/)?.[0] ?? `<row r="${n}" spans="1:7"`
    const cells = COLS.map((col, c) => {
      const style = existing.match(new RegExp(`<c r="${col}${n}" s="(\\d+)"`))?.[1] ?? DEFAULT_STYLE[col]
      const v = values[c] ?? ''
      if (col === 'F') return `<c r="F${n}" s="${style}"><v>${Number(v) || 0}</v></c>`
      return `<c r="${col}${n}" s="${style}" t="inlineStr"><is><t>${xmlEscape(String(v))}</t></is></c>`
    }).join('')
    const row = `${open}>${cells}</row>`
    xml = existing ? xml.replace(existing, row) : xml.replace('</sheetData>', `${row}</sheetData>`)
  })
  entry.content = new TextEncoder().encode(xml) as any
  const out = XLSX.CFB.write(zip, { fileType: 'zip', type: 'array', compression: true }) as ArrayBuffer | Uint8Array
  return out instanceof Uint8Array ? out : new Uint8Array(out)
}

// Builds the sheet without the template (only if the template cannot be loaded).
function plainWorkbook(rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet([BANK_BULK_HEADER, ...rows.map((r) => [...r.slice(0, 5), Number(r[5]) || 0])])
  for (let r = 1; r <= rows.length; r++) {
    const cell = ws[XLSX.utils.encode_cell({ r, c: 2 })]; if (cell) cell.t = 's'
    const amt = ws[XLSX.utils.encode_cell({ r, c: 5 })]; if (amt) amt.z = '#,##0.00'
  }
  ws['!cols'] = [{ wch: 14 }, { wch: 36 }, { wch: 24 }, { wch: 14 }, { wch: 40 }, { wch: 14 }]
  const help = XLSX.utils.aoa_to_sheet(HELP)
  help['!cols'] = [{ wch: 30 }, { wch: 100 }]
  const wb: XLSX.WorkBook = { Sheets: { Help: help, 'Input File': ws }, SheetNames: ['Help', 'Input File'] }
  return new Uint8Array(XLSX.write(wb, { bookType: 'xlsx', type: 'array' }))
}

export async function downloadBankBulkFile(rows: (string | number)[][]) {
  let bytes: Uint8Array
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}templates/bank-bulk-template.xlsx`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`template ${res.status}`)
    bytes = fillBankTemplate(new Uint8Array(await res.arrayBuffer()), rows)
  } catch (e) {
    console.error('Bank template unavailable, using the plain layout:', e)
    bytes = plainWorkbook(rows)
  }
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const name = `BULK_${p(d.getDate())}${p(d.getMonth() + 1)}${d.getFullYear()}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.xlsx`
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
  return name
}
