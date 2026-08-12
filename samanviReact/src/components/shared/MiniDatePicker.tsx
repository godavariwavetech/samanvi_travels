import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MiniDatePickerProps {
  value: string // ISO yyyy-mm-dd, '' if unset
  onChange: (iso: string) => void
  children: ReactNode
  className?: string
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const pad = (n: number) => String(n).padStart(2, '0')

export function MiniDatePicker({ value, onChange, children, className }: MiniDatePickerProps) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [viewYear, setViewYear] = useState(0)
  const [viewMonth, setViewMonth] = useState(0)
  const btnRef = useRef<HTMLButtonElement>(null)

  const openPicker = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    const base = value ? new Date(value) : new Date()
    setViewYear(base.getFullYear())
    setViewMonth(base.getMonth())
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (document.getElementById('mdp-panel')?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onScroll = (e: Event) => {
      if (document.getElementById('mdp-panel')?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', onScroll, true) }
  }, [open])

  // Navigating months only changes what's displayed — it never touches `value`,
  // so browsing around never fires onChange. Only clicking an actual day does.
  const goPrevMonth = () => setViewMonth(m => {
    if (m === 0) { setViewYear(y => y - 1); return 11 }
    return m - 1
  })
  const goNextMonth = () => setViewMonth(m => {
    if (m === 11) { setViewYear(y => y + 1); return 0 }
    return m + 1
  })

  const selectDay = (day: number) => {
    onChange(`${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`)
    setOpen(false)
  }

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUpward = spaceBelow < 320

  const panel = open && rect && createPortal(
    <div
      id="mdp-panel"
      style={{
        position: 'fixed',
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left,
        zIndex: 99999,
      }}
      className="w-64 rounded-xl border border-slate-200 bg-white shadow-2xl p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={goPrevMonth} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-slate-700">
          {new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        <button type="button" onClick={goNextMonth} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="h-6 flex items-center justify-center text-[10px] font-bold text-slate-400">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day == null) return <div key={i} />
          const iso = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`
          const isSelected = value === iso
          return (
            <button
              key={i}
              type="button"
              onClick={() => selectDay(day)}
              className={cn(
                'h-7 w-7 rounded-lg text-xs transition-colors',
                isSelected ? 'bg-blue-600 text-white font-bold' : 'text-slate-700 hover:bg-blue-50'
              )}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>,
    document.body
  )

  return (
    <>
      <button ref={btnRef} type="button" onClick={openPicker} className={className}>
        {children}
      </button>
      {panel}
    </>
  )
}
