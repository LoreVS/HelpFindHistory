import useAuthStore from '../store/authStore'

export function useRole() {
  return useAuthStore((state) => state.user?.role ?? null)
}
