import { useAuthStore } from '@/store/auth.store'

// Approved vouchers are locked; only these users may revert them to pending or
// edit them: the listed login mobile numbers, and every Super Admin
// (role_type 0). Mirrors samanviBackend/utils/approvedVouchers.js, which
// enforces it — this only decides whether the buttons show.
const APPROVED_EDITOR_NUMBERS = ['7032285554'] // DSP

export function useCanReviseApproved(): boolean {
  const user = useAuthStore(s => s.user)
  if (!user) return false
  const role = user.role_type as unknown
  if (role !== null && role !== undefined && String(role).trim() !== '' && Number(role) === 0) return true
  return !!user.number && APPROVED_EDITOR_NUMBERS.includes(String(user.number).trim())
}
