export type BillingPeriod = "WEEKLY" | "MONTHLY" | "YEARLY";

export interface PlanFeatureResponse {
  id: string;
  label: string;
  key?: string;
  value?: string;
}

export interface PlansResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  priceCents: number;
  currency: string;
  period: BillingPeriod;
  isActive: boolean;
  isPublic: boolean;
  isFeatured: boolean;
  trialDays?: number;
  createdAt: string;
  updatedAt: string;

  features: PlanFeatureResponse[];
}
