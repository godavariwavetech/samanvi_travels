import { toast } from 'sonner'

// After a deploy, a tab that was already open keeps running the old bundle until
// it is reloaded. Every build writes /version.json with its own id; this checks
// it when the tab regains focus (and every few minutes), and offers a one-click
// reload when the id has changed. Nothing is reloaded behind the user's back, so
// a half-filled form is never lost.
declare const __BUILD_ID__: string

const CHECK_EVERY_MS = 3 * 60 * 1000
let shown = false

async function latestBuildId(): Promise<string | null> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    return typeof data?.id === 'string' ? data.id : null
  } catch { return null }
}

async function check() {
  if (shown || document.visibilityState !== 'visible') return
  const latest = await latestBuildId()
  if (!latest || latest === __BUILD_ID__) return
  shown = true
  toast('A new version is available', {
    description: 'Reload to get the latest changes.',
    duration: Infinity,
    action: { label: 'Reload now', onClick: () => window.location.reload() },
  })
}

export function startUpdateWatcher() {
  if (import.meta.env.DEV || typeof __BUILD_ID__ === 'undefined') return
  window.addEventListener('focus', check)
  document.addEventListener('visibilitychange', check)
  window.setInterval(check, CHECK_EVERY_MS)

  // A deploy replaces the hashed files an old page still points at; when one of
  // them 404s the page cannot continue, so reload once (never in a loop).
  window.addEventListener('vite:preloadError', () => {
    const last = Number(sessionStorage.getItem('chunk-reload-at') || 0)
    if (Date.now() - last < 30_000) return
    sessionStorage.setItem('chunk-reload-at', String(Date.now()))
    window.location.reload()
  })
}
