import type { Transaction } from '@/types/Transaction'

type RecordLike = Record<string, unknown>

const CREDIT_CARD_PAYMENT_TYPE = 'CREDIT_CARD'

function asRecord(value: unknown): RecordLike {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordLike)
    : {}
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  return String(value)
}

function optionalNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readNestedArray(record: RecordLike, path: string[]): unknown[] {
  let current: unknown = record

  for (const key of path) {
    current = asRecord(current)[key]
  }

  return asArray(current)
}

export function isEffectiveCashflowTransaction(
  transaction: Pick<Transaction, 'paymentType'> | null | undefined
) {
  return transaction?.paymentType !== CREDIT_CARD_PAYMENT_TYPE
}

export function filterEffectiveCashflowTransactions<T extends { paymentType?: string | null }>(
  transactions: T[] | null | undefined
) {
  return (transactions ?? []).filter((transaction) => transaction.paymentType !== CREDIT_CARD_PAYMENT_TYPE)
}

export type NormalizedStatementPaymentDetail = {
  id: string
  description: string
  categoryName: string
  installmentNumber: number | null
  installmentCount: number | null
  amount: number
  date: string | null
}

export function getCreditCardStatementPaymentDetails(
  transaction: Transaction | null | undefined
): NormalizedStatementPaymentDetail[] {
  if (!transaction) return []

  const record = asRecord(transaction)
  const sources = [
    asArray(record.creditCardStatementPaymentDetails),
    asArray(record.creditCardPaymentDetails),
    asArray(record.statementPaymentDetails),
    readNestedArray(record, ['creditCardPayment', 'items']),
    readNestedArray(record, ['creditCardPayment', 'charges']),
    readNestedArray(record, ['creditCardStatementPayment', 'items']),
    readNestedArray(record, ['creditCardStatementPayment', 'charges']),
    readNestedArray(record, ['statementPayment', 'items']),
    readNestedArray(record, ['statementPayment', 'charges']),
    readNestedArray(record, ['statement', 'items']),
    readNestedArray(record, ['statement', 'charges']),
    readNestedArray(record, ['metadata', 'creditCardStatementPaymentDetails']),
    readNestedArray(record, ['metadata', 'creditCardPaymentDetails']),
  ].find((items) => items.length > 0)

  if (!sources?.length) return []

  return sources
    .map((item, index) => {
      const itemRecord = asRecord(item)
      const charge = asRecord(
        itemRecord.charge ??
        itemRecord.creditCardCharge ??
        itemRecord.purchase ??
        itemRecord.transaction
      )
      const category = asRecord(itemRecord.category ?? charge.category)

      const description =
        nullableString(itemRecord.description) ??
        nullableString(charge.description) ??
        nullableString(itemRecord.sourceDescription) ??
        'Compra da fatura'

      const amount =
        optionalNumber(itemRecord.amount) ??
        optionalNumber(itemRecord.value) ??
        optionalNumber(itemRecord.installmentAmount) ??
        optionalNumber(charge.amountTotal) ??
        optionalNumber(charge.value) ??
        0

      return {
        id: nullableString(itemRecord.id ?? charge.id) ?? `${transaction.id}-statement-detail-${index}`,
        description,
        categoryName:
          nullableString(itemRecord.categoryName) ??
          nullableString(category.name) ??
          'Sem categoria',
        installmentNumber:
          optionalNumber(itemRecord.installmentNumber) ??
          optionalNumber(itemRecord.installmentCurrent) ??
          optionalNumber(itemRecord.currentInstallment) ??
          optionalNumber(itemRecord.number),
        installmentCount:
          optionalNumber(itemRecord.installmentCount) ??
          optionalNumber(itemRecord.installmentTotal) ??
          optionalNumber(itemRecord.totalInstallments) ??
          optionalNumber(charge.installmentCount),
        amount,
        date:
          nullableString(itemRecord.date) ??
          nullableString(itemRecord.purchaseDate) ??
          nullableString(charge.purchaseDate) ??
          nullableString(itemRecord.dueDate),
      }
    })
    .filter((item) => item.description || item.amount > 0)
}

export function isCreditCardStatementPaymentTransaction(
  transaction: Transaction | null | undefined
) {
  return getCreditCardStatementPaymentDetails(transaction).length > 0
}
