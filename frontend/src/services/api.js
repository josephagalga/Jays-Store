import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {}

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't try to refresh for the refresh call itself — prevents loops
      if (originalRequest.url?.includes('/auth/refresh/')) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.dispatchEvent(new Event('auth:expired'))
        return Promise.reject(error)
      }

      originalRequest._retry = true

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        if (!refreshToken) throw new Error('No refresh token')

        // Use a bare axios call so the refresh never re-enters this interceptor
        const response = await axios.post(
          `${api.defaults.baseURL}/auth/refresh/`,
          { refresh: refreshToken },
          { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
        )

        const newAccessToken = response.data.access
        localStorage.setItem('access_token', newAccessToken)

        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        // Notify the auth store; route guards decide where to go.
        // No hard window.location here — that was yanking users
        // from the landing page to /login on every expired token.
        window.dispatchEvent(new Event('auth:expired'))
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api

// ── Order / payment helpers ─────────────────────────────────
export const verifyDeliveryPin = (orderId, code) =>
  api.post(`/orders/${orderId}/verify-pin/`, { code })

export const placeOrder = (payload) =>
  api.post('/orders/place/', payload)

api.placeOrder = placeOrder
api.verifyDeliveryPin = verifyDeliveryPin
