import api from '@/lib/api'

export const bookingService = {
  getBookings: () => api.get('/getbookingsdata').then((r) => r.data),
  getBookingsDateWise: () => api.get('/getbookingsdatahisdatewise').then((r) => r.data),
  getBookingsByDates: (data: unknown) => api.post('/getbookingselecteddateswise', data).then((r) => r.data),
  addBooking: (data: unknown) => api.post('/addSamanvidata', data).then((r) => r.data),
  editBooking: (data: unknown) => api.post('/editthedataofadmin', data).then((r) => r.data),
  deleteBooking: (data: unknown) => api.post('/deletedata', data).then((r) => r.data),
  uploadExcel: (data: unknown) => api.post('/uploadexceldata', data).then((r) => r.data),
  assignToAgent: (data: unknown) => api.post('/assigntoagent', data).then((r) => r.data),
  assignToAmounts: (data: unknown) => api.post('/assigntoamounts', data).then((r) => r.data),
  getCollectionAgent: (data: unknown) => api.post('/getcollectionagentdata', data).then((r) => r.data),
  getCollectionAgentHistory: (data: unknown) =>
    api.post('/getcollectiondataondates', data).then((r) => r.data),
  getAccountantsNames: () => api.get('/getaccountantsnames').then((r) => r.data),
  getAdditionalIncome: (data: unknown) => api.post('/getincomesource', data).then((r) => r.data),
  addAdditionalIncome: (data: unknown) => api.post('/aditionalincomesource', data).then((r) => r.data),
  deleteAdditionalIncome: (data: unknown) => api.post('/deleteincomsorcedata', data).then((r) => r.data),
  getExpensesList: () => api.get('/getexpenseslist').then((r) => r.data),
}
