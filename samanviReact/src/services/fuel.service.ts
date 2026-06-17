import api from '@/lib/api'
import { securePayload } from '@/lib/crypto'

export const fuelService = {
  // ── Fuel Entry ───────────────────────────────────────────
  getFuelEntries: () => api.get('/getfuelentrydata').then((r) => r.data),
  getFuelApproved: () => api.get('/getfuelentryapproveddata').then((r) => r.data),
  submitFuelEntry: (data: unknown) =>
    api.post('/submitfuelentery', securePayload(data)).then((r) => r.data),
  updateFuelEntry: (data: unknown) =>
    api.post('/updatefuelenterydata', securePayload(data)).then((r) => r.data),
  deleteFuelEntry: (data: unknown) =>
    api.post('/deletefueldata', securePayload(data)).then((r) => r.data),
  updateFuelAdminStatus: (data: unknown) =>
    api.post('/updatefueladminstatus', securePayload(data)).then((r) => r.data),
  getFuelSearchData: (data: unknown) => api.post('/getfuelentrysearchdata', data).then((r) => r.data),

  // ── Fuel Target ──────────────────────────────────────────
  getFuelTarget: (data: unknown) =>
    api.post('/getfueltargetdata', securePayload(data)).then((r) => r.data),
  submitTarget: (data: unknown) => api.post('/submittarget', data).then((r) => r.data),
  editFuelTarget: (data: unknown) =>
    api.post('/editfueltarget', securePayload(data)).then((r) => r.data),

  // ── Reports ──────────────────────────────────────────────
  getDayWiseReports: (data: unknown) => api.post('/getdaywisereport', data).then((r) => r.data),
  getStationWiseReports: (data: unknown) => api.post('/getstationwisereport', data).then((r) => r.data),
  getBusWiseReports: (data: unknown) => api.post('/getbuswisewisereports', data).then((r) => r.data),
  getBusPerformanceReports: (data: unknown) => api.post('/getbusperormancereports', data).then((r) => r.data),
  getDriverPerformanceReports: (data: unknown) =>
    api.post('/getdriverperormancereports', data).then((r) => r.data),
  getTargetReports: (data: unknown) => api.post('/gettargetreports', data).then((r) => r.data),
  getTopPerformers: (data: unknown) => api.post('/gettopperormancereports', data).then((r) => r.data),
  getFuelAccounts: (data: unknown) => api.post('/getfuelaccountsdata', data).then((r) => r.data),

  // ── Dropdowns ────────────────────────────────────────────
  getBusNumbers: () => api.post('/getbusnumber', {}).then((r) => r.data),
  getDriverNames: () => api.post('/getdrivername', {}).then((r) => r.data),
  getFuelLedgerName: () => api.post('/getfuelledgername', {}).then((r) => r.data),
  getVehicleDetails: (data: unknown) =>
    api.post('/getVehicleDetails', securePayload(data)).then((r) => r.data),
}
