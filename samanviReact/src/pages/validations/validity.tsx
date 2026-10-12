import { useMemo } from 'react'
import { AlertTriangle, CalendarClock, CalendarX2, ShieldCheck } from 'lucide-react'
import { MiniDatePicker } from '@/components/shared'
import type { Column } from '@/components/shared'
import { cn } from '@/lib/utils'

// Shared by Validations > Vehicles and Validations > Drivers: how far each
// document date is from today, the colour band it falls in, the expiry tabs,
// and the inline date cell that saves on pick.

export const TABS = ['All', 'Overdue', '1 Week', '15 Days', '1 Month', '3 Months'] as const
export type Tab = (typeof TABS)[number]

type Band = 'unset' | 'overdue' | 'urgent' | 'soon' | 'upcoming' | 'safe'

const BAND_STYLES: Record<Band, string> = {
  unset: 'text-slate-400 bg-slate-50 border-slate-200',
  overdue: 'text-red-700 bg-red-50 border-red-300 font-bold',
  urgent: 'text-orange-700 bg-orange-50 border-orange-300 font-bold',
  soon: 'text-amber-700 bg-amber-50 border-amber-200 font-semibold',
  upcoming: 'text-blue-700 bg-blue-50 border-blue-200',
  safe: 'text-emerald-700 bg-emerald-50/60 border-transparent',
}

function fmtDate(d: any) {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return String(d)
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'Asia/Kolkata' })
}

// YYYY-MM-DD in the fleet's local timezone — used both as the picker's selected value
// and as the basis for day-diff math, so it stays correct regardless of the browser's timezone.
function toKolkataISO(d: any): string {
  if (!d) return ''
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return ''
  return dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export function daysRemaining(d: any): number | null {
  const iso = toKolkataISO(d)
  if (!iso) return null
  const todayIso = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  const [ty, tm, td] = todayIso.split('-').map(Number)
  const [dy, dm, dd] = iso.split('-').map(Number)
  return Math.round((Date.UTC(dy, dm - 1, dd) - Date.UTC(ty, tm - 1, td)) / 86400000)
}

function bandFor(days: number | null): Band {
  if (days == null) return 'unset'
  if (days < 0) return 'overdue'
  if (days <= 7) return 'urgent'
  if (days <= 15) return 'soon'
  if (days <= 30) return 'upcoming'
  return 'safe'
}

export function matchesTab(tab: Exclude<Tab, 'All'>, days: number | null): boolean {
  if (days == null) return false
  if (tab === 'Overdue') return days < 0
  if (tab === '1 Week') return days >= 0 && days <= 7
  if (tab === '15 Days') return days >= 0 && days <= 15
  if (tab === '1 Month') return days >= 0 && days <= 30
  return days >= 0 && days <= 90 // '3 Months'
}

export type ValidityField = { key: string; label: string }

/** Rows with at least one document in the tab's window. */
export function rowsForTab<T extends Record<string, any>>(rows: T[], fields: ValidityField[], tab: Tab): T[] {
  if (tab === 'All') return rows
  return rows.filter((r) => fields.some((f) => matchesTab(tab, daysRemaining(r[f.key]))))
}

/** One date column per document: the date, days left / overdue, click to change. */
export function validityColumns(fields: ValidityField[], tab: Tab, onSave: (row: any, field: string, iso: string) => void): Column[] {
  return fields.map(({ key, label }) => ({
    label,
    key,
    filterable: true,
    render: (v: any, row: any) => {
      const days = daysRemaining(v)
      const highlighted = tab !== 'All' && matchesTab(tab, days)
      return (
        <MiniDatePicker
          value={toKolkataISO(v)}
          onChange={(iso) => onSave(row, key, iso)}
          className={cn(
            'inline-flex flex-col items-start px-2.5 py-1 rounded-lg border text-xs whitespace-nowrap transition-all hover:ring-2 hover:ring-blue-300',
            BAND_STYLES[bandFor(days)],
            highlighted && 'ring-2 ring-offset-1 ring-blue-500'
          )}
        >
          <span className="text-sm">{fmtDate(v)}</span>
          {days != null && (
            <span className="text-[10px] opacity-80">{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d left`}</span>
          )}
        </MiniDatePicker>
      )
    },
  }))
}

/**
 * The alert strip above the table: how many documents are already expired,
 * due within a week, and due within a month, plus how many dates were never
 * entered. Clicking a card opens that tab.
 */
export function ExpirySummary({ rows, fields, noun, onPick }: {
  rows: Record<string, any>[]
  fields: ValidityField[]
  noun: string
  onPick: (tab: Tab) => void
}) {
  const counts = useMemo(() => {
    let overdue = 0, week = 0, month = 0, missing = 0
    rows.forEach((r) => fields.forEach((f) => {
      const d = daysRemaining(r[f.key])
      if (d == null) missing++
      else if (d < 0) overdue++
      else if (d <= 7) week++
      else if (d <= 30) month++
    }))
    return { overdue, week, month, missing }
  }, [rows, fields])

  const cards: { label: string; value: number; tab: Tab | null; icon: typeof AlertTriangle; cls: string }[] = [
    { label: 'Expired', value: counts.overdue, tab: 'Overdue', icon: CalendarX2, cls: 'border-red-200 bg-red-50 text-red-700' },
    { label: 'Due in 7 days', value: counts.week, tab: '1 Week', icon: AlertTriangle, cls: 'border-orange-200 bg-orange-50 text-orange-700' },
    { label: 'Due in 8-30 days', value: counts.month, tab: '1 Month', icon: CalendarClock, cls: 'border-amber-200 bg-amber-50 text-amber-700' },
    { label: 'Date not entered', value: counts.missing, tab: null, icon: ShieldCheck, cls: 'border-slate-200 bg-slate-50 text-slate-600' },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, tab, icon: Icon, cls }) => (
        <button
          key={label}
          type="button"
          disabled={!tab}
          onClick={() => tab && onPick(tab)}
          className={cn('flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-shadow enabled:hover:shadow-md', cls)}
        >
          <Icon className="w-5 h-5 flex-shrink-0" />
          <div>
            <div className="text-2xl font-extrabold leading-none">{value}</div>
            <div className="text-xs font-semibold mt-1">{label}</div>
            <div className="text-[10px] opacity-70">{noun} documents</div>
          </div>
        </button>
      ))}
    </div>
  )
}
