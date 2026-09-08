import { useQuery } from '@tanstack/react-query'
import { SearchableSelect } from './SearchableSelect'

// Generic master-data picker backed by a master list query. Renders the shared
// searchable dropdown, so it searches and takes arrow keys / Enter like every
// other select; the × clears it, replacing the old "— None —" row.
// panelId is kept so existing call sites need no change; the shared panel has
// a single id of its own.
export function MasterListPicker({ queryKey, queryFn, valueKey, value, onChange, placeholder }: {
  panelId: string
  queryKey: string
  queryFn: () => Promise<any>
  valueKey: string
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  const { data } = useQuery({ queryKey: [queryKey], queryFn })
  const items: any[] = data?.data ?? []
  const options = items.map((it) => {
    const v = String(it[valueKey] ?? '')
    return { value: v, label: v }
  }).filter((o) => o.value !== '')

  return (
    <SearchableSelect
      value={value}
      onChange={onChange}
      onClear={() => onChange('')}
      options={options}
      placeholder={placeholder}
      // A value from an older row that is no longer in the master still reads
      // back as itself rather than as an empty picker.
      displayLabel={value && !options.some((o) => o.value === value) ? value : undefined}
    />
  )
}
