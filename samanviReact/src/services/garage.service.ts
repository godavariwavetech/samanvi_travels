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
  jobWorkflowAction: (data: unknown) => api.post('/garage/workflow-action', securePayload(data)).then((r) => r.data),
  getJobApprovalHistory: (data: unknown) => api.post('/garage/job-approval-history', securePayload(data)).then((r) => r.data),
  getJobCategories: (data: unknown) => api.post('/garage/job-categories', securePayload(data)).then((r) => r.data),
  editJob: (data: unknown) => api.post('/garage/edit-job', securePayload(data)).then((r) => r.data),
  updateJobVoucher: (data: unknown) => api.post('/updatejobvoucher', securePayload(data)).then((r) => r.data),
  checkJobPermission: (data: unknown) => api.post('/garage/check-permission', securePayload(data)).then((r) => r.data),

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
  editPartPrice: (data: unknown) => api.post('/parts/edit-price', securePayload(data)).then((r) => r.data),
  getPartPriceHistory: (data: unknown) => api.post('/parts/price-history', securePayload(data)).then((r) => r.data),

  // ── Staff & Drivers ──────────────────────────────────────
  getStaff: () => api.post('/getstaffdata', {}).then((r) => r.data),
  getDriversList: () => api.post('/getalldrivers', {}).then((r) => r.data),

  // ── Service Reminders ───────────────────────────────────
  getServiceReminders: () => api.get('/service-reminders/getall').then((r) => r.data),
  addServiceReminder: (data: unknown) => api.post('/service-reminders/add', securePayload(data)).then((r) => r.data),
  editServiceReminder: (data: unknown) => api.post('/service-reminders/edit', securePayload(data)).then((r) => r.data),
  completeServiceReminder: (data: unknown) => api.post('/service-reminders/complete', securePayload(data)).then((r) => r.data),
  deleteServiceReminder: (data: unknown) => api.post('/service-reminders/delete', securePayload(data)).then((r) => r.data),

  // ── Tyre Inventory ───────────────────────────────────────
  getTyreInventory: () => api.get('/tyre-inventory/getall').then((r) => r.data),
  addTyre: (data: unknown) => api.post('/tyre-inventory/add', securePayload(data)).then((r) => r.data),
  editTyre: (data: unknown) => api.post('/tyre-inventory/edit', securePayload(data)).then((r) => r.data),
  deleteTyre: (data: unknown) => api.post('/tyre-inventory/delete', securePayload(data)).then((r) => r.data),

  // ── Tyre Position ────────────────────────────────────────
  getTyrePositions: () => api.get('/tyre-position/getall').then((r) => r.data),
  assignTyrePosition: (data: unknown) => api.post('/tyre-position/assign', securePayload(data)).then((r) => r.data),
  removeTyrePosition: (data: unknown) => api.post('/tyre-position/remove', securePayload(data)).then((r) => r.data),

  // ── Battery Management ───────────────────────────────────
  getBatteries: () => api.get('/battery/getall').then((r) => r.data),
  addBattery: (data: unknown) => api.post('/battery/add', securePayload(data)).then((r) => r.data),
  editBattery: (data: unknown) => api.post('/battery/edit', securePayload(data)).then((r) => r.data),
  deleteBattery: (data: unknown) => api.post('/battery/delete', securePayload(data)).then((r) => r.data),
}
