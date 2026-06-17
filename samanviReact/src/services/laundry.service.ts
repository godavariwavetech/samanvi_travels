import api from '@/lib/api'
import { securePayload } from '@/lib/crypto'

export const laundryService = {
  // ── Vendor ───────────────────────────────────────────────
  getVendorDropdown: () => api.post('/getvendorlistlaundrydropdown', {}).then((r) => r.data),
  getVendorDetails: (data: unknown) => api.post('/getvendordata', data).then((r) => r.data),
  getSelectedVendor: (data: unknown) => api.post('/Selectedvendordropdownoption', data).then((r) => r.data),

  // ── Laundry Types (Masters) ──────────────────────────────
  getLaundryTypes: (data: unknown) =>
    api.post('/getlaundrytypemainmasters', securePayload(data)).then((r) => r.data),
  submitLaundryType: (data: unknown) =>
    api.post('/submitlaundrytypemainmasters', securePayload(data)).then((r) => r.data),

  // ── Laundry Entries ──────────────────────────────────────
  submitLaundry: (data: unknown) =>
    api.post('/submitlaundrydata', securePayload(data)).then((r) => r.data),
  updateLaundry: (data: unknown) =>
    api.post('/updateLaundryData', securePayload(data)).then((r) => r.data),
  updateLaundryAdminStatus: (data: unknown) =>
    api.post('/updatelaundryadminstatus', securePayload(data)).then((r) => r.data),

  // ── Laundry Bills ────────────────────────────────────────
  getLaundryBills: () => api.get('/getlaundrybilldata').then((r) => r.data),
  getLaundryBillSubData: (data: unknown) => api.post('/getlaundrybillsubdata', data).then((r) => r.data),
  submitLaundryBill: (data: unknown) =>
    api.post('/submitlaundryaddbill', securePayload(data)).then((r) => r.data),
  updateLaundryBill: (data: unknown) => api.post('/updateLaundryBill', data).then((r) => r.data),
  deleteLaundryBill: (data: unknown) =>
    api.post('/deletelaundrybill', securePayload(data)).then((r) => r.data),

  // ── Approved / Reports ───────────────────────────────────
  getLaundryApproved: () => api.get('/getlaundryapproveddata').then((r) => r.data),
  getLaundryReport: () => api.get('/getlaundryreportdata').then((r) => r.data),
  getLaundrySearch: (data: unknown) => api.post('/getlaundrysearchdata', data).then((r) => r.data),
}
