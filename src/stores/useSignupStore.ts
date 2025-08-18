// stores/useSignupStore.ts
import { create } from 'zustand'

type SignupData = {
  name: string
  email: string
  phone: string
}

type SignupStore = {
  data: SignupData
  setData: (data: SignupData) => void
  reset: () => void
}

export const useSignupStore = create<SignupStore>((set) => ({
  data: {
    name: '',
    email: '',
    phone: '',
  },
  setData: (data) => set({ data }),
  reset: () =>
    set({
      data: {
        name: '',
        email: '',
        phone: '',
      },
    }),
}))
