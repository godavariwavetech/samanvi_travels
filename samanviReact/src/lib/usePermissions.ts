import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { useAuthStore } from '@/store/auth.store'
import { permissionsFor } from './access'

export function usePermissions(pathname?: string) {
  const location = useLocation()
  const menu = useAuthStore(s => s.menu)
  const path = pathname ?? location.pathname
  return useMemo(() => permissionsFor(path, menu), [path, menu])
}
