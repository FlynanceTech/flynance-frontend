import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCustomer,
  updateCustomer,
  deleteCustomer,
  createCreditCardPayment,
  createRecurringPayment,
  createPayment,
  updatePayment,
} from "@/services/payment";
import { paymentKeys } from "../paymentKeys";
import type {
  ClientData,
  UpdateCustomerPayload,
  CreditCardPayment,
  RecurringPaymentPayload,
  CreatePaymentPayload,
  PaymentResult,
  RecurringPaymentResult,
} from "@/types/payment";

// Apenas mutações (seguro para a rule of hooks)
export function usePaymentMutations() {
  const qc = useQueryClient();

  const createCustomerMutation = useMutation({
    mutationFn: (data: ClientData) => createCustomer(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentKeys.customers }),
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCustomerPayload }) =>
      updateCustomer(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: paymentKeys.customers });
      qc.invalidateQueries({ queryKey: paymentKeys.customer(id) });
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => deleteCustomer(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: paymentKeys.customers }),
  });

  const createCreditCardPaymentMutation = useMutation({
    mutationFn: (payload: CreditCardPayment) => createCreditCardPayment(payload),
    onSuccess: (res) => {
      if (res?.customer) {
        qc.invalidateQueries({
          queryKey: paymentKeys.customerPayments(String(res.customer)),
        });
      }
    },
  });

  const createRecurringPaymentMutation = useMutation({
    mutationFn: (payload: RecurringPaymentPayload) => createRecurringPayment(payload),
    onSuccess: (res: RecurringPaymentResult) => {
      // se sua API retorna customer no objeto do recorrente
      if (res?.customer) {
        qc.invalidateQueries({
          queryKey: paymentKeys.customerPayments(String(res.customer)),
        });
      }
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: (payload: CreatePaymentPayload) => createPayment(payload),
    onSuccess: (res) => {
      if (res?.customer) {
        qc.invalidateQueries({
          queryKey: paymentKeys.customerPayments(String(res.customer)),
        });
      }
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, partial }: { id: string; partial: Partial<PaymentResult> }) =>
      updatePayment(id, partial),
    onSuccess: () => {
      // use se tiver query específica de um pagamento
      // qc.invalidateQueries({ queryKey: paymentKeys.payment(id) });
    },
  });

  return {
    createCustomerMutation,
    updateCustomerMutation,
    deleteCustomerMutation,
    createCreditCardPaymentMutation,
    createRecurringPaymentMutation,
    createPaymentMutation,
    updatePaymentMutation,
  };
}
