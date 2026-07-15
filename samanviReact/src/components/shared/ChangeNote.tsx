// Renders a plain-text edit-history note (produced by backend helpers that build
// lines like "Field Label: 'old' -> 'new'") as clear Before/After rows instead of
// one dense run-on string. Falls back to the raw line if it doesn't match that shape.

const CHANGE_LINE = /^(.+?):\s*'(.*)'\s*->\s*'(.*)'$/

function parseLines(note: string): string[] {
  return note
    .split(/\n|;\s+(?=[A-Z][\w /&]*:\s')/)
    .map((l) => l.trim())
    .filter(Boolean)
}

export default function ChangeNote({ note }: { note: string }) {
  const lines = parseLines(note)

  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const m = line.match(CHANGE_LINE)
        if (!m) return <p key={i} className="text-sm text-slate-700">{line}</p>

        const [, field, oldVal, newVal] = m
        return (
          <div key={i} className="rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-2.5 py-1 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {field}
            </div>
            <div className="flex items-stretch text-xs">
              <div className="flex-1 min-w-0 px-2.5 py-1.5 bg-red-50 text-red-600 line-through break-words">
                {oldVal || '—'}
              </div>
              <div className="flex items-center px-1 text-slate-300 flex-shrink-0">→</div>
              <div className="flex-1 min-w-0 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 font-medium break-words">
                {newVal || '—'}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
