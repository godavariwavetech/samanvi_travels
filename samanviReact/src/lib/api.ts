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
