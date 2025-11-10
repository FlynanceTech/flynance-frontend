// src/hooks/query/keys.ts
export const coursesKeys = {
  all: ["courses"] as const,
  list: (params?: object) => [...coursesKeys.all, "list", params ?? {}] as const,
  detail: (id: string) => [...coursesKeys.all, "detail", id] as const,
};
