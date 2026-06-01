import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============================================================
// REQUEST INTERCEPTOR
// Automatically attaches the JWT token to every request
// ============================================================
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

// ============================================================
// RESPONSE INTERCEPTOR
// Automatically refreshes the token if it expires (401 error)
// ============================================================
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      // ↑ Flag to prevent infinite retry loops

      try {
        const refreshToken = localStorage.getItem('refresh_token')
        const response = await axios.post('/api/auth/refresh/', {
          refresh: refreshToken,
        })

        const newAccessToken = response.data.access
        localStorage.setItem('access_token', newAccessToken)

        // Retry the original request with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        // Refresh token is also expired — log the user out
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api