import { Plan } from "@/app/WinbackPage/planos/plans"
import { PaymentType } from "@/services/transactions"
import { IconName } from "@/utils/icon-map"

export type CategoryType = 'EXPENSE' | 'INCOME'
export type TransactionOrigin = 'DASHBOARD' | 'WHATSAPP' | 'TEXT' | 'IMAGE' | 'AUDIO' | 'CHATBOT' | 'MESSAGE' | 'IMPORT'

export interface Category {
  id: string
  name: string
  icon: IconName
  color: string
  type: CategoryType
}

export interface Transaction {
  id: string
  userId: string
  value: number
  description: string
  categoryId: string
  date: string 
  type: CategoryType
  origin: TransactionOrigin
  category: Category 
  paymentType: PaymentType
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH'
  matchedKeyword?: string
}

export interface User {
  id: string
  phone: string
  email: string
  name: string
  createdAt: string
  planId: string | null
  role: string
  signatureId: string
  cpfCnpj: string
  postalCode: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  district: string;
  city: string;
  state: string;
  hasUsedTrial: boolean
}

export type SignatureStatus =
  | "PENDING"
  | "ACTIVE"
  | "OVERDUE"
  | "CANCELLED"
  | "EXPIRED"

export type SignatureBillingType = "CREDIT_CARD" | "BOLETO" | "PIX"
export type SignatureCycle = "MONTHLY" | "YEARLY"

export interface Signature {
  id: string
  userId: string
  planId: string

  asaasSubscriptionId: string
  asaasCustomerId: string

  startDate: string
  endDate: string | null
  nextDueDate: string | null

  active: boolean
  status: SignatureStatus

  billingType: SignatureBillingType
  cycle: SignatureCycle

  value: number
  description: string
  externalReference: string

  createdAt: string
  updatedAt: string

  plan: Plan

  user: User
}

export interface SessionResponse {
  userData: {
    user: User,
    signature: Signature,
    hasActiveSignature: boolean
  }
}
export interface userResponse {
  user: User,
  signature: Signature,
  hasActiveSignature: boolean
}



export interface UserSessionData {
  user: User
  signature: Signature
  hasActiveSignature: boolean
}

export interface SessionResponse {
  userData: UserSessionData
}

export type UserResponse = UserSessionData
