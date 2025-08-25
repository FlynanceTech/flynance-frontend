// src/hooks/query/cardKeys.ts
export const cardKeys = {
    base: ['cards'] as const,
    list: ['cards', 'list'] as const,
    card: (id: string) => ['cards', 'detail', id] as const,
    summary: (id: string, tz?: string) => ['cards', 'summary', id, tz ?? ''] as const,
  };
  