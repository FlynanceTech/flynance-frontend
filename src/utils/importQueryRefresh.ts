export type QueryInvalidationClient = {
  invalidateQueries: (filters: { queryKey: readonly unknown[] }) => Promise<unknown>
}

export const BASE_IMPORT_QUERY_ROOTS = [
  'transactions',
  'financeStatus',
  'payment-type-summary',
  'fixed-accounts',
  'controls',
  'dashboard',
] as const

export const CREDIT_CARD_IMPORT_QUERY_ROOTS = [
  'credit-card-charges',
  'future-forecast',
  'future-installments',
  'future-plans',
  'cards',
] as const

export async function refreshQueriesAfterImport(
  queryClient: QueryInvalidationClient,
  isCreditCardStatementImport: boolean
) {
  const roots = isCreditCardStatementImport
    ? [...BASE_IMPORT_QUERY_ROOTS, ...CREDIT_CARD_IMPORT_QUERY_ROOTS]
    : [...BASE_IMPORT_QUERY_ROOTS]

  await Promise.all(
    roots.map((root) => queryClient.invalidateQueries({ queryKey: [root] }))
  )
}
