import api from '@/lib/api'
import { securePayload } from '@/lib/crypto'

export const garageService = {
  // ── Repair Entry ─────────────────────────────────────────
  getRepairEntries: (data: unknown) => api.post('/getrepairentry', securePayload(data)).then((r) => r.data),
  addRepairEntry: (data: unknown) => api.post('/addrepairentry', securePayload(data)).then((r) => r.data),
  editRepairEntry: (data: unknown) => api.post('/editrepairentry', securePayload(data)).then((r) => r.data),
  getPartsEntry: (data: unknown) => api.post('/getpartsentry', securePayload(data)).then((r) => r.data),
  submitRepairTracking: (data: unknown) =>
    api.post('/submitrepairtracking', securePayload(data)).then((r) => r.data),
  changeJobStatus: (data: unknown) => api.post('/changeJobSatus', securePayload(data)).then((r) => r.data),

  // ── Categories ───────────────────────────────────────────
  getCategories: () => api.get('/repair-category/getall').then((r) => r.data),
  addCategory: (data: unknown) => api.post('/repair-category/add', securePayload(data)).then((r) => r.data),
  editCategory: (data: unknown) => api.post('/repair-category/edit', securePayload(data)).then((r) => r.data),
  deleteCategory: (data: unknown) =>
    api.post('/repair-category/delete', securePayload(data)).then((r) => r.data),

  // ── Parts ────────────────────────────────────────────────
  getParts: () => api.get('/getallrepairparts').then((r) => r.data),
  addPart: (data: unknown) => api.post('/addrepairparts', securePayload(data)).then((r) => r.data),
  editPart: (data: unknown) => api.post('/editrepairparts', securePayload(data)).then((r) => r.data),
  deletePart: (data: unknown) => api.post('/deleterepairparts', securePayload(data)).then((r) => r.data),

  // ── Staff ────────────────────────────────────────────────
  getStaff: () => api.post('/getstaffdata', {}).then((r) => r.data),
}
