import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { X } from 'lucide-react'
import { formatAmount } from '@/lib/utils'

// The one popup shape the app uses for a record (see the Trip Expenses view
// and edit popups): a white card with a plain header - icon, title, reference
// under it, close on the right - and the content below. Modules that grew
// their own gradient-banner popups (fuel, laundry) render through this so a
// fuel entry opens the way a trip or a voucher does.
export function RecordModal({ title, subtitle, icon, onClose, size = 'md', children }: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  onClose: () => void
  size?: 'md' | 'lg' | 'xl'
  children: ReactNode
}) {
  const width = size === 'xl' ? 'max-w-5xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-2xl'
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
        className={`bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] overflow-y-auto`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">{icon}{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-5">{children}</div>
      </motion.div>
    </motion.div>
  )
}

// One read-only value in a record's summary strip.
export function DetailField({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
      <p className={strong ? 'text-sm font-bold text-slate-900' : 'text-sm font-medium'}>{value ?? '—'}</p>
    </div>
  )
}

// The summary strip itself: a soft grey panel with the fields in a grid.
export function DetailGrid({ children, cols = 3 }: { children: ReactNode; cols?: 3 | 4 }) {
  return <div className={`grid grid-cols-2 ${cols === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 p-4 bg-slate-50 rounded-2xl`}>{children}</div>
}

export function RemarksBlock({ text }: { text: unknown }) {
  if (!text) return null
  return (
    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
      <p className="text-xs font-bold uppercase text-slate-500 mb-1">Remarks</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{String(text)}</p>
    </div>
  )
}

// Read-only Debit / Credit panels for a record's ledger rows, the way the
// Trip Expenses view popup lists them.
export function LedgerSideLists({ rows, nameKey = 'expensives', amountKey = 'amount', typeKey = 'account_type' }: {
  rows: Array<Record<string, unknown>>
  nameKey?: string
  amountKey?: string
  typeKey?: string
}) {
  const side = (type: 'Debit Account' | 'Credit Account') => rows.filter((r) => r[typeKey] === type)
  const panel = (label: string, tone: string, list: Array<Record<string, unknown>>) => (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className={`px-4 py-2 text-xs font-bold text-white ${tone}`}>{label}</div>
      <div className="divide-y divide-slate-100">
        {list.length === 0 && <div className="p-3 text-sm text-slate-400">No entries</div>}
        {list.map((item, i) => (
          <div key={i} className="flex justify-between px-4 py-2 text-sm">
            <span>{String(item[nameKey] ?? '')}</span><span className="font-semibold">₹{formatAmount(item[amountKey])}</span>
          </div>
        ))}
      </div>
    </div>
  )
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {panel('Debit Account', 'bg-blue-600', side('Debit Account'))}
      {panel('Credit Account', 'bg-emerald-600', side('Credit Account'))}
    </div>
  )
}
