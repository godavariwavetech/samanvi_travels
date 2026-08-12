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

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '—'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(-2)}`
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
export const scrollContentToTop = () => {
  document.getElementById('app-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' })
}
