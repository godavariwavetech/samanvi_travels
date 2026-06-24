import api from '@/lib/api'
import { securePayload } from '@/lib/crypto'

export const accountingService = {
  // ── P&L Hierarchy Data ───────────────────────────────────
  // Controllers for these endpoints use req.body directly (no decryption) → send RAW JSON
  getMastersAdd: (data: unknown) => api.post('/alldistrictsget', data).then((r) => r.data),
  editMasterName: (data: { id: number; districtnm: string }) =>
    api.post('/editdistrictsdata', securePayload(data)).then((r) => r.data),
  getMastersGroup: (data: unknown) => api.post('/getallmandaldata', data).then((r) => r.data),
  getLedgerData: (data: unknown) => api.post('/getledgerdatadropdown', data).then((r) => r.data),
  getMainMastersSubgroup: () => api.post('/getmainmasterssubgroup', {}).then((r) => r.data),
  getMainMastersSubchild: () => api.post('/getmainmasterssubchild', {}).then((r) => r.data),

  // ── Create root master (INCOME / EXPENSES) — requires encryption ────────
  createMaster: (data: { districtnm: string }) =>
    api.post('/postdistrictsdata', securePayload(data)).then((r) => r.data),

  // ── Hierarchy CRUD — RAW JSON (controllers do NOT decrypt) ──────────────
  addMasterGroup: (data: unknown) =>
    api.post('/addmastergroupdata', data).then((r) => r.data),
  addSubGroup: (data: unknown) =>
    api.post('/addsubgroupdata', data).then((r) => r.data),
  addChildData: (data: unknown) =>
    api.post('/addchilddata', data).then((r) => r.data),
  addInfiniteGroup: (data: unknown) =>
    api.post('/addInfiniteGroup', data).then((r) => r.data),
  addLedgerData: (data: unknown) =>
    api.post('/addledgerdata', data).then((r) => r.data),
  addLedger: (data: unknown) =>
    api.post('/addledgerdata', data).then((r) => r.data),
  updateGroupName: (data: unknown) =>
    api.post('/updateGroupName', data).then((r) => r.data),
  updateLedgerName: (data: unknown) =>
    api.post('/updateLedgerName', data).then((r) => r.data),
  deleteGroup: (data: unknown) =>
    api.post('/deleteGroup', data).then((r) => r.data),
  deleteLedger: (data: unknown) =>
    api.post('/deleteLedger', data).then((r) => r.data),
  moveLedger: (data: unknown) =>
    api.post('/moveLedger', data).then((r) => r.data),

  // ── Voucher Entry — encrypted ────────────────────────────
  getVoucherEntries: () => api.get('/getvoucherentrydata').then((r) => r.data),
  getVoucherApproved: () => api.get('/getvoucherapproveddata').then((r) => r.data),
  submitVoucher: (data: unknown) =>
    api.post('/submitvoucherentrydata', securePayload(data)).then((r) => r.data),
  updateVoucher: (data: unknown) =>
    api.post('/updatevoucherentry', securePayload(data)).then((r) => r.data),
  deleteVoucher: (data: unknown) =>
    api.post('/deletevoucherentry', securePayload(data)).then((r) => r.data),
  updateVoucherStatus: (data: unknown) =>
    api.post('/updatevoucherentrystatus', securePayload(data)).then((r) => r.data),
  getVoucherModalData: (data: unknown) =>
    api.post('/getvouchermodaldata', data).then((r) => r.data),
  getVoucherAudit: (c_number: string) =>
    api.get(`/getvoucheraudit/${c_number}`).then((r) => r.data),
  getVoucherSearch: (data: unknown) => api.post('/getvouchersearchdata', data).then((r) => r.data),
  submitPayablesVoucher: (data: unknown) =>
    api.post('/submitpayablesvoucherentry', securePayload(data)).then((r) => r.data),
  updatePayablesVoucher: (data: unknown) =>
    api.post('/updatepayablesvoucherentry', securePayload(data)).then((r) => r.data),
  getPayablesSettledRows: (data: unknown) =>
    api.post('/getpayablessettledrows', data).then((r) => r.data),
  getPayablesPaymentHistory: (data: { source_table: string; source_id: number }) =>
    api.post('/getpayablespaymenthistory', data).then((r) => r.data),

  // ── Voucher Types — encrypted ────────────────────────────
  getVoucherTypes: (data: unknown) => api.post('/getvouchertypedata', data).then((r) => r.data),
  submitVoucherType: (data: unknown) =>
    api.post('/submitvouchertype', securePayload(data)).then((r) => r.data),
  editVoucherType: (data: unknown) =>
    api.post('/editvouchername', securePayload(data)).then((r) => r.data),
  deleteVoucherType: (data: unknown) =>
    api.post('/deletevouchername', securePayload(data)).then((r) => r.data),

  // ── Reports ──────────────────────────────────────────────
  getDayBook: (data: unknown) => api.post('/getdaybookreports', data).then((r) => r.data),
  getTrialBalance: (data: unknown) => api.post('/gettrialbalancereports', data).then((r) => r.data),
  getTransactionsReport: (data: unknown) =>
    api.post('/Selectdatagetfinaltranscationsreport', securePayload(data)).then((r) => r.data),
  getTransactionsReport1: (data: unknown) =>
    api.post('/Selectdatagetfinaltranscationsreport1', securePayload(data)).then((r) => r.data),

  // ── Ledger misc ──────────────────────────────────────────
  getLedgerDropdown: (data: unknown) =>
    api.post('/getledgerdatadropdown', data).then((r) => r.data),
  getLedgerName: () => api.post('/getledgername', {}).then((r) => r.data),
  getLedgerWiseReport: (data: unknown) =>
    api.post('/getLedgerWiseReport', data).then((r) => r.data),
  getSearchData: (data: unknown) =>
    api.post('/getsearchdata', data).then((r) => r.data),
  getRefDetails: (data: unknown) =>
    api.post('/getRefDetails', data).then((r) => r.data),
  getExpenseTripLedger: () => api.post('/getexpensetripledgerdata', {}).then((r) => r.data),
  getEmployeesDropdown: () => api.post('/getallemployeesdropdownvoucherentry', {}).then((r) => r.data),

  // ── Profit & Loss misc ────────────────────────────────────
  addLedgerPost: (data: unknown) => api.post('/addledgerpostdata', data).then((r) => r.data),
  addProfitLossPost: (data: unknown) => api.post('/addprofitlosspostdata', data).then((r) => r.data),
  addLedgerSingleInPL: (data: unknown) =>
    api.post('/Addledgersingleinprofitandloss', securePayload(data)).then((r) => r.data),
  addIncomeSingleInPL: (data: unknown) =>
    api.post('/incomesingleinprofitandloss', securePayload(data)).then((r) => r.data),
  addLedgerSingleInBS: (data: unknown) =>
    api.post('/Addledgersingleinbalancesheet', securePayload(data)).then((r) => r.data),
  addEquitySingleInBS: (data: unknown) =>
    api.post('/equilitiessingleinbalancesheet', securePayload(data)).then((r) => r.data),
}
