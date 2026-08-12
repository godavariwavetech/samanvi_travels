import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

// Generic master-data picker (searchless dropdown backed by a master list)
export function MasterListPicker({ panelId, queryKey, queryFn, valueKey, value, onChange, placeholder }: {
  panelId: string
  queryKey: string
  queryFn: () => Promise<any>
  valueKey: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  const { data } = useQuery({ queryKey: [queryKey], queryFn })
  const items: any[] = data?.data ?? []

  const openDropdown = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect())
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (document.getElementById(panelId)?.contains(e.target as Node) ||
          btnRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onScroll = (e: Event) => {
      if (document.getElementById(panelId)?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    window.addEventListener('scroll', onScroll, true)
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('scroll', onScroll, true) }
  }, [open, panelId])

  const spaceBelow = rect ? window.innerHeight - rect.bottom : 999
  const openUpward = spaceBelow < 320

  const panel = open && rect && createPortal(
    <div id={panelId}
      style={{
        position: 'fixed',
        top: openUpward ? undefined : rect.bottom + 4,
        bottom: openUpward ? window.innerHeight - rect.top + 4 : undefined,
        left: rect.left, width: rect.width, maxHeight: 300, zIndex: 99999,
      }}
      className="rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col overflow-hidden"
    >
      <ul className="overflow-y-auto flex-1">
        <li onMouseDown={() => { onChange(''); setOpen(false) }}
          className="px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 cursor-pointer">— None —</li>
        {items.map((it) => {
          const v = String(it[valueKey])
          return (
            <li key={it.id}
              onMouseDown={() => { onChange(v); setOpen(false) }}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                value === v ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-800 hover:bg-slate-50'
              }`}>
              {v}
            </li>
          )
        })}
      </ul>
    </div>,
    document.body
  )

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={openDropdown}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm shadow-sm transition-all hover:border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:border-[#2563EB] focus-visible:bg-white"
      >
        <span className={value ? 'text-slate-900' : 'text-slate-400'}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {panel}
    </>
  )
}
