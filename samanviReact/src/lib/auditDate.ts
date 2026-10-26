// Audit endpoints return local IST timestamps, with no browser timezone shift.
export function formatAuditDate(value: unknown): string {
  const text = String(value ?? '').trim()
  if (!text) return 'Date and time not recorded'
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/)
  if (!match) return text
  const date = `${match[3]}/${match[2]}/${match[1]}`
  return match[4] ? `${date}, ${match[4]}:${match[5]}${match[6] ? `:${match[6]}` : ''} IST` : `${date} (time not recorded)`
}
