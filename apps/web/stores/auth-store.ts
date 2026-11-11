import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  saRole?: string
  allowedModules: string[]
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  refreshToken: string | null
  tenantSlug: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  setAuth: (data: {
    user: AuthUser
    accessToken: string
    refreshToken: string
    tenantSlug: string
  }) => void
  setAccessToken: (token: string) => void
  clearAuth: () => void
  setLoading: (loading: boolean) => void
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  tenantSlug: null,
  isAuthenticated: false,
  isLoading: false,
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      ...initialState,

      setAuth: ({ user, accessToken, refreshToken, tenantSlug }) => {
        // Simpan tenant slug terpisah untuk API client
        if (typeof window !== 'undefined') {
          localStorage.setItem('simrs-tenant-slug', tenantSlug)
        }
        set({
          user,
          accessToken,
          refreshToken,
          tenantSlug,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      setAccessToken: (token) => {
        set({ accessToken: token })
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('simrs-tenant-slug')
        }
        set({ ...initialState })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: 'simrs-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tenantSlug: state.tenantSlug,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
