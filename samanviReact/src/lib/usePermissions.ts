import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { useAuthStore } from '@/store/auth.store'
import { permissionsFor } from './access'

export function usePermissions(pathname?: string) {
  const location = useLocation()
  const menu = useAuthStore(s => s.menu)
  const roleId = useAuthStore(s => s.user?.role_id)
  const role = useAuthStore(s => s.user?.role_id != null
    ? s.user.role_name === 'Super Admin'
    : s.user?.role_type === 0 || String(s.user?.role_type) === '0')
  const path = pathname ?? location.pathname
  return useMemo(() => {
    const rights = permissionsFor(path, menu)
    const voucherPath = ['/accounting/voucher', '/accounting/voucher-approvals', '/accounting/approved'].includes(path.toLowerCase().replace(/\/+$/, ''))
    const canAuthorize = roleId != null && [1, 2].includes(Number(roleId)) ? false : rights.canAuthorize
    const roleRights = { ...rights, canAuthorize }
    return voucherPath && role ? { ...roleRights, canEdit: true } : roleRights
  }, [path, menu, role, roleId])
}
