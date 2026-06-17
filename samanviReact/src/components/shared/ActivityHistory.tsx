import { Clock, BookOpen, Pencil, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export interface HistoryEntry {
  action: string
  action_by_name: string | null
  action_at: string | null
  changes_note: string | null
}

interface ActivityHistoryProps {
  data: HistoryEntry[]
  initialCreator?: string
  initialDate?: string
}

function fmtDate(raw: string | null) {
  if (!raw) return '—'
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}  ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

// single change row — field label + OLD block → NEW block, full width, no truncation
function ChangeRow({ ch }: { ch: any }) {
  const oldAmt = ch.field === 'Amount' ? parseFloat(ch.old) : NaN
  const newAmt = ch.field === 'Amount' ? parseFloat(ch.nw) : NaN
  const amtDiff = !isNaN(oldAmt) && !isNaN(newAmt) ? newAmt - oldAmt : 0

  return (
    <div className="px-3 pt-2 pb-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{ch.field}</span>
        {amtDiff !== 0 && (
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border
            ${amtDiff > 0 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-600 bg-red-50 border-red-200'}`}>
            {amtDiff > 0 ? '▲ +' : '▼ '}{Math.abs(amtDiff).toLocaleString('en-IN')}
          </span>
        )}
      </div>
      <div className="flex items-start gap-2">
        {/* OLD */}
        <div className="flex-1 min-w-0 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-red-400 mb-0.5">Before</p>
          <p className="text-xs font-medium text-red-600 line-through break-words leading-relaxed whitespace-pre-wrap">{ch.old || '(empty)'}</p>
        </div>
        {/* arrow */}
        <div className="flex-shrink-0 mt-4 text-slate-300 font-bold text-xs">→</div>
        {/* NEW */}
        <div className="flex-1 min-w-0 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-0.5">After</p>
          <p className="text-xs font-bold text-emerald-800 break-words leading-relaxed whitespace-pre-wrap">{ch.nw || '(empty)'}</p>
        </div>
      </div>
    </div>
  )
}

export default function ActivityHistory({ data, initialCreator, initialDate }: ActivityHistoryProps) {
  const hasCreatedAction = data.some(e => e.action === 'created')

  if ((!data || data.length === 0) && !initialCreator) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Clock className="w-6 h-6 text-slate-300" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-400">No activity recorded yet</p>
          <p className="text-xs text-slate-300 mt-0.5">Actions are tracked once the audit system is enabled</p>
        </div>
      </div>
    )
  }

  const displayData = [...data]
  if (!hasCreatedAction && initialCreator) {
    displayData.unshift({
      action: 'created',
      action_by_name: initialCreator,
      action_at: initialDate || null,
      changes_note: null
    })
  }

  return (
    <div className="relative pl-10">
      {/* Vertical connecting line */}
      <div className="absolute left-[14px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-blue-300 via-amber-300 to-emerald-300 rounded-full" />

      <div className="space-y-5">
        {displayData.map((entry, idx) => {
          const cfg: Record<string, { dot: string; bar: string; badge: string; label: string; Icon: any }> = {
            created:  { dot: 'from-blue-400 to-blue-600',       bar: 'bg-blue-600',    badge: 'bg-blue-100 text-blue-700 border-blue-200',         label: 'Created',  Icon: BookOpen },
            edited:   { dot: 'from-amber-400 to-amber-600',     bar: 'bg-amber-500',   badge: 'bg-amber-100 text-amber-700 border-amber-200',       label: 'Edited',   Icon: Pencil },
            approved: { dot: 'from-emerald-400 to-emerald-600', bar: 'bg-emerald-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Approved', Icon: CheckCircle },
            rejected: { dot: 'from-red-400 to-red-600',         bar: 'bg-red-600',     badge: 'bg-red-100 text-red-700 border-red-200',             label: 'Rejected', Icon: XCircle },
          }
          const c = cfg[entry.action] ?? {
            dot: 'from-slate-400 to-slate-500', bar: 'bg-slate-500',
            badge: 'bg-slate-100 text-slate-600 border-slate-200', label: entry.action, Icon: Clock
          }

          // parse changes_note — could be JSON or plain text
          let parsed: { reason?: string; changes?: any[] } | null = null
          let plainNote = ''
          if (entry.changes_note) {
            try { parsed = JSON.parse(entry.changes_note) } catch { plainNote = entry.changes_note }
          }

          // plain-text rejection reason detection
          const rejectionReason = (() => {
            if (plainNote.startsWith('Rejection reason:')) return plainNote.replace('Rejection reason:', '').trim()
            if (parsed?.reason && entry.action === 'rejected') return parsed.reason
            return null
          })()

          const headerChanges: any[] = []
          const entryGroupMap = new Map<string, any[]>()
          if (parsed?.changes) {
            parsed.changes.forEach((ch: any) => {
              if (ch.side === 'header') { headerChanges.push(ch); return }
              const key = `${ch.side}${ch.idx}||${ch.ledger}`
              if (!entryGroupMap.has(key)) entryGroupMap.set(key, [])
              entryGroupMap.get(key)!.push(ch)
            })
          }
          const entryGroups = Array.from(entryGroupMap.entries())
          const totalChanges = parsed?.changes?.length ?? 0

          return (
            <div key={idx} className="relative">
              {/* Dot */}
              <div className={`absolute -left-[29px] top-4 w-7 h-7 rounded-full bg-gradient-to-br ${c.dot} flex items-center justify-center shadow-md ring-2 ring-white z-10`}>
                <c.Icon className="w-3.5 h-3.5 text-white" />
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">

                {/* Header bar */}
                <div className={`${c.bar} px-4 py-2.5 flex items-center justify-between gap-3`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border flex-shrink-0 ${c.badge}`}>{c.label}</span>
                    <span className="text-sm font-bold text-white truncate">{entry.action_by_name || '—'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-white/70 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    <span className="whitespace-nowrap">{fmtDate(entry.action_at)}</span>
                  </div>
                </div>

                {/* Rejection reason — prominent red block */}
                {rejectionReason && (
                  <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border-b border-red-100">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-0.5">Rejection Reason</p>
                      <p className="text-sm text-red-800 font-medium leading-relaxed break-words">{rejectionReason}</p>
                    </div>
                  </div>
                )}

                {/* Edit reason + change count */}
                {parsed?.changes && entry.action === 'edited' && (parsed.reason || totalChanges > 0) && (
                  <div className="flex items-start justify-between gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                    {parsed.reason
                      ? (
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 flex-shrink-0 mt-0.5">Reason</span>
                          <span className="text-xs text-amber-900 font-medium leading-relaxed break-words">{parsed.reason}</span>
                        </div>
                      )
                      : <span />
                    }
                    {totalChanges > 0 && (
                      <span className="flex-shrink-0 text-[10px] font-bold text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                        {totalChanges} field{totalChanges !== 1 ? 's' : ''} updated
                      </span>
                    )}
                  </div>
                )}

                {/* Plain text fallback (non-rejection) */}
                {plainNote && !rejectionReason && (
                  <p className="text-xs text-slate-600 px-4 py-3 whitespace-pre-wrap leading-relaxed">{plainNote}</p>
                )}

                {/* No changes note */}
                {parsed?.changes && parsed.changes.length === 0 && (
                  <p className="text-xs text-slate-400 italic px-4 py-3">No field values were changed.</p>
                )}

                {/* Diff body */}
                {parsed?.changes && parsed.changes.length > 0 && (
                  <div className="px-1 py-2 space-y-2">

                    {/* Voucher-level (header) changes */}
                    {headerChanges.length > 0 && (
                      <div className="mx-3 rounded-lg overflow-hidden border border-slate-200">
                        <div className="px-3 py-1.5 bg-slate-100 flex items-center gap-2">
                          <BookOpen className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Voucher Header</span>
                        </div>
                        <div className="divide-y divide-slate-100 bg-white">
                          {headerChanges.map((ch, hi) => <ChangeRow key={hi} ch={ch} />)}
                        </div>
                      </div>
                    )}

                    {/* Per DR/CR entry groups */}
                    {entryGroups.map(([key, rows]) => {
                      const first = rows[0]
                      const isDr = first.side === 'DR'
                      return (
                        <div key={key} className="mx-3 rounded-lg overflow-hidden border border-slate-200">
                          {/* Entry identity */}
                          <div className={`flex items-center gap-2 px-3 py-2 ${isDr ? 'bg-rose-50' : 'bg-emerald-50'}`}>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded text-white flex-shrink-0 ${isDr ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                              {first.side}{first.idx}
                            </span>
                            <span className={`text-sm font-bold flex-1 min-w-0 break-words ${isDr ? 'text-rose-800' : 'text-emerald-800'}`}>
                              {first.ledger || '—'}
                            </span>
                            <span className={`text-[9px] font-black uppercase tracking-widest flex-shrink-0 ${isDr ? 'text-rose-400' : 'text-emerald-500'}`}>
                              {isDr ? 'Debit' : 'Credit'}
                            </span>
                          </div>
                          {/* Field changes */}
                          <div className="divide-y divide-slate-100 bg-white">
                            {rows.map((ch, ri) => <ChangeRow key={ri} ch={ch} />)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
