import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { useAuthStore } from '@/store/auth.store'
import { permissionsFor } from './access'

export function usePermissions(pathname?: string) {
  const location = useLocation()
  const menu = useAuthStore(s => s.menu)
  const role = useAuthStore(s => s.user?.role_type)
  const path = pathname ?? location.pathname
  return useMemo(() => {
    const rights = permissionsFor(path, menu)
    const voucherPath = ['/accounting/voucher', '/accounting/voucher-approvals', '/accounting/approved'].includes(path.toLowerCase().replace(/\/+$/, ''))
    return voucherPath && (role === 0 || String(role) === '0') ? { ...rights, canEdit: true } : rights
  }, [path, menu, role])
}
