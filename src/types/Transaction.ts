import { Plan } from "@/app/WinbackPage/planos/plans"
import type { HouseContext } from "@/types/house"
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

export interface CreditCardStatementPaymentDetail {
  id?: string
  description?: string | null
  categoryName?: string | null
  category?: Partial<Category> | null
  installmentNumber?: number | null
  installmentCurrent?: number | null
  currentInstallment?: number | null
  installmentCount?: number | null
  installmentTotal?: number | null
  totalInstallments?: number | null
  amount?: number | null
  value?: number | null
  installmentAmount?: number | null
  date?: string | null
  purchaseDate?: string | null
  dueDate?: string | null
}

export interface CreditCardStatementPaymentSummary {
  card?: {
    id?: string | null
    name?: string | null
    last4?: string | null
  } | null
  statement?: {
    id?: string | null
    cycleKey?: string | null
    dueAt?: string | null
    closingAt?: string | null
    paidAt?: string | null
    status?: string | null
  } | null
  items?: CreditCardStatementPaymentDetail[] | null
  charges?: CreditCardStatementPaymentDetail[] | null
}

export interface Transaction {
  id: string
  userId: string
  createdByUserId?: string | null
  updatedByUserId?: string | null
  user?: {
    id?: string
    name?: string | null
    email?: string | null
  } | null
  createdByUser?: {
    id?: string
    name?: string | null
    email?: string | null
  } | null
  updatedByUser?: {
    id?: string
    name?: string | null
    email?: string | null
  } | null
  value: number
  description: string
  sourceDescription?: string | null
  categoryId: string
  date: string 
  type: CategoryType
  origin: TransactionOrigin
  category: Category 
  paymentType: PaymentType
  cardId?: string | null
  card?: {
    id: string
    name?: string | null
    last4?: string | null
  } | null
  installmentCount?: number | null
  confidence?: 'LOW' | 'MEDIUM' | 'HIGH'
  matchedKeyword?: string
  isInstallment?: boolean
  installmentCurrent?: number | null
  installmentTotal?: number | null
  transactionCode?: string | null
  creditCardStatementId?: string | null
  statementId?: string | null
  creditCardStatementPaymentDetails?: CreditCardStatementPaymentDetail[] | null
  creditCardPaymentDetails?: CreditCardStatementPaymentDetail[] | null
  statementPaymentDetails?: CreditCardStatementPaymentDetail[] | null
  creditCardPayment?: CreditCardStatementPaymentSummary | null
  creditCardStatementPayment?: CreditCardStatementPaymentSummary | null
  statementPayment?: CreditCardStatementPaymentSummary | null
  metadata?: Record<string, unknown> | null
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
  houseContext?: HouseContext | null
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
  houseContext?: HouseContext | null
  userData: UserSessionData
}

export type UserResponse = UserSessionData
