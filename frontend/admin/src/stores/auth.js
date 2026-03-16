import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { post, get } from '@shared/api/request'

export const useAuthStore = create(
  persist(
    (set, getState) => ({
      token: null,
      user: null,

      get isAuthenticated() {
        return !!getState().token
      },

      login: async (username, password) => {
        const data = await post('/auth/login', { username, password })
        localStorage.setItem('cdss_token', data.access_token)
        let user = { username }
        try { user = await get('/auth/me') } catch {}
        set({ token: data.access_token, user })
        return data
      },

      logout: () => {
        localStorage.removeItem('cdss_token')
        set({ token: null, user: null })
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'cdss_admin_auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) localStorage.setItem('cdss_token', state.token)
      },
    }
  )
)
