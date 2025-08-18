import { create } from 'zustand'

interface SpendingControl {
  id?: string
  categoryId: string
  meta: number
  limite: number
  periodType:'monthly'| 'weekly'| 'bimonthly'| 'quarterly'| 'half_yearly'| 'annually'
  alert?: boolean
}

interface SpendingControlState {
  controls: SpendingControl[]
  addControl: (control: SpendingControl) => void
  removeControl: (categoryId: string) => void
  resetControls: () => void
  updateControl: (index: number, data: SpendingControl) => void
}

export const useSpendingControlStore = create<SpendingControlState>((set) => ({
  controls: [],
  addControl: (control) =>
    set((state) => ({
      controls: [...state.controls, control],
    })),
  removeControl: (categoryId) =>
    set((state) => ({
      controls: state.controls.filter((c) => c.categoryId !== categoryId),
    })),
  resetControls: () => set({ controls: [] }),
  updateControl: (index, data) => set((state) => {
    const updated = [...state.controls]
    updated[index] = data
    return { controls: updated }
  }),
}))
