import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { X } from 'lucide-react'
import { DateRangePicker } from './DateRangePicker'
import { cn, todayISO } from '@/lib/utils'

const pad = (n: number) => String(n).padStart(2, '0')
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate() // m is 1-based
// 'YYYY-MM-DD' -> 'DD/MM/YYYY'
const toText = (iso: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}
// Typed digits -> 'DD/MM/YYYY' with the slashes put in as you type.
const mask = (raw: string) => {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  return d.length > 4 ? `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}` : d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d
}
// 'DD/MM/YYYY' -> 'YYYY-MM-DD', or null if it isn't a real date.
const parse = (text: string) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (!m) return null
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3])
  if (y < 1900 || mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null
  return `${y}-${pad(mo)}-${pad(d)}`
}

// One date box for master records (dates of birth, joining, document
// validity): type the date as DD/MM/YYYY (slashes fill in by themselves), or
// click the calendar icon and pick it, with Month / Year dropdowns to jump
// decades at once. Same props as DateField — value is 'YYYY-MM-DD' and
// onChange gets an event-shaped { target: { value } }. onChange fires once a
// complete, valid date is typed or picked ('' when cleared). Strings only,
// never a Date object, so no timezone shifts.
export function DateSelect({ value, onChange, min, max, className, disabled, name }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'min' | 'max'> & {
  value?: string | number | readonly string[]
  min?: string | number
  max?: string | number
}) {
  const v = String(value ?? '')
  const [text, setText] = useState(() => toText(v))
  const [error, setError] = useState('')
  const lastSent = useRef(v)

  // Follow the parent when it sets or resets the value (edit prefill, form reset).
  useEffect(() => {
    if (v !== lastSent.current) { setText(toText(v)); setError(''); lastSent.current = v }
  }, [v])

  const lo = min ? String(min) : ''
  const hi = max ? String(max) : ''
  const thisYear = Number(todayISO().slice(0, 4))

  const emit = (iso: string) => {
    if (iso === lastSent.current) return
    lastSent.current = iso
    const target = { value: iso, name: name ?? '' }
    onChange?.({ target, currentTarget: target } as unknown as React.ChangeEvent<HTMLInputElement>)
  }

  const commit = (iso: string) => { setText(toText(iso)); setError(''); emit(iso) }

  const onType = (raw: string) => {
    const t = mask(raw)
    setText(t)
    setError('')
    if (!t) return emit('')
    if (t.length < 10) { if (lastSent.current) emit(''); return }
    const iso = parse(t)
    if (!iso) { setError('Not a valid date'); if (lastSent.current) emit(''); return }
    if (lo && iso < lo) { setError(`Can't be before ${toText(lo)}`); if (lastSent.current) emit(''); return }
    if (hi && iso > hi) { setError(`Can't be after ${toText(hi)}`); if (lastSent.current) emit(''); return }
    emit(iso)
  }

  return (
    <div className={cn(disabled && 'pointer-events-none opacity-60', className)}>
      <div className={cn('flex h-11 items-center gap-1 rounded-xl border bg-white pl-3 pr-1.5 shadow-sm transition-all',
        'focus-within:ring-2 focus-within:ring-[#2563EB]/50 focus-within:border-[#2563EB]',
        error ? 'border-red-400' : 'border-slate-200')}>
        <input
          type="text" inputMode="numeric" name={name} disabled={disabled} placeholder="DD/MM/YYYY" maxLength={10}
          value={text} onChange={e => onType(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 outline-none"
        />
        {text && !disabled && (
          <button type="button" title="Clear date" onClick={() => commit('')}
            className="flex-none p-1 text-slate-400 hover:text-red-500 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <DateRangePicker single trigger="icon" from={lastSent.current} to={lastSent.current}
          min={lo || undefined} max={hi || undefined} yearFrom={1940} yearTo={thisYear + 30}
          onChange={r => commit(r.fromdate)} />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
