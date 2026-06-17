export interface FinancialYear {
  label: string      // "FY 2025-26"
  shortLabel: string // "2025-26"
  fromDate: string   // "2025-04-01"
  toDate: string     // "2026-03-31"
  startYear: number  // 2025
}

function buildFY(startYear: number): FinancialYear {
  const endYear = startYear + 1
  return {
    label: `FY ${startYear}-${String(endYear).slice(-2)}`,
    shortLabel: `${startYear}-${String(endYear).slice(-2)}`,
    fromDate: `${startYear}-04-01`,
    toDate: `${endYear}-03-31`,
    startYear,
  }
}

export function getCurrentFY(): FinancialYear {
  const now = new Date()
  // April (month index 3) starts the new FY
  const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return buildFY(startYear)
}

// Returns current FY + previous `extra` years, newest first
export function getFYList(extra = 4): FinancialYear[] {
  const current = getCurrentFY()
  return Array.from({ length: extra + 1 }, (_, i) => buildFY(current.startYear - i))
}
