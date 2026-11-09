import api from '@/lib/api'

export const deletedService = {
  // Everything deleted, newest first: logged deletes (with reason) and older soft-deleted records.
  getDeletedRecords: () => api.post('/getdeletedrecords', {}).then((r) => r.data),
}
