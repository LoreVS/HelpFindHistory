import { create } from 'zustand'

const useFragmentStore = create((set) => ({
  fragments: [],
  addFragment: (fragment) =>
    set((state) => ({ fragments: [...state.fragments, fragment] })),
  updateFragment: (id, updates) =>
    set((state) => ({
      fragments: state.fragments.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    })),
  removeFragment: (id) =>
    set((state) => ({
      fragments: state.fragments.filter((f) => f.id !== id),
    })),
  clearAll: () => set({ fragments: [] }),
}))

export default useFragmentStore