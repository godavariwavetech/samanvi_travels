import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getCurrentFY, type FinancialYear } from '@/lib/fy'

interface FYState {
  selectedFY: FinancialYear
  setFY: (fy: FinancialYear) => void
}

export const useFYStore = create<FYState>()(
  persist(
    (set) => ({
      selectedFY: getCurrentFY(),
      setFY: (fy) => set({ selectedFY: fy }),
    }),
    { name: 'samanvi-fy' }
  )
)
