import { useAuthStore } from '@/store/auth.store'

// Approved vouchers are locked; only these users (by login mobile number) may
// revert them to pending or edit them. Mirrors samanviBackend/utils/approvedVouchers.js,
// which enforces it — this only decides whether the buttons show.
const APPROVED_EDITOR_NUMBERS = ['7032285554'] // DSP

export function useCanReviseApproved(): boolean {
  const number = useAuthStore(s => s.user?.number)
  return !!number && APPROVED_EDITOR_NUMBERS.includes(String(number).trim())
}
