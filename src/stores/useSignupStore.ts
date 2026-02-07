// stores/useSignupStore.ts
import { create } from 'zustand'

type SignupData = {
  name: string
  email: string
  phone: string
  origin: 'ORGANIC' | 'CAMPAIGN' | 'INFLUENCER'
  originRef?: string
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
    origin: 'ORGANIC',
    originRef: '',
  },
  setData: (data) => set({ data }),
  reset: () =>
    set({
      data: {
        name: '',
        email: '',
        phone: '',
        origin: 'ORGANIC',
        originRef: '',
      },
    }),
}))
