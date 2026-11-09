import type { AxiosInstance, AxiosResponse } from 'axios'

// Every successful delete call is written to the Deleted Records log, with the
// reason the user gave in the Delete prompt. The prompt records the reason
// here first (noteDeleteReason); the API client then logs the delete call that
// follows (logIfDeletion). A delete made without a prompt is still logged, just
// without a reason. Who and when are taken by the server from the login.

type Pending = { reason: string; subject: string; row?: unknown; at: number }
let pending: Pending | null = null
// A reason only belongs to the delete made right after it was typed.
const PENDING_MS = 2 * 60 * 1000

export function noteDeleteReason(reason: string, subject: unknown, row?: unknown) {
  pending = { reason, subject: typeof subject === 'string' ? subject : '', row, at: Date.now() }
}

// Delete endpoints are named /delete…; the log's own calls are left out.
const DELETE_URL = /delete/i
const NOT_A_DELETE = /logdeletedrecord|getdeleted|deletedlogs|deletedmodal/i

const REFERENCE_KEYS = ['c_number', 'job_card_number', 'voucher_number', 'reference', 'bus_no', 'name', 'id']

function moduleOf(pathname: string) {
  const seg = pathname.replace(/^\/+/, '').split('/')[0] || ''
  const names: Record<string, string> = {
    trips: 'Trips', fuel: 'Fuel', laundry: 'Laundry', garage: 'Garage', accounting: 'Vouchers',
    masters: 'Masters', mainmasters: 'Main Masters', payroll: 'Pay Roll', users: 'Users', booking: 'Booking', helpdesk: 'Help Desk',
  }
  return names[seg] ?? (seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : 'Other')
}

function referenceOf(...sources: unknown[]) {
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue
    for (const key of REFERENCE_KEYS) {
      const v = (src as Record<string, unknown>)[key]
      if (v !== undefined && v !== null && String(v).trim() !== '') return String(v)
    }
  }
  return ''
}

export function logIfDeletion(api: AxiosInstance, res: AxiosResponse) {
  const url = String(res.config?.url ?? '')
  if (!DELETE_URL.test(url) || NOT_A_DELETE.test(url)) return
  // The server answers HTTP 200 with its own status in the body.
  const bodyStatus = (res.data as { status?: unknown } | undefined)?.status
  if (bodyStatus !== undefined && Number(bodyStatus) !== 200) return
  let payload: unknown = res.config?.data
  if (typeof payload === 'string') { try { payload = JSON.parse(payload) } catch { /* keep as text */ } }
  // Fuel, laundry and voucher calls are encrypted; that blob is unreadable, so keep only the record.
  if (payload && typeof payload === 'object' && 'encryptedPayload' in payload) payload = null
  const reason = pending && Date.now() - pending.at < PENDING_MS ? pending : null
  pending = null
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(import.meta.env.BASE_URL ?? '/', '/') : ''
  api.post('/logdeletedrecord', {
    module: moduleOf(path),
    page: (typeof document !== 'undefined' ? document.querySelector('h1')?.textContent?.trim() : '') || path,
    reference: referenceOf(reason?.row, payload) || reason?.subject || '',
    reason: reason?.reason ?? '',
    endpoint: url,
    snapshot: { record: reason?.row ?? null, request: payload ?? null, subject: reason?.subject ?? '' },
  }).catch(() => { /* logging must never break the delete itself */ })
}
