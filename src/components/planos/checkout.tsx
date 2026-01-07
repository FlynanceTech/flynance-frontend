/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import {
  Check,
  CheckCircle,
  CreditCard,
  MoveLeft,
  MoveRight,
  ShoppingCart,
} from "lucide-react";
import Image from "next/image";
import { detectCardBrand } from "@/utils/detectCardBrand";
import { CleaveInput } from "../ui/input";
import whatsappIcon from "../../../public/icons/whatsapp.svg";
import { usePaymentMutations } from "@/hooks/query/usePayment";
import { CreatePaymentPayload } from "@/types/payment";
import Link from "next/link";
import axios from "axios";
import { PlansResponse } from "@/types/plan";
import {
  CardBrand,
  CheckoutCreditCard,
} from "@/app/dashboard/components/CreditCard";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserSession } from "@/stores/useUserSession";
import { User, UserSessionData } from "@/types/Transaction";
import { useUsers } from "@/hooks/query/useUsers";

interface FormDTO {
  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
}

const initialForm: FormDTO = {
  cardNumber: "",
  cardName: "",
  expiry: "",
  cvv: "",
};

const digits = (s: string) => s.replace(/\D/g, "");

function splitExpiry(expiry: string) {
  const [m = "", y = ""] = expiry.split("/");
  const year = y.length === 2 ? `20${y}` : y;
  return { month: m, year };
}

function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof (err as any).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return "Erro inesperado.";
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);

type CheckoutStepperProps = {
  plan: PlansResponse;
  step: number;
  userId: string
  onStepChange: (nextStep: number) => void;
};

export default function CheckoutStepper({
  plan,
  step,
  userId,
  onStepChange,
}: CheckoutStepperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const revalidate = searchParams.get("revalidate");

  const [form, setForm] = useState<FormDTO>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardBrand, setCardBrand] = useState<CardBrand>("OTHER");

  const { createPaymentMutation } = usePaymentMutations();
  const { user, status, fetchAccount } = useUserSession();

  const { userQuery } = useUsers(userId, !user) // só busca se NÃO tiver sessão

  const effectiveUser: UserSessionData | undefined =
  user?.userData ?? userQuery.data ?? undefined

  const sessionUser = effectiveUser?.user;
  const signature =  effectiveUser?.signature ;

  useEffect(() => {
    if (status === "idle") {
      fetchAccount();
    }
  }, [status, fetchAccount]);



  useEffect(() => {
    if (revalidate) {
      fetchAccount();
    }
  }, [revalidate, fetchAccount]);

  const isAnnual = plan.slug?.toLowerCase().includes("anual");
  const price = (plan.priceCents / 100).toFixed(2);
  const priceNumber = Number(price);
  const planLabel = plan.name || plan.slug || "Plano Flynance";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "cardNumber") setCardBrand(detectCardBrand(value));
  };

  const inputClasses =
    "p-3 border border-gray-300 rounded-md w-full focus:outline focus:outline-2 focus:outline-secondary focus:outline-offset-2";

  const handleBack = () => onStepChange(Math.max(step - 1, 0));

  const handleSubmit = async () => {
    if (step === 2) return;

    setLoading(true);
    setError(null);
    
    try {
      if (!form.cardNumber || !form.cardName || !form.expiry || !form.cvv) {
        throw new Error(
          "Preencha os dados do cartão (número, nome, validade e CVV)."
        );
      }

 
      console.log("check sessionUser e signature", sessionUser, signature)
      if (!sessionUser?.id) {
        throw new Error("Não foi possível identificar o usuário logado.");
      }

      if (!signature?.asaasCustomerId) {
        throw new Error(
          "Não foi possível identificar o cadastro de cobrança. Tente novamente ou fale com a Fly."
        );
      }

      const { month, year } = splitExpiry(form.expiry);

      const paymentPayload: CreatePaymentPayload = {
        customerId: signature.asaasCustomerId,
        userId: sessionUser.id,
        planId: plan.id,
        billingType: "CREDIT_CARD",
        paymentDetails: {
          userId: sessionUser.id,
          planId: plan.id,
          cycle: plan.period,
          billingType: "CREDIT_CARD",
          amount: priceNumber,
          description: `Assinatura Flynance - ${planLabel}`,
          creditCard: {
            holderName: form.cardName,
            number: digits(form.cardNumber),
            expiryMonth: month,
            expiryYear: year,
            ccv: digits(form.cvv),
          },
        },
      };

      await createPaymentMutation.mutateAsync(paymentPayload);

      setLoading(false);
      onStepChange(2); // vai direto para tela de sucesso
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        console.log("Erro do Axios:", message);
        setError(getErrorMessage(message));
      } else {
        console.log("Erro desconhecido:", err);
        setError(
          err instanceof Error ? err.message : "Ocorreu um erro inesperado."
        );
      }
      setLoading(false);
    }
  };

  type BillingPeriod = "MONTHLY" | "ANNUAL";

  const handleChangePeriod = (period: BillingPeriod) => {
    if (!plan.slug) return;

    const currentSlug = plan.slug.toLowerCase();
    let targetSlug = currentSlug;

    if (period === "ANNUAL") {
      if (currentSlug.includes("mensal")) {
        targetSlug = currentSlug.replace("mensal", "anual");
      }
    } else {
      if (currentSlug.includes("anual")) {
        targetSlug = currentSlug.replace("anual", "mensal");
      }
    }

    if (targetSlug === currentSlug) return;

    const url = `/reativacao?plano=${targetSlug}&step=0`;
    router.push(url);
  };

  const phoneFly = "555493075665";
  const msgToFly = "Olá fly, vamos organizar minha vida financeira";
  const talkToFly = `https://wa.me/${phoneFly}?text=${encodeURIComponent(
    msgToFly
  )}`;
  
  return (
    <div>
      <div className="flex flex-col gap-8">
        {error && (
          <div className="text-red-600 bg-red-100 border border-red-300 px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* FORM (independente de step, desde que não seja 2) */}
        {step !== 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-4 bg-white rounded-md shadow-[0_20px_60px_rgba(15,23,42,0.20)] border border-slate-200 p-6 md:p-8">
              {/* Cartão de crédito */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-2 justify-between lg:items-center">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <CreditCard /> Cartão de crédito
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <CheckoutCreditCard
                      name={form.cardName}
                      number={form.cardNumber}
                      expiry={form.expiry}
                      className="mb-4"
                      brand={cardBrand}
                    />
                  </div>

                  <div className="flex flex-col gap-4 md:col-span-2">
                    <CleaveInput
                      name="cardNumber"
                      placeholder="Número do cartão"
                      options={{ creditCard: true }}
                      className={`${inputClasses} col-span-2`}
                      onChange={handleChange}
                      value={form.cardNumber}
                      disabled={loading}
                    />
                    <div className="flex gap-4">
                      <CleaveInput
                        name="expiry"
                        placeholder="MM/AA"
                        options={{ date: true, datePattern: ["m", "y"] }}
                        className={inputClasses}
                        onChange={handleChange}
                        value={form.expiry}
                        disabled={loading}
                      />
                      <CleaveInput
                        name="cvv"
                        placeholder="CVV"
                        options={{ blocks: [3], numericOnly: true }}
                        className={inputClasses}
                        onChange={handleChange}
                        value={form.cvv}
                        disabled={loading}
                      />
                    </div>
                    <input
                      name="cardName"
                      placeholder="Nome no cartão"
                      value={form.cardName}
                      onChange={handleChange}
                      className={inputClasses}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Botões Continuar / Voltar */}
              <div
                className={clsx(
                  "flex",
                  step > 0 ? "justify-between" : "justify-end"
                )}
              >
                {step > 0 && (
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 border rounded-md flex gap-2"
                    disabled={loading}
                  >
                    <MoveLeft /> Voltar
                  </button>
                )}
                <button
                  disabled={loading}
                  onClick={handleSubmit}
                  className={clsx(
                    "px-6 py-2 rounded-md font-medium cursor-pointer",
                    loading
                      ? "bg-gray-300"
                      : "bg-primary text-white hover:opacity-90"
                  )}
                >
                  {loading ? (
                    "Aguarde..."
                  ) : (
                    <span className="flex gap-2">
                      Renovar Assinatura <ShoppingCart />
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="col-span-1">
              <PlanResume
                isAnnual={isAnnual}
                planLabel={planLabel}
                price={priceNumber}
                onChangePeriod={handleChangePeriod}
                step={step}
                user={sessionUser}
              />
            </div>
          </div>
        )}

        {/* TELA DE SUCESSO */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="w-full ">
                <div className="rounded-2xl bg-gradient-to-r from-primary/15 via-sky-500/10 to-primary/15 p-[1px] shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
                  <div className="rounded-2xl bg-white p-6 md:p-8 text-slate-800 ">
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
                        <CheckCircle size={32} />
                      </div>

                      <h2 className="text-2xl md:text-3xl font-bold text-[#333C4D]">
                        Assinatura ativada com sucesso!
                      </h2>
                      <p className="mt-2 text-sm md:text-base text-gray-500 max-w-md">
                        Sua assinatura <strong>{planLabel}</strong> foi
                        confirmada. Veja abaixo o resumo do seu pedido.
                      </p>

                      <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Acesso liberado imediatamente
                      </span>
                    </div>

                    <div className="mt-6 grid gap-6 md:grid-cols-2 text-sm">
                      <div className="space-y-3 border-b border-gray-200 pb-4 md:border-b-0 md:pb-0">
                        <h3 className="text-base font-semibold text-[#333C4D]">
                          Plano assinado
                        </h3>
                        <p>
                          <span className="text-xs uppercase text-gray-400">
                            Plano
                          </span>
                          <br />
                          <span className="font-medium">{planLabel}</span>
                        </p>
                        <p>
                          <span className="text-xs uppercase text-gray-400">
                            Valor
                          </span>
                          <br />
                          <span className="font-semibold">
                            {formatCurrency(priceNumber)}
                          </span>
                        </p>
                        <p>
                          <span className="text-xs uppercase text-gray-400">
                            Forma de pagamento
                          </span>
                          <br />
                          <span>Cartão de crédito</span>
                        </p>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-base font-semibold text-[#333C4D]">
                          Informações do usuário
                        </h3>
                        <p>
                          <span className="text-xs uppercase text-gray-400">
                            Cliente
                          </span>
                          <br />
                          <span className="font-medium">
                            {user?.userData?.user?.name ?? "-"}
                          </span>
                        </p>
                        <p>
                          <span className="text-xs uppercase text-gray-400">
                            E-mail
                          </span>
                          <br />
                          <span>{user?.userData?.user?.email ?? "-"}</span>
                        </p>
                        <p>
                          <span className="text-xs uppercase text-gray-400">
                            WhatsApp
                          </span>
                          <br />
                          <span>{user?.userData?.user?.phone ?? "-"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-gray-200 pt-4">
                      <h3 className="text-base font-semibold text-[#333C4D]">
                        Próximos passos
                      </h3>
                      <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                        <li>• Acesse o dashboard para configurar suas metas.</li>
                        <li>
                          • Conecte suas contas e cartões para importar
                          lançamentos.
                        </li>
                        <li>
                          • Fale com a Fly no WhatsApp se precisar de ajuda.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row lg:justify-between gap-4 lg:gap-6">
              <Link
                href="/login"
                className="w-full lg:w-auto px-4 py-2.5 border rounded-md border-gray-300 flex gap-2 items-center justify-center text-sm md:text-base hover:bg-gray-50 transition"
              >
                Ir para o dashboard <MoveRight size={18} />
              </Link>

            <Link
                href={talkToFly}
                target="_blank"
                className={clsx(
                  "w-full lg:w-auto px-4 py-2.5 rounded-md font-medium cursor-pointer flex gap-2 items-center justify-center",
                  "bg-primary text-white hover:opacity-90 transition text-sm md:text-base"
                )}
              >
                <span className="flex gap-2 items-center">
                  Falar com a Fly
                  <Image
                    src={whatsappIcon}
                    alt="whatsapp icone"
                    width={20}
                    height={20}
                  />
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface PlanResumeProps {
  planLabel: string;
  isAnnual: boolean;
  price: number;
  step: number;
  user?: User | null;
  onChangePeriod: (period: "MONTHLY" | "ANNUAL") => void;
}

function PlanResume({
  planLabel,
  isAnnual,
  price,
  step,
  user,
  onChangePeriod,
}: PlanResumeProps) {
  const total = price;

  const hasDiscount = isAnnual;
  const subtotal = hasDiscount ? total / 0.9 : total;
  const discount = hasDiscount ? subtotal - total : 0;
  const installments = isAnnual ? 12 : 1;
  const installmentValue = total / installments;

  const userName = user?.name ?? "-";
  const userEmail = user?.email ?? "-";
  const userPhone = user?.phone ?? "-";

  return (
    <div className="bg-white rounded-md shadow-md flex flex-col h-full overflow-hidden">
      <div className="flex rounded-lg">
        <button
          type="button"
          onClick={() => onChangePeriod("MONTHLY")}
          className={clsx(
            "flex-1 py-2 text-sm md:text-sm font-semibold",
            !isAnnual ? "bg-primary text-white " : "bg-white text-primary"
          )}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => onChangePeriod("ANNUAL")}
          className={clsx(
            "flex-1 py-2 text-sm md:text-sm font-semibold",
            isAnnual ? "bg-primary text-white " : "bg-white text-primary"
          )}
        >
          Anual
        </button>
      </div>

      <div className="p-4 md:p-5 flex-1 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-700">Detalhes</h3>
          <h3 className="text-base font-semibold text-slate-700">
            {planLabel}
          </h3>
        </div>

        <dl className="space-y-1 text-xs md:text-sm text-slate-700">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatCurrency(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Parcelas</dt>
            <dd>{installments}x</dd>
          </div>
          <div className="flex justify-between">
            <dt>Valor das parcelas</dt>
            <dd>{formatCurrency(installmentValue)}</dd>
          </div>
          {hasDiscount && (
            <div className="flex justify-between text-emerald-600">
              <dt>Desconto</dt>
              <dd>- {formatCurrency(discount)}</dd>
            </div>
          )}
        </dl>

        <div className="pt-3 border-t border-slate-200">
          <h4 className="text-xs md:text-base font-semibold text-slate-700 mb-2">
            Benefícios
          </h4>
          <ul className="space-y-1 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              Registro de gastos e receitas
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              Categorias ilimitadas
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              Acesso ao dashboard financeiro
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              Plataforma de educação financeira
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              Mensagens de relatório pela Fly
            </li>
          </ul>
        </div>

        {step !== 2 && (
          <div className="pt-3 border-t border-slate-200 text-sm md:text-sm text-slate-700">
            <h4 className="font-semibold mb-2">Informações do usuário</h4>
            <p>
              <strong>Cliente:</strong> {userName}
            </p>
            <p>
              <strong>E-mail:</strong> {userEmail}
            </p>
            <p>
              <strong>WhatsApp:</strong> {userPhone}
            </p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 bg-primary h-20 text-white flex items-center justify-between">
        <span className="text-sm md:text-2xl font-semibold">Total</span>
        <span className="text-lg md:text-4xl font-extrabold">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
}
