import api from '@/lib/api'
import { securePayload } from '@/lib/crypto'
import { useAuthStore } from '@/store/auth.store'

export const authService = {
  async getOtp(data: { number: string }) {
    const payload = securePayload(data)
    const res = await api.post('/getdashotp', payload)
    return res.data
  },

  async login(data: { phone: string; usr_pwd: string; rememberme: boolean }) {
    const payload = securePayload(data)
    const res = await api.post('/loginuser', payload)
    const { status, data: menu, usr_data, acstkn, message } = res.data

    if (status === 200 && menu?.length) {
      useAuthStore.getState().login(
        {
          id: usr_data[0].id,
          name: usr_data[0].name,
          number: usr_data[0].number,
          role_type: usr_data[0].role_type,
          department_id: usr_data[0].department_id,
          department_name: usr_data[0].department_name,
        },
        acstkn,
        menu
      )
      return { user: usr_data[0] }
    }
    if (status === 200 && !menu?.length) {
      throw new Error("You don't have permissions. Contact admin.")
    }
    throw new Error(message ?? 'Invalid credentials')
  },
}
