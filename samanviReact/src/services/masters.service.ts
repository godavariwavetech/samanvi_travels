import api from '@/lib/api'
import { securePayload } from '@/lib/crypto'

export const mastersService = {
  // ── Vehicle Types ─────────────────────────────────────────
  getVehicleTypes: () => api.get('/getvehicletypes').then((r) => r.data),
  addVehicleType: (data: unknown) => api.post('/addvehicletype', securePayload(data)).then((r) => r.data),
  deleteVehicleType: (data: unknown) => api.post('/deletevehicletype', securePayload(data)).then((r) => r.data),

  // ── Vehicle Companies ─────────────────────────────────────
  getVehicleCompanies: () => api.get('/getvehiclecompanies').then((r) => r.data),
  addVehicleCompany: (data: unknown) => api.post('/addvehiclecompany', securePayload(data)).then((r) => r.data),
  deleteVehicleCompany: (data: unknown) => api.post('/deletevehiclecompany', securePayload(data)).then((r) => r.data),

  // ── Seating Capacities ────────────────────────────────────
  getSeatingCapacities: () => api.get('/getseatingcapacities').then((r) => r.data),
  addSeatingCapacity: (data: unknown) => api.post('/addseatingcapacity', securePayload(data)).then((r) => r.data),
  deleteSeatingCapacity: (data: unknown) => api.post('/deleteseatingcapacity', securePayload(data)).then((r) => r.data),

  // ── Chassis Models ─────────────────────────────────────────
  getChassisModels: () => api.get('/getchassismodels').then((r) => r.data),
  addChassisModel: (data: unknown) => api.post('/addchassismodel', securePayload(data)).then((r) => r.data),
  deleteChassisModel: (data: unknown) => api.post('/deletechassismodel', securePayload(data)).then((r) => r.data),

  // ── Body Builders ──────────────────────────────────────────
  getBodyBuilders: () => api.get('/getbodybuilders').then((r) => r.data),
  addBodyBuilder: (data: unknown) => api.post('/addbodybuilder', securePayload(data)).then((r) => r.data),
  deleteBodyBuilder: (data: unknown) => api.post('/deletebodybuilder', securePayload(data)).then((r) => r.data),

  // ── Luxury Types ─────────────────────────────────────────────
  getLuxuryTypes: () => api.get('/getluxurytypes').then((r) => r.data),
  addLuxuryType: (data: unknown) => api.post('/addluxurytype', securePayload(data)).then((r) => r.data),
  deleteLuxuryType: (data: unknown) => api.post('/deleteluxurytype', securePayload(data)).then((r) => r.data),

  // ── Mfg Years ──────────────────────────────────────────────────
  getMfgYears: () => api.get('/getmfgyears').then((r) => r.data),
  addMfgYear: (data: unknown) => api.post('/addmfgyear', securePayload(data)).then((r) => r.data),
  deleteMfgYear: (data: unknown) => api.post('/deletemfgyear', securePayload(data)).then((r) => r.data),

  // ── City List ──────────────────────────────────────────────────
  getCityList: () => api.get('/getcitylist').then((r) => r.data),
  addCityList: (data: unknown) => api.post('/addcitylist', securePayload(data)).then((r) => r.data),
  deleteCityList: (data: unknown) => api.post('/deletecitylist', securePayload(data)).then((r) => r.data),

  // ── Boarding Points ───────────────────────────────────────────
  getBoardingPoints: () => api.get('/getboardingpoints').then((r) => r.data),
  addBoardingPoint: (data: unknown) => api.post('/addboardingpoint', securePayload(data)).then((r) => r.data),
  deleteBoardingPoint: (data: unknown) => api.post('/deleteboardingpoint', securePayload(data)).then((r) => r.data),

  // ── Bus Operators ─────────────────────────────────────────────
  getBusOperators: () => api.get('/getbusoperators').then((r) => r.data),
  addBusOperator: (data: unknown) => api.post('/addbusoperator', securePayload(data)).then((r) => r.data),
  deleteBusOperator: (data: unknown) => api.post('/deletebusoperator', securePayload(data)).then((r) => r.data),

  // ── Line Codes ─────────────────────────────────────────────────
  getLineCodes: () => api.get('/getlinecodes').then((r) => r.data),
  addLineCode: (data: unknown) => api.post('/addlinecode', securePayload(data)).then((r) => r.data),
  deleteLineCode: (data: unknown) => api.post('/deletelinecode', securePayload(data)).then((r) => r.data),

  // ── Route IDs ──────────────────────────────────────────────────
  getRouteIds: () => api.get('/getrouteids').then((r) => r.data),
  addRouteId: (data: unknown) => api.post('/addrouteid', securePayload(data)).then((r) => r.data),
  deleteRouteId: (data: unknown) => api.post('/deleterouteid', securePayload(data)).then((r) => r.data),

  // ── Bus Numbers ──────────────────────────────────────────
  getBuses: () => api.post('/getbussesdata', {}).then((r) => r.data),
  addBus: (data: unknown) => api.post('/addNewbusnum', securePayload(data)).then((r) => r.data),
  updateBus: (data: unknown) => api.post('/updatebusnumber', securePayload(data)).then((r) => r.data),
  getBusHistory: (data: unknown) => api.post('/getbushistory', data).then((r) => r.data),
  updateBusValidityDate: (data: unknown) => api.post('/updatebusvaliditydate', securePayload(data)).then((r) => r.data),
  getServiceOutBuses: () => api.post('/getserviceoutbuses', {}).then((r) => r.data),
  markBusServiceOut: (data: unknown) => api.post('/markbusserviceout', securePayload(data)).then((r) => r.data),
  reactivateBus: (data: unknown) => api.post('/reactivatebus', securePayload(data)).then((r) => r.data),

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
  // NOTE: unlike most endpoints here, adddrivereditCtrl reads req.body directly
  // (no decryptPayload call server-side) — securePayload here would just send
  // an encrypted blob the backend never unwraps, so every field comes through undefined.
  editDriver: (data: unknown) => api.post('/adddriveredit', data).then((r) => r.data),
  getDriverHistory: (data: unknown) => api.post('/getdriverhistory', data).then((r) => r.data),
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

  // ── Bulk Excel Upload ────────────────────────────────────
  bulkUploadBuses: (data: unknown) => api.post('/bulkuploadbuses', securePayload(data)).then((r) => r.data),
  bulkUploadServiceRoutes: (data: unknown) => api.post('/bulkuploadserviceroutes', securePayload(data)).then((r) => r.data),
  bulkUploadStaff: (data: unknown) => api.post('/bulkuploadstaff', securePayload(data)).then((r) => r.data),
}
