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

// ============================================================
// ADMIN API
// ============================================================

export const adminApi = {
  // Dashboard
  getDashboard: () => api.get('/accounts/admin/dashboard/'),

  // Users
  getUsers: (params) => api.get('/accounts/admin/users/', { params }),
  deleteUser: (id) => api.delete(`/accounts/admin/users/${id}/delete/`),
  updateCommissionRate: (id, rate) => api.patch(`/accounts/admin/users/${id}/commission-rate/`, { commission_rate: rate }),
  getCommissionAuditLogs: (params) => api.get('/accounts/admin/commission-audit-logs/', { params }),

  // Drivers
  getDrivers: (params) => api.get('/accounts/admin/users/', { params: { ...params, role: 'driver' } }),
  getDriverDetail: (id) => api.get(`/accounts/admin/drivers/${id}/`),
  verifyDriver: (id, status, note) => api.patch(`/accounts/admin/drivers/${id}/verify/`, { verification_status: status, verification_note: note }),

  // Contact messages
  getContactMessages: (params) => api.get('/accounts/admin/contact-messages/', { params }),

  // Newsletter
  getNewsletterSubscribers: (params) => api.get('/accounts/admin/newsletter/', { params }),

  // Email logs
  getEmailLogs: (params) => api.get('/orders/admin/email-logs/', { params }),
  testEmail: (to) => api.post('/orders/admin/email-logs/test/', { to }),

  // Finance
  getFinance: () => api.get('/orders/admin/finance/'),
  getSellerEarnings: () => api.get('/orders/admin/seller-earnings/'),

  // Payouts & settlements
  getSettlements: (params) => api.get('/admin/settlements/', { params }),
  getPayouts: (params) => api.get('/admin/payouts/', { params }),
  updatePayout: (id, action) => api.patch(`/admin/payouts/${id}/`, { action }),

  // Products
  getProducts: (params) => api.get('/products/manage/', { params }),
  updateProduct: (id, data) => api.patch(`/products/manage/${id}/`, data),

  // Categories
  getCategories: () => api.get('/products/categories/'),
  createCategory: (data) => api.post('/products/admin/categories/create/', data),
  updateCategory: (id, data) => api.patch(`/products/admin/categories/${id}/`, data),
  deleteCategory: (id) => api.delete(`/products/admin/categories/${id}/`),

  // Inventory
  getInventory: (params) => api.get('/products/admin/inventory/', { params }),

  // Reviews
  getReviews: (params) => api.get('/reviews/admin/', { params }),
  toggleReview: (id, isVisible) => api.patch(`/reviews/admin/${id}/toggle/`, { is_visible: isVisible }),
}

// ============================================================
// SELLER API
// ============================================================

export const sellerApi = {
  // Profile
  getProfile: () => api.get('/accounts/profile/seller/'),
  updateProfile: (data) => api.patch('/accounts/profile/seller/', data),

  // Payout account
  getPayoutAccount: () => api.get('/accounts/seller/payout-account/'),
  updatePayoutAccount: (data) => api.patch('/accounts/seller/payout-account/', data),
  getBanks: () => api.get('/accounts/seller/banks/'),

  // Commission info
  getCommissionInfo: () => api.get('/accounts/seller/commission-info/'),

  // Wallet & Payouts
  getWallet: () => api.get('/seller/wallet/'),
  getPayouts: (params) => api.get('/seller/payouts/', { params }),
  requestPayout: (amount) => api.post('/seller/payouts/', { amount }),

  // Delivery mode
  updateDeliveryMode: (mode, fee) => api.patch('/accounts/profile/seller/', {
    delivery_mode: mode,
    custom_delivery_fee: fee,
  }),
}

// ============================================================
// BUYER API
// ============================================================

export const buyerApi = {
  // Profile
  getProfile: () => api.get('/accounts/profile/buyer/'),
  updateProfile: (data) => api.patch('/accounts/profile/buyer/', data),
  deleteAccount: () => api.delete('/accounts/me/'),
}

// ============================================================
// DRIVER API
// ============================================================

export const driverApi = {
  // Profile
  getProfile: () => api.get('/accounts/profile/driver/'),
  updateProfile: (data) => api.patch('/accounts/profile/driver/', data),
}
