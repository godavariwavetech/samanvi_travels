import api from '@/lib/api'

export type DbBackup = {
  name: string
  kind: 'morning' | 'evening' | 'manual'
  size: number
  created_at: string
}

export const backupService = {
  // Backups on the server, newest first (taken 6:00 AM and 11:30 PM IST, plus manual ones).
  list: () => api.post('/getdbbackups', {}).then((r) => r.data),
  runNow: () => api.post('/rundbbackup', {}).then((r) => r.data),
  // Through axios so the login token goes with it, then saved as a file.
  download: async (name: string) => {
    const res = await api.get(`/downloaddbbackup/${encodeURIComponent(name)}`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  },
}
