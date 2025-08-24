import { PaymentType } from "@/services/transactions"
import { IconName } from "@/utils/icon-map"

export type CategoryType = 'EXPENSE' | 'INCOME'
export type TransactionOrigin = 'DASHBOARD' | 'WHATSAPP'

export interface Category {
  id: string
  accountId: string | null
  name: string
  icon: IconName
  color: string
  type: CategoryType
}

export interface Transaction {
  id: string
  userId: string
  accountId: string
  value: number
  description: string
  categoryId: string
  date: string 
  type: CategoryType
  origin: TransactionOrigin
  category: Category 
  paymentType: PaymentType
}

export interface User {
  id: string
  phone: string
  email: string
  name: string
  createdAt: string
  planId: string | null
}

export type AccountType = 'TEMPORARY' | 'BANK' | 'CASH' | 'CREDIT_CARD'

export interface Account {
  id: string
  name: string
  userId: string
  accountType: AccountType
  transaction: Transaction[]
  user: User
}

export interface SessionResponse {
  account: Account
}
