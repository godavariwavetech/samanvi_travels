import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { tripsService } from '@/services/trips.service'

// "2026-10-22 11:47:55" -> "22/10/2026, 11:47". Values that are not a date are
// shown as they came.
const fmt = (v: unknown) => {
  const s = String(v ?? '').trim()
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/)
  if (!m) return s
  return `${m[3]}/${m[2]}/${m[1]}${m[4] ? `, ${m[4]}:${m[5]}` : ''}`
}

// Who did what to a trip, and when - opened from the trip's reference number.
export default function TripAuditModal({ cNumber, onClose }: { cNumber: string; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['trip-audit', cNumber],
    queryFn: () => tripsService.getTripAudit(cNumber),
  })
  const a: any = data?.data ?? null
  const status = Number(a?.admin_status)

  const steps: { label: string; who?: string; when?: string; done: boolean }[] = a ? [
    { label: 'Created', who: a.created_name, when: a.cts, done: !!a.created_name || !!a.cts },
    { label: 'Last edited', who: a.updatedby_name, when: a.updated_date, done: !!a.updatedby_name },
    { label: 'Expense filed', who: a.filed_by_name, when: a.filed_date, done: !!a.filed_date },
    { label: 'Authorized', who: a.authorization?.by, when: a.authorization?.at, done: !!a.authorization },
    { label: status === 2 ? 'Rejected' : 'Approved', who: status === 1 || status === 2 ? a.action_by_name : '', when: status === 1 || status === 2 ? a.admin_action_date : '', done: status === 1 || status === 2 },
  ] : []

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60 rounded-t-3xl">
          <span className="font-bold text-blue-600 text-lg">{cNumber}</span>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-200 transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
        </div>
        <div className="p-6 space-y-4">
          {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
          {!isLoading && !a && <p className="text-sm text-slate-400">No details found for this trip.</p>}
          {steps.map((s) => (
            <div key={s.label} className="flex gap-3">
              <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${s.done ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{s.label}</p>
                {s.done
                  ? <p className="text-sm font-medium text-slate-800">{s.who || '—'}{s.when ? <span className="text-slate-500 font-normal"> · {fmt(s.when)}</span> : null}</p>
                  : <p className="text-sm text-slate-300">Not yet</p>}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
