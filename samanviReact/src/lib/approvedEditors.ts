import { useAuthStore } from '@/store/auth.store'

// Approved vouchers are locked; only these users may revert them to pending or
// edit them: the listed login mobile numbers, and every Super Admin
// (role ID 5, or legacy role_type 0 when no role ID is present). Mirrors
// samanviBackend/utils/approvedVouchers.js, which
// enforces it — this only decides whether the buttons show.
const APPROVED_EDITOR_NUMBERS = ['7032285554'] // DSP

export function useCanReviseApproved(): boolean {
  const user = useAuthStore(s => s.user)
  if (!user) return false
  const roleId = user.role_id as unknown
  const isSuperAdmin = roleId !== null && roleId !== undefined && String(roleId).trim() !== ''
    ? Number(roleId) === 5
    : user.role_type !== null && user.role_type !== undefined && String(user.role_type).trim() !== '' && Number(user.role_type) === 0
  if (isSuperAdmin) return true
  return !!user.number && APPROVED_EDITOR_NUMBERS.includes(String(user.number).trim())
}
