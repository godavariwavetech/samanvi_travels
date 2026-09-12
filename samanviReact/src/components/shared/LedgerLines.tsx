import { PlusCircle, MinusCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from './Input'
import { SearchableSelect } from './SearchableSelect'

// One side of a voucher - the Debit Accounts or Credit Accounts panel - laid
// out the way Trip Expenses and Voucher Entry lay it out: a coloured header
// with Add Row, one line per ledger with the ledger picker and the amount side
// by side, a remove control once there is more than one line, and the side's
// total underneath. Picking is checked as it happens, as those screens do: a
// ledger cannot appear twice on one side, nor on both sides of the same entry.
//
// The amount of a freshly picked ledger is filled with whatever still balances
// this side against the bill (`remaining`), so the usual single-ledger entry
// is one pick; an amount typed by hand is never touched.

export type LedgerLike = { id: number; temple_name?: string; subchildtwo?: string; [key: string]: unknown }
// `auto` marks an amount the panel filled in itself (on pick); such a row keeps
// following the bill through syncAutoLedgerLines until the user types over it.
export type LedgerLine<L extends LedgerLike = LedgerLike> = { ledger: L | null; amount: string; auto?: boolean }

export const emptyLedgerLine = <L extends LedgerLike>(): LedgerLine<L> => ({ ledger: null, amount: '' })
export const filledLedgerLines = <L extends LedgerLike>(rows: LedgerLine<L>[]) => rows.filter((r) => r.ledger && Number(r.amount) > 0)
export const ledgerLinesTotal = <L extends LedgerLike>(rows: LedgerLine<L>[]) => rows.reduce((s, r) => s + (r.ledger ? Number(r.amount || 0) : 0), 0)
export const ledgerLineLabel = (l: LedgerLike) => l.temple_name || l.subchildtwo || `Ledger #${l.id}`

// Re-derive the auto row from the bill. The auto row is the last row the form
// filled in itself - or, before anything is picked, the last untouched empty
// row - so the amount is on screen the moment the bill is known, whichever
// order the user works in, and takes what the other rows leave. Hand-typed
// rows are never touched; with no bill yet the row is left blank, not 0.00.
const isAutoRow = <L extends LedgerLike>(r: LedgerLine<L>) => r.auto === true || (!r.ledger && r.amount === '')
export const syncAutoLedgerLines = <L extends LedgerLike>(rows: LedgerLine<L>[], bill: number): LedgerLine<L>[] => {
  const last = rows.map((r, i) => (isAutoRow(r) ? i : -1)).filter((i) => i >= 0).pop()
  if (last === undefined) return rows
  const others = rows.reduce((s, r, i) => s + (i !== last && r.ledger ? Number(r.amount || 0) : 0), 0)
  const left = bill - others
  const amount = left > 0.004 ? left.toFixed(2) : ''
  // A row that is already auto stays auto even while the bill is still zero,
  // so it fills in the moment the bill appears.
  const auto = rows[last].auto === true || amount !== ''
  if (rows[last].amount === amount && (rows[last].auto === true) === auto) return rows
  return rows.map((r, i) => (i === last ? { ...r, amount, auto } : r))
}
// A line that has a ledger but no amount, or an amount but no ledger, is a
// mistake rather than an empty line; callers refuse to save while one exists.
export const halfFilledLedgerLine = <L extends LedgerLike>(rows: LedgerLine<L>[]) =>
  rows.some((r) => (r.ledger && !(Number(r.amount) > 0)) || (!r.ledger && String(r.amount ?? '').trim() !== ''))

interface LedgerLinesProps<L extends LedgerLike> {
  side: 'debit' | 'credit'
  rows: LedgerLine<L>[]
  onChange: (rows: LedgerLine<L>[]) => void
  ledgers: L[]
  /** The other side's lines, so a ledger is refused on both sides at once. */
  otherRows: LedgerLine<L>[]
  /** What this side still needs to balance against the bill; fills a new pick's amount. */
  remaining: number
  onReload?: () => void
  reloading?: boolean
}

export function LedgerLines<L extends LedgerLike>({ side, rows, onChange, ledgers, otherRows, remaining, onReload, reloading }: LedgerLinesProps<L>) {
  const isDebit = side === 'debit'
  const options = ledgers.map((l) => ({ value: String(l.id), label: ledgerLineLabel(l) }))
  const total = ledgerLinesTotal(rows)
  const lines = rows.length ? rows : [emptyLedgerLine<L>()]

  const pick = (index: number, id: string) => {
    const chosen = ledgers.find((l) => String(l.id) === id) || null
    if (!chosen) { onChange(lines.map((r, i) => (i === index ? { ...r, ledger: null } : r))); return }
    const name = ledgerLineLabel(chosen)
    if (lines.some((r, i) => i !== index && r.ledger && String(r.ledger.id) === id)) {
      toast.error(`"${name}" is already added in ${isDebit ? 'Debit' : 'Credit'} Accounts`)
      return
    }
    if (otherRows.some((r) => r.ledger && String(r.ledger.id) === id)) {
      toast.error(`"${name}" is already used in ${isDebit ? 'Credit' : 'Debit'} Accounts — the same ledger can't be on both sides`)
      return
    }
    onChange(lines.map((r, i) => {
      if (i !== index) return r
      // Swapping the account on a line that already has one: only the ledger
      // changes, so the amount stays exactly as it is (and keeps following the
      // bill if the panel filled it). Re-deriving it here read `remaining`
      // with this line's own amount already counted against the bill, so
      // changing a picked ledger emptied the amount beside it.
      if (r.ledger) return { ...r, ledger: chosen }
      if (r.amount !== '' && !r.auto) return { ...r, ledger: chosen }
      // Filled in by the panel, so it stays live against the bill (see syncAutoLedgerLines).
      return { ledger: chosen, amount: remaining > 0 ? remaining.toFixed(2) : '', auto: true }
    }))
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-2 ${isDebit ? 'bg-blue-600' : 'bg-emerald-600'}`}>
        <span className="text-xs font-bold text-white">{isDebit ? 'Debit Accounts' : 'Credit Accounts'}</span>
        <button type="button" onClick={() => onChange([...lines, emptyLedgerLine<L>()])}
          className={`inline-flex items-center gap-1 text-xs font-bold hover:text-white transition-colors ${isDebit ? 'text-blue-100' : 'text-emerald-100'}`}>
          <PlusCircle className="w-3.5 h-3.5" /> Add Row
        </button>
      </div>
      <div className="p-3 space-y-2">
        {lines.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <div className="flex-[3] min-w-0">
              <SearchableSelect
                value={row.ledger ? String(row.ledger.id) : ''}
                onChange={(v) => pick(i, v)}
                onClear={() => onChange(lines.map((r, idx) => (idx === i ? { ...r, ledger: null } : r)))}
                options={options} placeholder="Select Ledger" onReload={onReload} reloading={reloading}
              />
            </div>
            <div className="flex-[2] min-w-0">
              <Input type="number" placeholder="Amount" value={row.amount}
                onChange={(e) => onChange(lines.map((r, idx) => (idx === i ? { ...r, amount: e.target.value, auto: false } : r)))} />
            </div>
            {lines.length > 1 && (
              <button type="button" onClick={() => onChange(lines.filter((_, idx) => idx !== i))}
                className="text-slate-400 hover:text-red-500 p-1 transition-colors" title="Remove row">
                <MinusCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
        {total > 0 && (
          <div className={`text-right text-xs font-extrabold pt-1 ${isDebit ? 'text-blue-700' : 'text-emerald-700'}`}>
            Total: ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
      </div>
    </div>
  )
}
