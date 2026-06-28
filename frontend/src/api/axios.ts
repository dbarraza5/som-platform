import axios from 'axios'
import { useAuthStore } from '@/store/authStore'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let queue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = []

const drainQueue = (err: unknown, token: string | null) => {
  queue.forEach((p) => (err ? p.reject(err) : p.resolve(token!)))
  queue = []
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }

    const { refreshToken, setTokens, clearAuth } = useAuthStore.getState()

    if (!refreshToken) {
      clearAuth()
      window.location.replace('/login')
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject })
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      })
    }

    original._retry = true
    isRefreshing = true

    try {
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken })
      const { accessToken: newAccess, refreshToken: newRefresh } = data.data
      setTokens(newAccess, newRefresh)
      drainQueue(null, newAccess)
      original.headers.Authorization = `Bearer ${newAccess}`
      return api(original)
    } catch (err) {
      drainQueue(err, null)
      clearAuth()
      window.location.replace('/login')
      return Promise.reject(err)
    } finally {
      isRefreshing = false
    }
  },
)

export default api