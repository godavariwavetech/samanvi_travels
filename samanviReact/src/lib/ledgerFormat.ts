// Shared Dr/Cr ledger-balance formatting — lifted out of LedgerWisePage.tsx since
// TripCreationPage's Paid-To balance badge needs the same convention.

export function signedBalance(ob: { type?: string; amount?: number } | null | undefined): number {
  if (!ob) return 0
  if (ob.type === 'Debit') return Math.abs(Number(ob.amount) || 0)
  if (ob.type === 'Credit') return -Math.abs(Number(ob.amount) || 0)
  return 0
}

export function balStr(b: number): string {
  return b >= 0 ? `${b.toFixed(2)} Dr` : `${Math.abs(b).toFixed(2)} Cr`
}

export function balCls(b: number): string {
  return b >= 0 ? 'text-slate-700' : 'text-red-500'
}
