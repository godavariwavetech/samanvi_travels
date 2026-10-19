// Shared Dr/Cr ledger-balance formatting — lifted out of LedgerWisePage.tsx since
// TripCreationPage's Paid-To balance badge needs the same convention.

export function signedBalance(ob: { type?: string; amount?: number } | null | undefined): number {
  if (!ob) return 0
  if (ob.type === 'Debit') return Math.abs(Number(ob.amount) || 0)
  if (ob.type === 'Credit') return -Math.abs(Number(ob.amount) || 0)
  return 0
}

// Indian digit grouping (1,23,456.00), always two decimals.
export function fmtAmount(n: number): string {
  return (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function balStr(b: number): string {
  return b >= 0 ? `${fmtAmount(b)} Dr` : `${fmtAmount(Math.abs(b))} Cr`
}

export function balCls(b: number): string {
  return b >= 0 ? 'text-slate-700' : 'text-red-500'
}
