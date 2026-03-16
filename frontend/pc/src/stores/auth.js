import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { post, get } from '@shared/api/request'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,

      login: async (username, password) => {
        const data = await post('/auth/login', { username, password })
        const token = data.access_token
        localStorage.setItem('cdss_token', token)
        let user = { username }
        try {
          user = await get('/auth/me')
        } catch {
          localStorage.setItem('cdss_token', token)
        }
        set({ token, user })
        localStorage.setItem('cdss_token', token)
        return data
      },

      logout: () => {
        localStorage.removeItem('cdss_token')
        set({ token: null, user: null })
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'cdss_auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) localStorage.setItem('cdss_token', state.token)
      },
    }
  )
)
