import React from 'react'
import { cn } from '@/lib/utils'

export const Label = ({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
  <label
    className={cn(
      'text-xs font-semibold uppercase tracking-wider text-slate-500 pb-1.5',
      'flex items-end min-h-[2rem]',   // consistent height → inputs align across grid columns
      className
    )}
    {...props}
  >
    {children}
  </label>
)
