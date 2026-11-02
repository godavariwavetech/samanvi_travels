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

export function downloadBankBulkFile(rows: (string | number)[][]) {
  const ws = XLSX.utils.aoa_to_sheet([BANK_BULK_HEADER, ...rows])
  // Account numbers / amounts stay text so leading zeros survive.
  for (let r = 1; r <= rows.length; r++) {
    for (const c of [2, 5]) { const cell = ws[XLSX.utils.encode_cell({ r, c })]; if (cell) cell.t = 's' }
  }
  ws['!cols'] = [{ wch: 14 }, { wch: 36 }, { wch: 24 }, { wch: 14 }, { wch: 40 }, { wch: 14 }]
  const help = XLSX.utils.aoa_to_sheet(HELP)
  help['!cols'] = [{ wch: 30 }, { wch: 100 }]
  const wb: XLSX.WorkBook = { Sheets: { Help: help, 'Input File': ws }, SheetNames: ['Help', 'Input File'] }
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const name = `BULK_${p(d.getDate())}${p(d.getMonth() + 1)}${d.getFullYear()}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.xlsx`
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  URL.revokeObjectURL(url)
  return name
}
