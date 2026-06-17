import api from '@/lib/api'
import { securePayload } from '@/lib/crypto'

export const mastersService = {
  // ── Vehicle Types ─────────────────────────────────────────
  getVehicleTypes: () => api.get('/getvehicletypes').then((r) => r.data),
  addVehicleType: (data: unknown) => api.post('/addvehicletype', securePayload(data)).then((r) => r.data),
  deleteVehicleType: (data: unknown) => api.post('/deletevehicletype', securePayload(data)).then((r) => r.data),

  // ── Bus Numbers ──────────────────────────────────────────
  getBuses: () => api.post('/getbussesdata', {}).then((r) => r.data),
  addBus: (data: unknown) => api.post('/addNewbusnum', securePayload(data)).then((r) => r.data),
  updateBus: (data: unknown) => api.post('/updatebusnumber', securePayload(data)).then((r) => r.data),
  deleteBus: (data: unknown) => api.post('/deletebusnumber', securePayload(data)).then((r) => r.data),

  // ── Service For (driverone routes) ───────────────────────
  getServiceRoutes: () => api.post('/getdriveone', {}).then((r) => r.data),
  addServiceRoute: (data: unknown) => api.post('/driverone', securePayload(data)).then((r) => r.data),
  updateServiceRoute: (data: unknown) => api.post('/updateserviceno', data).then((r) => r.data),  // plain JSON — controller reads req.body directly
  deleteServiceRoute: (data: unknown) => api.post('/deletedriverone', securePayload(data)).then((r) => r.data),

  // ── Service Numbers ──────────────────────────────────────
  getServiceNumbers: () => api.post('/getservicenumberdata', {}).then((r) => r.data),
  addServiceNumber: (data: unknown) => api.post('/addservicenumner', securePayload(data)).then((r) => r.data),
  updateServiceNumber: (data: unknown) => api.post('/updateservicenumber', data).then((r) => r.data),  // plain JSON — controller reads req.body directly
  deleteServiceNumber: (data: unknown) => api.post('/deleteservicenumber', securePayload(data)).then((r) => r.data),

  // ── Staff ────────────────────────────────────────────────
  getStaff: (data: unknown) => api.post('/getallstfdrivhelp', data).then((r) => r.data),
  getActiveStaff: () => api.post('/gethelper', securePayload({ staffreports: 'Staff' })).then((r) => r.data),
  getActiveHelpers: () => api.post('/gethelper', securePayload({ staffreports: 'Helper' })).then((r) => r.data),
  addStaff: (data: unknown) => api.post('/addstaffregister', data).then((r) => r.data),
  editStaff: (data: unknown) => api.post('/addstaffedit', securePayload(data)).then((r) => r.data),
  deleteStaff: (data: unknown) => api.post('/deletestaffdata', securePayload(data)).then((r) => r.data),

  // ── Staff Types ──────────────────────────────────────────
  getStaffTypes: () => api.get('/getstafftypes').then((r) => r.data),
  addStaffType: (data: unknown) => api.post('/addstafftype', securePayload(data)).then((r) => r.data),
  deleteStaffType: (data: unknown) => api.post('/deletestafftype', securePayload(data)).then((r) => r.data),

  // ── Terminate / Rejoin ───────────────────────────────────
  terminateStaff: (data: unknown) => api.post('/terminatestaff', securePayload(data)).then((r) => r.data),
  rejoinStaff: (data: unknown) => api.post('/rejoinstaff', securePayload(data)).then((r) => r.data),
  getTerminatedStaff: () => api.get('/getterminatedstaff').then((r) => r.data),

  // ── Drivers ──────────────────────────────────────────────
  getDrivers: () => api.post('/getalldrivers', {}).then((r) => r.data),
  addDriver: (data: unknown) => api.post('/adddriverregister', data).then((r) => r.data),
  editDriver: (data: unknown) => api.post('/adddriveredit', securePayload(data)).then((r) => r.data),
  deleteDriver: (data: unknown) => api.post('/deletedriverdata', securePayload(data)).then((r) => r.data),

  // ── Helpers ──────────────────────────────────────────────
  getHelper: (data: unknown) => api.post('/gethelper', securePayload(data)).then((r) => r.data),
  addHelper: (data: unknown) => api.post('/addhelperregister', data).then((r) => r.data),
  editHelper: (data: unknown) => api.post('/edithelperregister', securePayload(data)).then((r) => r.data),
  deleteHelper: (data: unknown) => api.post('/deletehelperdata', securePayload(data)).then((r) => r.data),

  // ── Departments ──────────────────────────────────────────
  getDepartments: () => api.post('/getdepartmentData', {}).then((r) => r.data),

  // ── Spare Tank ───────────────────────────────────────────
  getSpareTanks: () => api.post('/getbussessparetankdata', {}).then((r) => r.data),
  addSpareTank: (data: unknown) => api.post('/addsparetankbusno', data).then((r) => r.data),
}
