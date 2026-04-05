export interface UserDTO {
    id: string
    name: string
    email: string
    phone: string
    role?: string | null
    isTester?: boolean
    createdAt?: string
    planId?: string | null
    origin?: 'ORGANIC' | 'CAMPAIGN' | 'INFLUENCER'
    originRef?: string | null
}


interface User {
    id: string
    phone: string
    email: string
    name: string
    createdAt: string // ISO date
    // adicione outros campos se existirem
  }
  
  interface Account {
    id: string
    name: string
    userId: string
    accountType: 'TEMPORARY' | 'PERMANENT' // ou outro enum que faça sentido
  }
  
export interface UserResponse {
    user: User
    account: Account
    billingCheckoutToken?: string | null
  }
  
