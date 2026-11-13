import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn, todayISO } from '@/lib/utils'

interface DateRangePickerProps {
  from: string // ISO yyyy-mm-dd, '' if unset
  to: string
  onChange: (range: { fromdate: string; todate: string }) => void
  min?: string
  max?: string
  /** One date only: a click picks it and closes, no second click for a range. */
  single?: boolean
  className?: string
  /** Year dropdown bounds when no min/max narrows them (e.g. 1940 for dates of birth). */
  yearFrom?: number
  yearTo?: number
  /** 'icon': just a calendar icon, for use inside a typed date box (DateSelect). */
  trigger?: 'button' | 'icon'
}

// Weeks run Monday to Sunday.
const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const pad = (n: number) => String(n).padStart(2, '0')
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const parts = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return { y, m: m - 1, d } }
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const lastDay = (y: number, m: number) => new Date(y, m + 1, 0).getDate()
const show = (iso: string) => { if (!iso) return ''; const { y, m, d } = parts(iso); return `${pad(d)}/${pad(m + 1)}/${String(y).slice(-2)}` }

// One control for both a single date and a range: the first click sets the
// date (from = to, applied straight away), a second click on another day
// stretches it into a From–To range. Dates stay plain yyyy-mm-dd strings so
// nothing passes through a Date's timezone.
export function DateRangePicker({ from, to, onChange, min, max, single, className, yearFrom, yearTo, trigger = 'button' }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [view, setView] = useState({ y: 0, m: 0 })
  // Set after the first click of a pair; the next click completes the range.
  const [anchor, setAnchor] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const openPicker = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    const base = parts(from || todayISO())
    setView({ y: base.y, m: base.m })
    setAnchor(null)
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (document.getElementById('drp-panel')?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = (e: Event) => {
      if (document.getElementById('drp-panel')?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open])

  const disabled = (iso: string) => (!!min && iso < min) || (!!max && iso > max)

  const pick = (iso: string) => {
    if (disabled(iso)) return
    if (single) {
      onChange({ fromdate: iso, todate: iso })
      setOpen(false)
      return
    }
    if (anchor == null) {
      setAnchor(iso)
      onChange({ fromdate: iso, todate: iso })
      return
    }
    onChange(iso < anchor ? { fromdate: iso, todate: anchor } : { fromdate: anchor, todate: iso })
    setAnchor(null)
    setHover(null)
    setOpen(false)
  }

  // Apply a whole span at once (quick ranges, "whole month/year"), trimmed to min/max.
  const applyRange = (a: string, b: string) => {
    const f = min && a < min ? min : a
    const t = max && b > max ? max : b
    if (f > t) return
    onChange({ fromdate: f, todate: t })
    setAnchor(null); setHover(null); setOpen(false)
  }

  const goPrev = () => setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 })
  const goNext = () => setView(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 })

  const firstWeekday = (new Date(view.y, view.m, 1).getDay() + 6) % 7
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // While a second click is pending, preview the span to the hovered day.
  const [lo, hi] = anchor && hover
    ? (hover < anchor ? [hover, anchor] : [anchor, hover])
    : [from, to]

  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUpward = spaceBelow < 400 && rect!.top > spaceBelow
  const today = todayISO()

  // Year dropdown spans min..max when set, otherwise a wide window around now.
  const nowY = Number(today.slice(0, 4))
  const yLo = Math.min(min ? Number(min.slice(0, 4)) : yearFrom ?? nowY - 30, view.y)
  const yHi = Math.max(max ? Number(max.slice(0, 4)) : yearTo ?? nowY + 10, view.y)
  const years = Array.from({ length: yHi - yLo + 1 }, (_, i) => yHi - i)
  const monthOff = (y: number, m: number) =>
    (!!min && toISO(y, m, lastDay(y, m)) < min) || (!!max && toISO(y, m, 1) > max)

  // Financial year runs April to March.
  const { y: ty, m: tm } = parts(today)
  const fyStart = tm >= 3 ? ty : ty - 1
  const presets = single ? [] : [
    { label: 'This month', from: toISO(ty, tm, 1), to: toISO(ty, tm, lastDay(ty, tm)) },
    { label: 'Last month', from: toISO(tm === 0 ? ty - 1 : ty, (tm + 11) % 12, 1), to: toISO(tm === 0 ? ty - 1 : ty, (tm + 11) % 12, lastDay(tm === 0 ? ty - 1 : ty, (tm + 11) % 12)) },
    { label: 'Last 3 months', from: toISO(tm < 2 ? ty - 1 : ty, (tm + 10) % 12, 1), to: toISO(ty, tm, lastDay(ty, tm)) },
    { label: 'This FY', from: toISO(fyStart, 3, 1), to: toISO(fyStart + 1, 2, 31) },
    { label: 'Last FY', from: toISO(fyStart - 1, 3, 1), to: toISO(fyStart, 2, 31) },
    { label: 'This year', from: toISO(ty, 0, 1), to: toISO(ty, 11, 31) },
  ]
  const presetOff = (p: { from: string; to: string }) => (!!max && p.from > max) || (!!min && p.to < min)
  const presetActive = (p: { from: string; to: string }) => {
    const f = min && p.from < min ? min : p.from, t = max && p.to > max ? max : p.to
    return from === f && to === t
  }
  const selCls = 'h-7 rounded-lg border border-slate-200 bg-white px-1.5 text-sm font-bold text-slate-700 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 cursor-pointer'

  const label = !from ? 'Select date' : from === to || !to ? show(from) : `${show(from)} – ${show(to)}`

  const panel = open && rect && createPortal(
    <div
      id="drp-panel"
      style={{
        position: 'fixed',
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - (single ? 272 : 376))),
        zIndex: 99999,
      }}
      className={cn('rounded-xl border border-slate-200 bg-white shadow-2xl p-3 flex gap-3', single ? 'w-64' : 'w-[23rem] max-w-[calc(100vw-1rem)]')}
    >
      {!single && (
        <div className="flex flex-col gap-1 w-24 flex-shrink-0 border-r border-slate-100 pr-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-0.5">Quick</span>
          {presets.map(p => (
            <button key={p.label} type="button" disabled={presetOff(p)} onClick={() => applyRange(p.from, p.to)}
              className={cn('text-left text-xs rounded-lg px-2 py-1.5 transition-colors disabled:text-slate-300 disabled:hover:bg-transparent',
                presetActive(p) ? 'bg-blue-600 text-white font-semibold' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700')}>
              {p.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={goPrev} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1">
          <select aria-label="Month" value={view.m} onChange={e => setView(v => ({ ...v, m: Number(e.target.value) }))} className={selCls}>
            {MONTHS.map((name, i) => <option key={name} value={i} disabled={monthOff(view.y, i)}>{name}</option>)}
          </select>
          <select aria-label="Year" value={view.y} onChange={e => setView(v => ({ ...v, y: Number(e.target.value) }))} className={selCls}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button type="button" onClick={goNext} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="h-6 flex items-center justify-center text-[10px] font-bold text-slate-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => setHover(null)}>
        {cells.map((day, i) => {
          if (day == null) return <div key={i} />
          const iso = toISO(view.y, view.m, day)
          const off = disabled(iso)
          const isEnd = iso === lo || iso === hi
          const inSpan = !!lo && !!hi && iso > lo && iso < hi
          return (
            <button
              key={i}
              type="button"
              disabled={off}
              onClick={() => pick(iso)}
              onMouseEnter={() => anchor && setHover(iso)}
              className={cn(
                'h-8 text-xs transition-colors',
                isEnd ? 'bg-blue-600 text-white font-bold rounded-lg' : inSpan ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-blue-50 rounded-lg',
                !isEnd && iso === today && 'font-bold text-blue-600',
                off && 'text-slate-300 hover:bg-transparent cursor-not-allowed',
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400 leading-tight">
          {single ? 'Click a day' : anchor ? 'Click another day for a range' : 'Click a day, then another for a range'}
        </span>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            type="button"
            disabled={disabled(today)}
            onClick={() => { onChange({ fromdate: today, todate: today }); setAnchor(null); setOpen(false) }}
            className="text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg px-2 py-1 disabled:text-slate-300 disabled:hover:bg-transparent"
          >
            Today
          </button>
          {anchor && (
            <button type="button" onClick={() => { setAnchor(null); setOpen(false) }} className="text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg px-2 py-1">
              Done
            </button>
          )}
        </div>
      </div>
      {!single && (
        <div className="mt-1.5 flex gap-1.5">
          <button type="button" disabled={monthOff(view.y, view.m)} onClick={() => applyRange(toISO(view.y, view.m, 1), toISO(view.y, view.m, lastDay(view.y, view.m)))}
            className="flex-1 text-[11px] font-semibold text-blue-600 bg-blue-50/60 hover:bg-blue-100 rounded-lg px-2 py-1 disabled:text-slate-300 disabled:bg-transparent">
            All of {MONTHS[view.m]} {view.y}
          </button>
          <button type="button" disabled={(!!max && toISO(view.y, 0, 1) > max) || (!!min && toISO(view.y, 11, 31) < min)} onClick={() => applyRange(toISO(view.y, 0, 1), toISO(view.y, 11, 31))}
            className="flex-1 text-[11px] font-semibold text-blue-600 bg-blue-50/60 hover:bg-blue-100 rounded-lg px-2 py-1 disabled:text-slate-300 disabled:bg-transparent">
            All of {view.y}
          </button>
        </div>
      )}
      </div>
    </div>,
    document.body
  )

  if (trigger === 'icon') return (
    <>
      <button ref={btnRef} type="button" onClick={openPicker} title="Pick from calendar"
        className={cn('flex-none p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors', className)}>
        <CalendarDays className="w-4 h-4" />
      </button>
      {panel}
    </>
  )

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openPicker}
        className={cn(
          'flex h-11 min-w-[11rem] items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm text-slate-900 shadow-sm transition-all',
          'hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:border-[#2563EB]',
          className
        )}
      >
        <span className={cn('whitespace-nowrap', !from && 'text-slate-400')}>{label}</span>
        <CalendarDays className="w-4 h-4 text-slate-400 flex-shrink-0" />
      </button>
      {panel}
    </>
  )
}
