import api from '@/lib/api'

export const payrollService = {
  getSalaryReport: (data: unknown) => api.post('/getsalaryreport', data).then((r) => r.data),
  getOldBalance: (data: unknown) => api.post('/getoldBalance', data).then((r) => r.data),
  getAdvance: (data: unknown) => api.post('/getadvance', data).then((r) => r.data),
  sud: (data: unknown) => api.post('/sud', data).then((r) => r.data),
}
