import React from 'react'
import { SearchableSelect } from './SearchableSelect'

// Keeps the native <select> API — <option> children, value, onChange reading
// e.target.value — but renders the shared searchable dropdown, so every plain
// select in the app gets a search box, arrow-key highlighting and Enter to pick
// without touching the forty-odd call sites. Every existing handler only reads
// e.target.value, so a minimal event-shaped object is all onChange needs.
//
// The first option with an empty value (the "— Select —" row) becomes the
// placeholder and stays pickable, exactly as it was in the native control.
type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> & {
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

function collectOptions(children: React.ReactNode): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const el = child as React.ReactElement<any>
    if (el.type === 'optgroup') {
      out.push(...collectOptions(el.props.children))
      return
    }
    if (el.type !== 'option') return
    const label = React.Children.toArray(el.props.children).map((c) => String(c ?? '')).join('').trim()
    const value = el.props.value !== undefined ? String(el.props.value) : label
    out.push({ value, label })
  })
  return out
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, value, onChange, disabled, ...rest }, _ref) => {
    const all = collectOptions(children)
    const empty = all.find((o) => o.value === '')
    // The "— Select —" row is the placeholder, not a choice: it shows as grey
    // placeholder text when nothing is picked, and the × clears back to it.
    const options = all.filter((o) => o.value !== '')
    const current = value === undefined || value === null ? '' : String(value)
    const fire = (v: string) => {
      if (!onChange) return
      const target = { value: v, name: rest.name ?? '' } as unknown as HTMLSelectElement
      onChange({ target, currentTarget: target } as React.ChangeEvent<HTMLSelectElement>)
    }
    return (
      <SearchableSelect
        value={current}
        onChange={fire}
        onClear={empty ? () => fire('') : undefined}
        options={options}
        placeholder={empty?.label || 'Select…'}
        disabled={disabled}
        className={className}
        buttonClassName="bg-white"
      />
    )
  }
)
Select.displayName = 'Select'
