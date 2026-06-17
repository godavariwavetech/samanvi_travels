import api from '@/lib/api'
import { securePayload } from '@/lib/crypto'

export const mainmastersService = {
  // ── Static Entry (Districts / mainincome) ─────────────────
  getDistricts: () => api.post('/alldistrictsget', securePayload({})).then((r) => r.data),
  addDistrict: (data: unknown) => api.post('/postdistrictsdata', securePayload(data)).then((r) => r.data),
  editDistrict: (data: unknown) => api.post('/editdistrictsdata', securePayload(data)).then((r) => r.data),
  deleteDistrict: (data: unknown) => api.post('/dltdistrictsdata', securePayload(data)).then((r) => r.data),

  // ── Main Group (Mandals) ──────────────────────────────────
  getMandals: () => api.post('/getallmandaldata', securePayload({})).then((r) => r.data),
  addMandal: (data: unknown) => api.post('/submitMandalsData', securePayload(data)).then((r) => r.data),
  editMandal: (data: unknown) => api.post('/editmandals', securePayload(data)).then((r) => r.data),
  deleteMandal: (data: unknown) => api.post('/deletemandals', securePayload(data)).then((r) => r.data),

  // ── Sub Group (Villages) ──────────────────────────────────
  getVillages: () => api.post('/getallvillagedata', securePayload({})).then((r) => r.data),
  addVillage: (data: unknown) => api.post('/submitVillagesData', securePayload(data)).then((r) => r.data),
  editVillage: (data: unknown) => api.post('/editvillages', securePayload(data)).then((r) => r.data),
  deleteVillage: (data: unknown) => api.post('/deletevillages', securePayload(data)).then((r) => r.data),

  // ── Child Sub (Temples) ───────────────────────────────────
  getChildSubs: () => api.post('/getallTemplesdata', securePayload({})).then((r) => r.data),
  // villages filtered by mandal (for Child Sub form dropdown)
  getChildData: (data: unknown) => api.post('/getallchilddatadata', securePayload(data)).then((r) => r.data),
  addChildSub: (data: unknown) => api.post('/submitTemples', securePayload(data)).then((r) => r.data),
  editChildSub: (data: unknown) => api.post('/editTemples', securePayload(data)).then((r) => r.data),
  deleteChildSub: (data: unknown) => api.post('/deletetemple', securePayload(data)).then((r) => r.data),

  // ── Sub Child Two ────────────────────────────────────────
  getSubChildTwoData: () => api.post('/getsubchildtworeportdata', securePayload({})).then((r) => r.data),
  getSubChildData: (data: unknown) => api.post('/getmainmasterchildsubseconddata', securePayload(data)).then((r) => r.data),
  submitSubChildTwo: (data: unknown) => api.post('/submitsubchildtwomainmasters', securePayload(data)).then((r) => r.data),
  editSubChildTwo: (data: unknown) => api.post('/editTemples', securePayload(data)).then((r) => r.data),
  deleteSubChildTwo: (data: unknown) => api.post('/deletetemple', securePayload(data)).then((r) => r.data),

  // ── Laundry Products ─────────────────────────────────────
  getLaundryProducts: () => api.post('/getlaundrytypemainmasters', securePayload({})).then((r) => r.data),
  addLaundryProduct: (data: unknown) => api.post('/submitlaundrytypemainmasters', securePayload(data)).then((r) => r.data),
  editLaundryProduct: (data: unknown) => api.post('/editvouchername', securePayload(data)).then((r) => r.data),
  deleteLaundryProduct: (data: unknown) => api.post('/deletevouchername', securePayload(data)).then((r) => r.data),
}
