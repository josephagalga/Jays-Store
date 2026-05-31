import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

// Decodes a JWT token without any library
const decodeToken = (token) => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(window.atob(base64))
  } catch {
    return null
  }
}

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login/', { email, password })
          const { access, refresh } = response.data

          localStorage.setItem('access_token', access)
          localStorage.setItem('refresh_token', refresh)

          // Decode the token to get role and basic info immediately
          const decoded = decodeToken(access)
          if (!decoded) throw new Error('Invalid token')

          const basicUser = {
            role: decoded.role,
            email: decoded.email,
            first_name: decoded.first_name,
            last_name: decoded.last_name,
            full_name: decoded.full_name,
            is_verified: decoded.is_verified,
          }

          set({ user: basicUser, isAuthenticated: true })

          // Then fetch the full profile for non-admin roles
          await get().fetchProfile()

          return { success: true }
        } catch (error) {
          const message =
            error.response?.data?.detail ||
            error.response?.data?.non_field_errors?.[0] ||
            'Invalid credentials'
          return { success: false, error: message }
        } finally {
          set({ isLoading: false })
        }
      },

      fetchProfile: async () => {
        try {
          const user = get().user
          if (!user?.role) return
          if (user.role === 'admin') return

          const endpointMap = {
            buyer: '/accounts/profile/buyer/',
            seller: '/accounts/profile/seller/',
            driver: '/accounts/profile/driver/',
          }

          const endpoint = endpointMap[user.role]
          if (!endpoint) return

          const response = await api.get(endpoint)

          // Merge with existing user so role is never lost
          set({
            user: { ...user, ...response.data },
            isAuthenticated: true
          })
        } catch (error) {
          console.error('Failed to fetch profile:', error)
        }
      },

      setUser: (user) => set({ user, isAuthenticated: true }),

      logout: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({ user: null, isAuthenticated: false })
        window.location.href = '/login'
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export default useAuthStore