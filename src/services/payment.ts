import axios, { AxiosError } from "axios";
import {
  ClientData,
  CreateCustomerResponse,
  UpdateCustomerPayload,
  CustomersListResponse,
  CreditCardPayment,
  PaymentResult,
  ClientPaymentsResponse,
  RecurringPaymentPayload,
  RecurringPaymentResult,
  CreatePaymentPayload,
} from "@/types/payment";

// BaseURL saneada
const BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5555/api").replace(/\/+$/, "");

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

// Helpers
const digits = (s?: string | null) => (s ? s.replace(/\D/g, "") : s);
const normalizeClientData = (input: ClientData): ClientData => ({
  ...input,
  cpfCnpj: digits(input.cpfCnpj) ?? "",
  mobilePhone: digits(input.mobilePhone) ?? "",
});

function asApiError(err: unknown, fallback: string) {
  const e = err as AxiosError;
  const status = e.response?.status ?? "";
  const data = e.response?.data ? ` ${JSON.stringify(e.response.data)}` : "";
  return new Error(`${fallback}${status ? ` (${status})` : ""}${data || ""}`);
}

/* =========================
   Rotas Payment (Swagger)
   ========================= */

// GET /payment/clients
export async function listCustomers(): Promise<CustomersListResponse> {
  try {
    const { data } = await api.get<CustomersListResponse>("/payment/clients");
    return data;
  } catch (err) {
    throw asApiError(err, "Erro ao listar clientes");
  }
}

// GET /payment/client/{id}
export async function getCustomer(id: string): Promise<CreateCustomerResponse> {
  try {
    const { data } = await api.get<CreateCustomerResponse>(`/payment/client/${id}`);
    return data;
  } catch (err) {
    throw asApiError(err, "Erro ao obter cliente");
  }
}

// PUT /payment/client/{id}
export async function updateCustomer(
  id: string,
  partial: UpdateCustomerPayload
): Promise<CreateCustomerResponse> {
  try {
    const { data } = await api.put<CreateCustomerResponse>(`/payment/client/${id}`, partial);
    return data;
  } catch (err) {
    throw asApiError(err, "Erro ao atualizar cliente");
  }
}

// DELETE /payment/client/{id}
export async function deleteCustomer(id: string): Promise<{ ok: true }> {
  try {
    await api.delete(`/payment/client/${id}`);
    return { ok: true };
  } catch (err) {
    throw asApiError(err, "Erro ao excluir cliente");
  }
}

// POST /payment/client
export async function createCustomer(
  data: ClientData
): Promise<CreateCustomerResponse> {
  try {
    const payload = normalizeClientData(data);
    const { data: res } = await api.post<CreateCustomerResponse>("/payment/client", payload);
    return res;
  } catch (err) {
    throw asApiError(err, "Erro ao criar cliente");
  }
}

// GET /payment/client/{id}/payments
export async function getCustomerPayments(id: string): Promise<ClientPaymentsResponse> {
  try {
    const { data } = await api.get<ClientPaymentsResponse>(`/payment/client/${id}/payments`);
    return data;
  } catch (err) {
    throw asApiError(err, "Erro ao listar pagamentos do cliente");
  }
}

// POST /payment/credit-card
export async function createCreditCardPayment(
  payment: CreditCardPayment
): Promise<PaymentResult> {
  try {
    const { data } = await api.post<PaymentResult>("/payment/credit-card", payment);
    return data;
  } catch (err) {
    throw asApiError(err, "Erro ao criar pagamento (cartão)");
  }
}

// POST /payment/recurring
export async function createRecurringPayment(
  payload: RecurringPaymentPayload
): Promise<RecurringPaymentResult> {
  try {
    const { data } = await api.post<RecurringPaymentResult>("/payment/recurring", payload);
    return data;
  } catch (err) {
    throw asApiError(err, "Erro ao criar pagamento recorrente");
  }
}

/* =========================
   Orquestrador (cartão)
   ========================= */
export async function createPayment({
  customerId,
  paymentDetails,
}: CreatePaymentPayload): Promise<PaymentResult> {
  return createCreditCardPayment({ ...paymentDetails, customer: customerId });
}

/* =========================
   (Opcional) atualizar pagamento
   Caso exista no seu backend: PUT /payment/{id}
   ========================= */
export async function updatePayment(
  id: string,
  partial: Partial<PaymentResult>
): Promise<PaymentResult> {
  try {
    const { data } = await api.put<PaymentResult>(`/payment/${id}`, partial);
    return data;
  } catch (err) {
    throw asApiError(err, "Erro ao atualizar pagamento");
  }
}
