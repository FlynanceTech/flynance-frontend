import { FinancialScopeKey } from '@/lib/financialScope'

// src/hooks/query/cardKeys.ts
export const cardKeys = {
    base: ['cards'] as const,
    list: (actingContextKey: string, scopeKey: FinancialScopeKey) =>
      ['cards', 'list', actingContextKey, scopeKey] as const,
    card: (id: string, actingContextKey: string, scopeKey: FinancialScopeKey) =>
      ['cards', 'detail', actingContextKey, scopeKey, id] as const,
    summary: (
      id: string,
      actingContextKey: string,
      scopeKey: FinancialScopeKey,
      tz?: string
    ) => ['cards', 'summary', actingContextKey, scopeKey, id, tz ?? ''] as const,
  };
  
