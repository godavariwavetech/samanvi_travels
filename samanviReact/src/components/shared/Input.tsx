import React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, onClick, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      onClick={e => {
        // Date inputs only open their native picker on the small calendar
        // glyph by default — clicking anywhere else in the field does
        // nothing. Opening it on any click matches how every other field
        // in the app responds to a click, and saves individually wiring
        // this up on every date input across the codebase.
        if (type === 'date') (e.target as HTMLInputElement).showPicker?.()
        onClick?.(e)
      }}
      className={cn(
        'flex h-11 w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/50 focus-visible:border-[#2563EB] focus-visible:bg-white',
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-slate-100',
        'transition-all shadow-sm',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
