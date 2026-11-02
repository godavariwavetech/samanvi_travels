import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { useAuthStore } from '@/store/auth.store'
import { permissionsFor } from './access'

export function usePermissions(pathname?: string) {
  const location = useLocation()
  const menu = useAuthStore(s => s.menu)
  const roleId = useAuthStore(s => s.user?.role_id)
  // Super Admin is role ID 5 (or legacy role_type 0 with no role ID) - the same
  // test the server and useCanReviseApproved use, not the role's display name.
  const role = useAuthStore(s => s.user?.role_id != null && String(s.user.role_id).trim() !== ''
    ? Number(s.user.role_id) === 5
    : s.user?.role_type !== null && s.user?.role_type !== undefined && String(s.user.role_type).trim() !== '' && Number(s.user.role_type) === 0)
  const path = pathname ?? location.pathname
  return useMemo(() => {
    const rights = permissionsFor(path, menu)
    const voucherPath = ['/accounting/voucher', '/accounting/voucher-approvals', '/accounting/approved'].includes(path.toLowerCase().replace(/\/+$/, ''))
    const canAuthorize = roleId != null && [1, 2].includes(Number(roleId)) ? false : rights.canAuthorize
    const roleRights = { ...rights, canAuthorize }
    // Super Admin can always edit, approve and reject on Trip Approvals, even when
    // the menu grant for that screen carries no approve/edit flag.
    const superAdminPath = ['/trips/approvals', '/fuel/entry', '/laundry/bill'].includes(path.toLowerCase().replace(/\/+$/, ''))
    if (superAdminPath && role && rights.canView) return { ...roleRights, canEdit: true, canApprove: true }
    return voucherPath && role ? { ...roleRights, canEdit: true } : roleRights
  }, [path, menu, role, roleId])
}
