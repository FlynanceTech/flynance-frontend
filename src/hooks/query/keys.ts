
export const coursesKeys = {
  all: ["courses"] as const,
  list: (params?: object) => [...coursesKeys.all, "list", params ?? {}] as const,
  detail: (id: string) => [...coursesKeys.all, "detail", id] as const,
};

export const plansKeys = {
  all: ["plans"] as const,
  list: () => [...plansKeys.all, "list"] as const,
  detail: (id: string) => [...plansKeys.all, "detail", id] as const,
  bySlug: (slug: string) => [...plansKeys.all, "slug", slug] as const,
};
