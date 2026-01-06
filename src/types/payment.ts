// --- Tipos base ---
export type AsaasObject = "customer";

export enum PersonType {
  FISICA = "FISICA",
  JURIDICA = "JURIDICA",
}

// --- Cliente ---
export interface ClientData {
  name: string;
  email: string;
  cpfCnpj?: string;        // apenas dígitos
  mobilePhone: string;    // apenas dígitos (DDD + número)
  externalReference: string;
}

export interface CreateCustomerResponse {
  object: AsaasObject;      // "customer"
  id: string;
  dateCreated: string;      // "YYYY-MM-DD"
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  mobilePhone: string | null;
  address: string | null;
  addressNumber: string | null;
  complement: string | null;
  province: string | null;
  postalCode: string | null;
  cpfCnpj: string;
  personType: PersonType;
  deleted: boolean;
  additionalEmails: string | null;
  externalReference: string | null;
  notificationDisabled: boolean;
  observations: string | null;
  municipalInscription: string | null;
  stateInscription: string | null;
  canDelete: boolean;
  cannotBeDeletedReason: string | null;
  canEdit: boolean;
  cannotEditReason: string | null;
  city: string | null;
  cityName: string | null;
  state: string | null;
  country: string | null;
}

// Atualização parcial do cliente (só campos que seu backend aceitar)
export type UpdateCustomerPayload = Partial<
  Pick<
    CreateCustomerResponse,
    | "name"
    | "email"
    | "mobilePhone"
    | "address"
    | "addressNumber"
    | "complement"
    | "province"
    | "postalCode"
    | "observations"
    | "notificationDisabled"
  >
>;

// Lista de clientes (ajuste se seu backend paginar)
export type CustomersListResponse = CreateCustomerResponse[];

// --- Pagamentos ---
export type PaymentStatus = "paid" | "pending" | "failed";

export type CreditCard = {
  holderName: string;
  number: string;       // não logar
  expiryMonth: string;  // "01".."12"
  expiryYear: string;   // "2025" ou "25"
  ccv: string;
};

export type CreditCardPayment = {
  customer: string;     // id do customer
  amount: number;
  userId: string,
  planId: string,
  cycle: string;
  billingType: string,
  description: string;
  creditCard: CreditCard;
};

export interface PaymentResult {
  id: string;
  status: PaymentStatus;
  amount: number;
  customer: string;
  createdAt: string;
  [key: string]: unknown;
}

export type ClientPaymentsResponse = PaymentResult[];

// --- Recorrente ---
export interface RecurringPaymentPayload {
  customer: string;
  amount: number;
  description: string;
  billingType?: "CREDIT_CARD" | "BOLETO" | "PIX"; // se aplicar
  cycle: "WEEKLY" | "MONTHLY" | "YEARLY";
  nextDueDate: string;  // "YYYY-MM-DD"
  installments?: number;
  // adicione outros campos aceitos pelo seu backend
}

export interface RecurringPaymentResult {
  id: string;
  status: "active" | "pending" | "canceled" | string;
  customer: string;
  amount: number;
  createdAt: string;
  [key: string]: unknown;
}

// --- Orquestrador (cartão) ---
export type CreatePaymentPayload = {
  customerId: string;
  userId: string,
  planId: string,
  billingType: 'CREDIT_CARD',
  paymentDetails: Omit<CreditCardPayment, "customer">;
};
