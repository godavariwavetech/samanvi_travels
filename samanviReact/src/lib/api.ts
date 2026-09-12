import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/nodeapp/',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('acstkn')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Lists are fetched with GET (fuel entries, laundry bills, trips...). A
  // browser or the server's proxy may hand back a cached copy of a GET, so a
  // record just saved never showed until a hard refresh. A unique stamp per
  // request means no cache has a copy of that URL to hand back, and the API
  // answers every /nodeapp call with Cache-Control: no-store (see app.js).
  //
  // The stamp alone does it: a `Cache-Control` REQUEST header would make the
  // call non-simple, and the API's Access-Control-Allow-Headers never listed
  // it, so the browser failed the preflight and every GET list on staging came
  // back empty while the same URL answered fine outside a browser.
  if ((config.method ?? 'get').toLowerCase() === 'get') {
    config.params = { ...(config.params ?? {}), _ts: Date.now() }
  }
  return config
})

function redirectToLogin() {
  localStorage.clear()
  // Full page load, so it bypasses the router and needs the deployment's base
  // ('/' in production, '/staging/' in the subfolder build) spelled out —
  // otherwise an expired session on staging lands on production's login page.
  window.location.href = `${import.meta.env.BASE_URL}auth/login`
}

api.interceptors.response.use(
  (res) => {
    // Backend sends HTTP 200 with {status: 401|403} in body — treat as auth failure
    const s = res.data?.status
    if (s === 401 || s === 403) {
      redirectToLogin()
    }
    return res
  },
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      redirectToLogin()
    }
    return Promise.reject(error)
  }
)

export default api
