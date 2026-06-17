import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: number
  name: string
  number: string
  role_type: number
  department_id: number
  department_name: string
}

export interface MenuItem {
  id: number
  module_id: number
  module_nm: string
  main_icon: string
  path: string
  submenu: SubMenuItem[]
}

export interface SubMenuItem {
  id: number
  module_id: number
  sub_nm: string
  path: string
  can_add: number
  can_edit: number
  can_view: number
  can_delete: number
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  menu: MenuItem[]
  isAuthenticated: boolean
  login: (user: AuthUser, token: string, menu: MenuItem[]) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      menu: [],
      isAuthenticated: false,
      login: (user, token, menu) => {
        localStorage.setItem('acstkn', token)
        localStorage.setItem('user_id', String(user.id))
        localStorage.setItem('usr_nm', user.name)
        localStorage.setItem('role_type', String(user.role_type))
        localStorage.setItem('department_id', String(user.department_id))
        localStorage.setItem('department_name', user.department_name)
        set({ user, token, menu, isAuthenticated: true })
      },
      logout: () => {
        localStorage.clear()
        set({ user: null, token: null, menu: [], isAuthenticated: false })
      },
    }),
    { name: 'samanvi-auth' }
  )
)
