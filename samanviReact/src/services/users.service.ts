import api from '@/lib/api'
import { securePayload } from '@/lib/crypto'

export const usersService = {
  getUsers: () => api.get('/getallusers').then((r) => r.data),
  createUser: (data: unknown) =>
    api.post('/createuserpermissions', securePayload(data)).then((r) => r.data),
  getUserModules: (data: unknown) =>
    api.post('/get_user_moduleslist', securePayload(data)).then((r) => r.data),
  getUserMainModules: (data: unknown) =>
    api.post('/getusermainmodules', securePayload(data)).then((r) => r.data),
  getEditUserModules: (data: unknown) =>
    api.post('/geteditusermoduleslist', securePayload(data)).then((r) => r.data),
  saveUserMenuList: (data: unknown) =>
    api.post('/postusermenulist', securePayload(data)).then((r) => r.data),
  getUserMenuList: (data: unknown) =>
    api.post('/getusermoduleslist', securePayload(data)).then((r) => r.data),
  updateUser: (data: unknown) =>
    api.post('/updateuser', securePayload(data)).then((r) => r.data),
  // The backend route is a GET that soft-deletes (d_in = 1).
  deleteUser: (id: string | number) => api.get(`/deleteUsers/${id}`).then((r) => r.data),
}
