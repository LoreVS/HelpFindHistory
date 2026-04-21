import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      initialized: false,

      login(token, user) {
        set({ token, user })
      },

      logout() {
        set({ token: null, user: null })
      },

      init() {
        const { token } = get()
        if (!token) {
          set({ initialized: true })
          return
        }
        try {
          const payload = JSON.parse(atob(token.split('.')[1]))
          if (payload.exp * 1000 < Date.now()) {
            set({ token: null, user: null, initialized: true })
          } else {
            set({ initialized: true })
          }
        } catch {
          set({ token: null, user: null, initialized: true })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)

export default useAuthStore
