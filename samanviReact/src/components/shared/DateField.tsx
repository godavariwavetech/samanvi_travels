import type { InputHTMLAttributes } from 'react'
import { DateRangePicker } from './DateRangePicker'
import { cn } from '@/lib/utils'

// The one date control for entry forms: the same Monday-first calendar as the
// range pickers, in place of the browser's own date input (whose week starts on
// whatever the device says). It takes an <Input type="date">'s props and calls
// onChange with an event-shaped { target: { value } }, so existing handlers
// written for the native input keep working unchanged.
export function DateField({ value, onChange, min, max, className, disabled }: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'min' | 'max'> & {
  value?: string | number | readonly string[]
  min?: string | number
  max?: string | number
}) {
  const v = String(value ?? '')
  return (
    <div className={cn(disabled && 'pointer-events-none opacity-60')}>
      <DateRangePicker single from={v} to={v} min={min ? String(min) : undefined} max={max ? String(max) : undefined} className={className}
        onChange={(r) => onChange?.({ target: { value: r.fromdate }, currentTarget: { value: r.fromdate } } as unknown as React.ChangeEvent<HTMLInputElement>)} />
    </div>
  )
}
