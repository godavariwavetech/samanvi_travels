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
  className?: string
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const pad = (n: number) => String(n).padStart(2, '0')
const toISO = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const parts = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return { y, m: m - 1, d } }
const show = (iso: string) => { if (!iso) return ''; const { y, m, d } = parts(iso); return `${pad(d)}/${pad(m + 1)}/${String(y).slice(-2)}` }

// One control for both a single date and a range: the first click sets the
// date (from = to, applied straight away), a second click on another day
// stretches it into a From–To range. Dates stay plain yyyy-mm-dd strings so
// nothing passes through a Date's timezone.
export function DateRangePicker({ from, to, onChange, min, max, className }: DateRangePickerProps) {
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

  const goPrev = () => setView(v => v.m === 0 ? { y: v.y - 1, m: 11 } : { ...v, m: v.m - 1 })
  const goNext = () => setView(v => v.m === 11 ? { y: v.y + 1, m: 0 } : { ...v, m: v.m + 1 })

  const firstWeekday = new Date(view.y, view.m, 1).getDay()
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
  const openUpward = spaceBelow < 360
  const today = todayISO()

  const label = !from ? 'Select date' : from === to || !to ? show(from) : `${show(from)} – ${show(to)}`

  const panel = open && rect && createPortal(
    <div
      id="drp-panel"
      style={{
        position: 'fixed',
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        left: Math.min(rect.left, window.innerWidth - 272),
        zIndex: 99999,
      }}
      className="w-64 rounded-xl border border-slate-200 bg-white shadow-2xl p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={goPrev} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-slate-700">
          {new Date(view.y, view.m, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
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
          {anchor ? 'Click another day for a range' : 'Click a day, then another for a range'}
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
    </div>,
    document.body
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
