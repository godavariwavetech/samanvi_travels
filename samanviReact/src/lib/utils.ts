import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)

// The one date format the app shows: dd/mm/yy. Every screen that shows a date
// goes through this (or formatDateTime for a timestamp) so nothing reads
// dd MMM yyyy in one place and yyyy-mm-dd in the next.
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`
}
// dd/mm/yy HH:MM for timestamps (edit history, created / updated columns).
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// Converts a raw Excel cell into a 'YYYY-MM-DD' string for date columns.
// Callers must read the workbook WITHOUT `cellDates: true` so date cells arrive
// as raw serial numbers — SheetJS's cellDates conversion builds the JS Date using
// the local timezone's wall-clock constructor, so reading it back with either local
// or UTC getters rolls the day over by one in some timezones (verified: in IST it
// shifts the date backward). The serial-number math below is pure UTC epoch
// arithmetic with no timezone involved, so it's the only reliable path.
// Falls back to parsing common typed formats (DD-MM-YYYY, DD/MM/YYYY) for text cells,
// and handles a stray Date object (e.g. cellDates left on upstream) with local getters,
// since that's how this xlsx version actually constructs them.
export function excelCellToISODate(v: unknown): string {
  if (v == null || v === '') return ''
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return ''
    const y = v.getFullYear(), m = v.getMonth() + 1, d = v.getDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  if (typeof v === 'number') {
    // Excel serial date: days since 1899-12-30 (epoch quirk includes the fictitious 1900 leap day)
    const ms = Math.round((v - 25569) * 86400000)
    const dt = new Date(ms)
    if (isNaN(dt.getTime())) return ''
    const y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate()
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  const s = String(v).trim()
  if (!s) return ''
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/)
  if (m) {
    const [, dd, mm, yyyy] = m
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
  }
  return s
}

// The page body never scrolls — AppLayout's inner content pane (#app-scroll-container)
// is the actual scrollable element, so `window.scrollTo` is a no-op there. Use this
// after opening an edit form to bring it into view instead.
// Whether a vehicle-type master value names a van. The master is free text
// the customer maintains, and on the live data vans are typed "PICKUP VAN",
// not "VAN", so the test is for the word van anywhere in the value rather
// than an exact match. Anything else (or a blank) is a bus.
export const isVanVehicleType = (vehicleType: unknown): boolean =>
  /\bVAN\b/i.test(String(vehicleType ?? ''))

// Inside a full-screen sheet (Payables opened as a popup) the page's own
// scroller is not the one the user is looking at, so scroll that sheet when it
// is up and the page container only otherwise.
export const scrollContentToTop = () => {
  const el = document.getElementById('modal-scroll-container') ?? document.getElementById('app-scroll-container')
  el?.scrollTo({ top: 0, behavior: 'smooth' })
}
// The other end of a long sheet (the Trip Creation roster) for the same scroller.
export const scrollContentToBottom = () => {
  const el = document.getElementById('modal-scroll-container') ?? document.getElementById('app-scroll-container')
  el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
}

// Excel importers map columns by POSITION, so a sheet from a different screen
// (or an older template) is read as though its columns were the expected ones
// and silently produces nonsense - engine numbers under "Bus Operator" and so
// on. Compare the sheet's header row against the template before mapping
// anything. Names are normalised so cosmetic edits - case, spacing, a lost "*",
// a renamed "(YYYY-MM-DD)" hint - do not reject an otherwise correct sheet;
// what must match is the identity and order of the columns.
export function normaliseHeader(v: unknown): string {
  return String(v ?? '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '')
}

export function headerRowMismatch(actual: unknown[], expected: string[]): string | null {
  const got = (actual ?? []).map(normaliseHeader).filter(Boolean)
  const want = expected.map(normaliseHeader)
  // Extra trailing columns are tolerated; missing or reordered ones are not.
  for (let i = 0; i < want.length; i++) {
    if (got[i] !== want[i]) {
      const found = got[i] ? String(actual[i] ?? '') : '(nothing)'
      return `Column ${i + 1} should be "${expected[i]}" but this file has ${found === '(nothing)' ? found : `"${found}"`}`
    }
  }
  return null
}

// Approval status as the word the table shows, on a field of its own, so the
// column filter (which matches the stored value against the option text) can
// offer Pending / Approved / Rejected instead of 0 / 1 / 2.
export const statusLabel = (adminStatus: unknown): 'Pending' | 'Approved' | 'Rejected' =>
  Number(adminStatus) === 1 ? 'Approved' : Number(adminStatus) === 2 ? 'Rejected' : 'Pending'
export const withStatusLabel = <T extends Record<string, unknown>>(rows: T[]): (T & { status_label: string })[] =>
  rows.map((r) => ({ ...r, status_label: statusLabel(r.admin_status) }))

// An Indian mobile number: ten digits, and the first is 6, 7, 8 or 9 - no
// landline, no country code, no short number. Screens keep the input to digits
// as it is typed, so this only has to judge the finished value.
export const isValidMobile = (v: unknown): boolean => /^[6-9]\d{9}$/.test(String(v ?? '').trim())

// Money the Indian way - 1,23,456.00 - for every rupee figure the app shows.
// Takes what the API hands back (a number, or a numeric string), and reads
// 0.00 rather than NaN for anything blank.
export const formatAmount = (v: unknown): string =>
  (Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
