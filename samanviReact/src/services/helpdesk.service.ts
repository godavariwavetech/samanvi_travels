import api from '@/lib/api'
import { securePayload } from '@/lib/crypto'

export const helpdeskService = {
  getTickets: (data: unknown) => api.post('/getdata', securePayload(data)).then((r) => r.data),
  getCount: (data: unknown) => api.post('/helpdeskcount', data).then((r) => r.data),
  submitTicket: (data: unknown) => api.post('/submithelpdata', data).then((r) => r.data),
  resolveTicket: (data: unknown) => api.post('/problemdone', securePayload(data)).then((r) => r.data),
}
