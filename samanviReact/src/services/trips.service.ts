import api from '@/lib/api'
import { securePayload } from '@/lib/crypto'

export const tripsService = {
  // ── Trip Creation ────────────────────────────────────────
  getTrips: () => api.get('/gettripceated').then((r) => r.data),
  getTrips1: () => api.post('/gettripceated1', {}).then((r) => r.data),
  createTrip: (data: unknown) => api.post('/tripcreated', data).then((r) => r.data),
  deleteTrip: (data: unknown) => api.post('/deletetripcreated', data).then((r) => r.data),

  // ── Trip Status ──────────────────────────────────────────
  updateTripAdminStatus: (data: unknown) =>
    api.post('/updatetripadminstatus', securePayload(data)).then((r) => r.data),

  // ── Expenses ─────────────────────────────────────────────
  getExpenses: (data: unknown) => api.post('/getexpenses', data).then((r) => r.data),
  addExpenses: (data: unknown) => api.post('/addexpensesdetails', data).then((r) => r.data),
  updateExpenses: (data: unknown) => api.post('/updateexpensesdetails', data).then((r) => r.data),
  deleteExpense: (data: unknown) => api.post('/deleteexpense', data).then((r) => r.data),
  getExpensesFilter: (data: unknown) => api.post('/getexpensesfiltere', data).then((r) => r.data),

  // ── Trip Logs ────────────────────────────────────────────
  getTripLogsCount: () => api.post('/gettriplogscount', {}).then((r) => r.data),
  getTripUpdatedLogs: () => api.post('/gettripupdatedlogs', {}).then((r) => r.data),
  getTripDeletedLogs: () => api.post('/gettripdeletedlogs', {}).then((r) => r.data),

  // ── Modal Data ───────────────────────────────────────────
  getTripModalData: (data: unknown) => api.post('/getmodaldata', data).then((r) => r.data),
  getTripDeletedModal: (data: unknown) => api.post('/gettripdeletedmodaldata', data).then((r) => r.data),
  getTripUpdatedModal: (data: unknown) => api.post('/gettripupdatedmodaldata', securePayload(data)).then((r) => r.data),

  // ── Admin Approval ───────────────────────────────────────
  getAdminStatusCount: () => api.post('/getadminstatuscount', {}).then((r) => r.data),
  getAdminApproved: () => api.post('/getadminapproved', {}).then((r) => r.data),
  getAdminRejected: () => api.post('/getadminrejected', {}).then((r) => r.data),

  // ── Reports ──────────────────────────────────────────────
  getExpensesReport: (data: unknown) => api.post('/getexpensesreport', data).then((r) => r.data),
  getExpensesReportFilter: (data: unknown) => api.post('/getexpensesreportsfiltere', data).then((r) => r.data),
  getPatientDiagnosticTests: (data: unknown) => api.post('/getpatientDiagnosticTests', data).then((r) => r.data),

  // ── Dropdown helpers ─────────────────────────────────────
  getServiceForDropdown: () => api.post('/getserviceforreportdropdown', {}).then((r) => r.data),
  getBeta: (data: unknown) => api.post('/getbeta', data).then((r) => r.data),
  getPdfPatchData: (data: unknown) => api.post('/getpdfpatchdata1', securePayload(data)).then((r) => r.data),
  getBetaData: (data: unknown) => api.post('/getbetadata', securePayload(data)).then((r) => r.data),
}
