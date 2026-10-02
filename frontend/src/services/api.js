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
// Backend OTP route is /orders/<id>/verify-otp/ (keep legacy verify-pin alias).
export const verifyDeliveryOtp = (orderId, code) =>
  api.post(`/orders/${orderId}/verify-otp/`, { code })

export const verifyDeliveryPin = (orderId, code) =>
  api.post(`/orders/${orderId}/verify-otp/`, { code })

export const placeOrder = (payload) =>
  api.post('/orders/place/', payload)

export const placeGuestOrder = (payload) =>
  api.post('/orders/guest/', payload)

export const trackGuestOrder = (reference) =>
  api.get(`/orders/track/${reference}/`)

export const retryGuestPayment = (reference, { email, channels } = {}) =>
  api.post(`/orders/track/${reference}/`, { email, channels })

export const claimGuestAccount = (payload) =>
  api.post('/accounts/guest-claim/', payload)

export const fetchOrderReceipt = (orderId) =>
  api.get(`/orders/${orderId}/receipt/`)

export const fetchVendors = (search = '') =>
  api.get('/accounts/stores/', { params: search ? { search } : {} })

api.placeOrder = placeOrder
api.placeGuestOrder = placeGuestOrder
api.trackGuestOrder = trackGuestOrder
api.retryGuestPayment = retryGuestPayment
api.claimGuestAccount = claimGuestAccount
api.verifyDeliveryPin = verifyDeliveryPin
api.verifyDeliveryOtp = verifyDeliveryOtp
api.fetchOrderReceipt = fetchOrderReceipt
api.fetchVendors = fetchVendors
