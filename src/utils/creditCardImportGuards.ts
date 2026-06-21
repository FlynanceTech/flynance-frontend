import type { Transaction } from '@/types/Transaction'

export type CreditCardImportDiagnosticEvent =
  | 'credit_card_import_item_ignored_payment'
  | 'credit_card_import_charge_created'
  | 'credit_card_import_skipped_transaction_creation'
  | 'credit_card_import_unexpected_cash_transaction_created'

export type CreditCardIgnoredReason = 'statement_payment_adjustment'

export type CreditCardIgnoredImportItem<TTransaction = Transaction> = {
  transaction: TTransaction
  reason: CreditCardIgnoredReason
  message: string
  fingerprint: string
}

export type CreditCardStatementImportKeyParams = {
  cardId?: string | null
  detectedCardName?: string | null
  transactions: Transaction[]
}

const CREDIT_CARD_PAYMENT_TYPE = 'CREDIT_CARD' as const

const PAYMENT_ADJUSTMENT_PHRASES = [
  'pagamento recebido',
  'pagamentos recebidos',
  'pagamento da fatura',
  'pagamento de fatura',
  'credito de pagamento',
  'ajuste de pagamento',
  'estorno de pagamento',
  'recebimento de pagamento',
]

function normalizeImportText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function stableHash(value: string) {
  let hash = 5381

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index)
  }

  return (hash >>> 0).toString(36)
}

function normalizeAmount(value: number | null | undefined) {
  const numericValue = Number(value ?? 0)
  if (!Number.isFinite(numericValue)) return '0.00'
  return Math.abs(numericValue).toFixed(2)
}

function normalizeDate(value: string | null | undefined) {
  if (!value) return ''
  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return value.slice(0, 10)
  return new Date(timestamp).toISOString().slice(0, 10)
}

export function isCreditCardStatementPaymentAdjustmentDescription(
  description: string | null | undefined
) {
  const normalizedDescription = normalizeImportText(description)
  if (!normalizedDescription) return false

  return PAYMENT_ADJUSTMENT_PHRASES.some((phrase) =>
    normalizedDescription.includes(phrase)
  )
}

export function isCreditCardStatementPaymentAdjustment(
  transaction: Pick<Transaction, 'description'> | null | undefined
) {
  return isCreditCardStatementPaymentAdjustmentDescription(transaction?.description)
}

export function buildCreditCardImportItemFingerprint(
  transaction: Pick<
    Transaction,
    | 'description'
    | 'date'
    | 'value'
    | 'cardId'
    | 'installmentCount'
    | 'installmentCurrent'
    | 'installmentTotal'
  >
) {
  return [
    normalizeImportText(transaction.cardId),
    normalizeDate(transaction.date),
    normalizeImportText(transaction.description),
    normalizeAmount(transaction.value),
    transaction.installmentCurrent ?? '',
    transaction.installmentTotal ?? transaction.installmentCount ?? '',
  ].join('|')
}

export function buildCreditCardStatementImportKey({
  cardId,
  detectedCardName,
  transactions,
}: CreditCardStatementImportKeyParams) {
  const cardKey = normalizeImportText(cardId || detectedCardName || 'unknown-card')
  const itemFingerprints = transactions
    .map(buildCreditCardImportItemFingerprint)
    .sort()
    .join('||')

  return [
    'credit-card-statement-import',
    cardKey,
    transactions.length,
    stableHash(itemFingerprints),
  ].join(':')
}

export function splitCreditCardStatementImportTransactions<TTransaction extends Transaction>(
  transactions: TTransaction[]
) {
  const importable: TTransaction[] = []
  const ignored: CreditCardIgnoredImportItem<TTransaction>[] = []

  transactions.forEach((transaction) => {
    if (isCreditCardStatementPaymentAdjustment(transaction)) {
      ignored.push({
        transaction,
        reason: 'statement_payment_adjustment',
        message:
          'Este item parece ser pagamento/ajuste da fatura e nao sera importado como gasto.',
        fingerprint: buildCreditCardImportItemFingerprint(transaction),
      })
      return
    }

    importable.push(transaction)
  })

  return { importable, ignored }
}

export function normalizeCreditCardStatementImportTransactions(
  transactions: Transaction[],
  cardId?: string | null
): Transaction[] {
  return transactions.map((transaction) => ({
    ...transaction,
    type: 'EXPENSE',
    paymentType: CREDIT_CARD_PAYMENT_TYPE,
    cardId: cardId || transaction.cardId || null,
    metadata: {
      ...(transaction.metadata ?? {}),
      importKind: 'CREDIT_CARD_STATEMENT',
      createEffectiveTransaction: false,
    },
  }))
}

export function logCreditCardImportDiagnostic(
  event: CreditCardImportDiagnosticEvent,
  payload: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info'
) {
  const message = `[${event}]`

  if (level === 'error') {
    console.error(message, payload)
    return
  }

  if (level === 'warn') {
    console.warn(message, payload)
    return
  }

  console.info(message, payload)
}
