/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, CheckCircle, CreditCard, MoveRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import LegalDocsModal from "@/components/ui/LegalDocsModal";
import whatsappIcon from "../../../public/icons/whatsapp.svg";

import {
  clearBillingCheckoutSession,
  doesBillingCheckoutSessionMatchIdentity,
} from "@/lib/authSession";
import { readOriginAttribution } from "@/utils/originAttribution";
import {
  createBillingCheckoutSetupIntent,
  createBillingCheckoutSubscription,
  isBillingCheckoutTokenError,
} from "@/services/billingCheckout";
import { captureLead, isExistingAccountCheckoutError, updateLeadBilling } from "@/services/leads";
import { useSignupStore } from "@/stores/useSignupStore";
import { useUserSession } from "@/stores/useUserSession";

import { PlansResponse } from "@/types/plan";

import api from "@/lib/axios";

// Stripe
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  useElements,
  useStripe,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
} from "@stripe/react-stripe-js";

interface FormDTO {
  name: string;
  email: string;
  phone: string;
  cpf: string;

  postalCode: string;
  address: string;
  addressNumber: string;
  addressComplement: string;
  district: string;
  city: string;
  state: string;

  cardName: string;
  promoCode: string;
}

const initialForm: FormDTO = {
  name: "",
  email: "",
  phone: "",
  cpf: "",
  postalCode: "",
  address: "",
  addressNumber: "",
  addressComplement: "",
  district: "",
  city: "",
  state: "",
  cardName: "",
  promoCode: "",
};

type LegalDocKey = "termos" | "privacidade" | "cookies";

const normalizeDigits = (v?: string | null) => (v ?? "").replace(/\D/g, "");
const normalizeEmail = (email?: string | null) => (email ?? "").trim().toLowerCase();
const normalizePhoneIdentity = (phone?: string | null) => {
  const digits = normalizeDigits(phone);
  if (digits.startsWith("55") && digits.length >= 12) {
    return digits.slice(2);
  }
  return digits;
};

/** Normaliza para E.164 BR SEM + : 55 + DDD + número */
const toE164BR = (phoneRaw?: string) => {
  const d = normalizeDigits(phoneRaw);
  if (!d) return "";
  return d.startsWith("55") ? d : `55${d}`;
};

const isValidWhatsAppBR = (phone?: string) => {
  const d = normalizeDigits(phone);
  if (!d) return false;

  const full = d.startsWith("55") ? d : `55${d}`;
  if (full.length !== 12 && full.length !== 13) return false;

  const ddd = full.slice(2, 4);
  const subscriber = full.slice(4);

  if (!/^[1-9]\d$/.test(ddd)) return false;
  if (!/^\d{8,9}$/.test(subscriber)) return false;
  if (subscriber.startsWith("0")) return false;

  return true;
};

const isValidEmail = (email?: string) =>
  !!email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

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

type CheckoutProps = {
  plan: PlansResponse;
};

// Stripe promise (não recriar por render)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

type AnnualBilling = "UPFRONT" | "INSTALLMENTS";
type ViewState = "CHECKOUT" | "SUCCESS";

const ANNUAL_COUPON_CODE = "FLY20" as const;
const CHECKOUT_DRAFT_STORAGE_KEY = "flynance_checkout_draft_v1";

const round2 = (n: number) => Math.round(n * 100) / 100;

function readCheckoutDraft(): Partial<FormDTO> | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(CHECKOUT_DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Partial<FormDTO>;
  } catch {
    return null;
  }
}

function writeCheckoutDraft(form: FormDTO) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(form));
}

function clearCheckoutDraft() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CHECKOUT_DRAFT_STORAGE_KEY);
}

function doesCheckoutFormMatchUser(
  user: { id?: string | null; email?: string | null; phone?: string | null } | null | undefined,
  snapshot: { emailNorm: string; phoneDigitsComparable: string }
) {
  if (!user?.id) return false;

  const sameEmail = Boolean(snapshot.emailNorm) && normalizeEmail(user.email) === snapshot.emailNorm;
  const samePhone =
    Boolean(snapshot.phoneDigitsComparable) &&
    normalizePhoneIdentity(user.phone) === snapshot.phoneDigitsComparable;

  return sameEmail || samePhone;
}

export default function CheckoutStepper(props: CheckoutProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        locale: "pt-BR",
      }}
    >
      <CheckoutStepperInner {...props} />
    </Elements>
  );
}

function CheckoutStepperInner({ plan }: CheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();

  const router = useRouter();
  const searchParams = useSearchParams();
  const revalidate = searchParams.get("revalidate");
  const advisorInviteToken = (searchParams.get("advisorInviteToken") ?? "").trim();
  const skipCard = searchParams.get("skipCard") === "true" && Boolean(advisorInviteToken);

  const [view, setView] = useState<ViewState>("CHECKOUT");

  const [legalOpen, setLegalOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocKey>("termos");

  const [form, setForm] = useState<FormDTO>(initialForm);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // escolha do anual
  const [annualBilling, setAnnualBilling] = useState<AnnualBilling>("UPFRONT");

  // Stripe element states
  const [cardNumberComplete, setCardNumberComplete] = useState(false);
  const [cardExpiryComplete, setCardExpiryComplete] = useState(false);
  const [cardCvcComplete, setCardCvcComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const signupData = useSignupStore((state) => state.data);
  const { user, fetchAccount } = useUserSession();

  const lastLeadKeyRef = useRef<string | null>(null);
  const hydratedSessionUserIdRef = useRef<string | null>(null);

  function appendCheckoutContext(qs: URLSearchParams) {
    if (revalidate) qs.set("revalidate", revalidate);
    if (advisorInviteToken) qs.set("advisorInviteToken", advisorInviteToken);
  }

  function checkoutPathForPlan(slug: string) {
    const qs = new URLSearchParams();
    if (slug) qs.set("plano", slug);
    appendCheckoutContext(qs);
    return `/cadastro/checkout?${qs.toString()}`;
  }

  // 🔒 Bloqueia acesso via URL (?step=2)
  useEffect(() => {
    const stepParam = searchParams.get("step");
    if (stepParam === "2") {
      const plano = searchParams.get("plano") ?? plan.slug ?? "";
      router.replace(checkoutPathForPlan(plano));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    if (revalidate) fetchAccount();
  }, [revalidate, fetchAccount]);

  // ---------------------------
  // 1) Hidrata com sessão
  // ---------------------------
  useEffect(() => {
    const draft = readCheckoutDraft();
    const hasSignupSeed = Boolean(signupData.name || signupData.email || signupData.phone);

    if (!draft && !hasSignupSeed) return;

    setForm((prev) => ({
      ...prev,
      ...draft,
      name: draft?.name ?? signupData.name ?? prev.name,
      email: normalizeEmail(draft?.email ?? signupData.email ?? prev.email),
      phone: draft?.phone ?? signupData.phone ?? prev.phone,
    }));
  }, [signupData.email, signupData.name, signupData.phone]);

  useEffect(() => {
    writeCheckoutDraft(form);
  }, [form]);

  // ---------------------------
  // Snapshot "limpo" do form
  // ---------------------------
  const formSnapshot = useMemo(() => {
    const name = form.name?.trim() ?? "";
    const email = form.email?.trim() ?? "";
    const emailNorm = normalizeEmail(email);

    const phoneE164 = toE164BR(form.phone);
    const cpfDigits = normalizeDigits(form.cpf);

    return {
      name,
      email,
      emailNorm,
      phoneE164,
      phoneDigitsE164: normalizeDigits(phoneE164),
      phoneDigitsComparable: normalizePhoneIdentity(phoneE164),
      cpfDigits,
    };
  }, [form.name, form.email, form.phone, form.cpf]);

  const isMinDataValid = useMemo(() => {
    return (
      !!formSnapshot.name &&
      isValidEmail(formSnapshot.email) &&
      isValidWhatsAppBR(formSnapshot.phoneE164)
    );
  }, [formSnapshot]);

  useEffect(() => {
    if (!user?.userData?.user) {
      hydratedSessionUserIdRef.current = null;
      return;
    }

    const sessionUser = user.userData.user;
    const sessionUserId = String(sessionUser.id || "").trim();
    if (!sessionUserId) return;
    if (hydratedSessionUserIdRef.current === sessionUserId) return;

    const hasCheckoutIdentity = Boolean(formSnapshot.emailNorm || formSnapshot.phoneDigitsComparable);

    if (hasCheckoutIdentity && !doesCheckoutFormMatchUser(sessionUser, formSnapshot)) {
      return;
    }

    hydratedSessionUserIdRef.current = sessionUserId;

    setForm((prev) => ({
      ...prev,
      name: prev.name || sessionUser.name || "",
      email: prev.email || normalizeEmail((sessionUser as any).email ?? ""),
      phone: prev.phone || (sessionUser as any).phone || "",
      cpf: prev.cpf || (sessionUser as any).cpfCnpj || "",
      postalCode: prev.postalCode || (sessionUser as any).postalCode || "",
      address: prev.address || (sessionUser as any).address || "",
      addressNumber: prev.addressNumber || (sessionUser as any).addressNumber || "",
      addressComplement: prev.addressComplement || (sessionUser as any).addressComplement || "",
      district: prev.district || (sessionUser as any).district || "",
      city: prev.city || (sessionUser as any).city || "",
      state: prev.state || (sessionUser as any).state || "",
    }));
  }, [user, formSnapshot]);

  const isAnnual = plan.slug?.toLowerCase().includes("anual");
  const rawPriceNumber = Number((plan.priceCents / 100).toFixed(2));
  const annualMinTotal = 191.04;
  const priceNumber = isAnnual ? Math.max(rawPriceNumber, annualMinTotal) : rawPriceNumber;
  const planLabel = plan.name || plan.slug || "Plano Flynance";
  const trialDays = (plan as any).trialDays ?? 7;

  useEffect(() => {
    if (!isAnnual) setAnnualBilling("UPFRONT");
  }, [isAnnual]);

  // Cupom default no anual
  useEffect(() => {
    setForm((prev) => {
      const current = (prev.promoCode ?? "").trim();

      // Mensal: limpa
      if (!isAnnual) {
        if (!current) return prev;
        return { ...prev, promoCode: "" };
      }

      // Anual: default FLY10 se vazio
      if (!current) return { ...prev, promoCode: ANNUAL_COUPON_CODE };

      return prev;
    });
  }, [isAnnual]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const nextValue = name === "email" ? normalizeEmail(value) : value;
    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const inputClasses =
    "p-3 border border-gray-300 rounded-md w-full focus:outline focus:outline-2 focus:outline-secondary focus:outline-offset-2";

  useEffect(() => {
    const hasCheckoutIdentity = Boolean(formSnapshot.emailNorm || formSnapshot.phoneDigitsComparable);
    if (!hasCheckoutIdentity) return;

    if (
      doesBillingCheckoutSessionMatchIdentity({
        email: formSnapshot.emailNorm,
        phone: formSnapshot.phoneE164,
      })
    ) {
      return;
    }

    clearBillingCheckoutSession();
  }, [formSnapshot.emailNorm, formSnapshot.phoneDigitsComparable, formSnapshot.phoneE164]);

  // ---------------------------
  // 5b) Captura/atualiza lead (fluxo sem JWT)
  // ---------------------------
  async function captureOrUpdateLead(): Promise<void> {
    const { origin, originRef } = readOriginAttribution();
    await captureLead({
      name: formSnapshot.name,
      email: formSnapshot.emailNorm,
      phone: formSnapshot.phoneE164,
      origin,
      originRef: originRef || undefined,
    });
  }

  // ---------------------------
  // 6) Auto-lead
  // ---------------------------
  useEffect(() => {
    const sessionUser = doesCheckoutFormMatchUser(user?.userData?.user, {
      emailNorm: formSnapshot.emailNorm,
      phoneDigitsComparable: formSnapshot.phoneDigitsComparable,
    })
      ? user?.userData?.user
      : null;
    if (sessionUser?.id) return;

    if (!isMinDataValid) return;

    const key = `${formSnapshot.name}|${formSnapshot.emailNorm}|${normalizeDigits(formSnapshot.phoneE164)}`;
    if (lastLeadKeyRef.current === key) return;
    lastLeadKeyRef.current = key;

    const t = setTimeout(() => {
      captureOrUpdateLead()
        .catch((err) => {
          if (isExistingAccountCheckoutError(err)) return;
          console.error("Auto-lead error:", err);
        });
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    user?.userData?.user,
    isMinDataValid,
    formSnapshot.name,
    formSnapshot.emailNorm,
    formSnapshot.phoneE164,
    formSnapshot.phoneDigitsComparable,
  ]);

  type BillingPeriod = "MONTHLY" | "ANNUAL";

  const handleChangePeriod = (period: BillingPeriod) => {
    if (!plan.slug) return;

    const currentSlug = plan.slug.toLowerCase();

    // O slug do casal não segue o padrão "*-mensal"/"*-anual" do essencial,
    // então mapeamos o par fixo explicitamente.
    const COUPLE_MONTHLY = "flynance-casal";
    const COUPLE_ANNUAL = "flynance-casal-anual";
    if (currentSlug === COUPLE_MONTHLY || currentSlug === COUPLE_ANNUAL) {
      const targetSlug = period === "ANNUAL" ? COUPLE_ANNUAL : COUPLE_MONTHLY;
      if (targetSlug === currentSlug) return;
      router.push(checkoutPathForPlan(targetSlug));
      return;
    }

    const baseSlug = currentSlug.replace("-lancamento", "");
    let targetSlug = baseSlug;

    if (period === "ANNUAL") {
      targetSlug = baseSlug.replace("mensal", "anual");
      // sempre voltar para o anual de lançamento
      targetSlug = `${targetSlug}-lancamento`;
    } else {
      targetSlug = baseSlug.replace("anual", "mensal");
    }

    if (targetSlug === currentSlug) return;
    router.push(checkoutPathForPlan(targetSlug));
  };

  function redirectToCheckoutValidation(message?: string) {
    clearBillingCheckoutSession();
    setLoading(false);
    setError(message ?? "Sua validacao de checkout expirou. Faca login novamente para continuar.");

    const qs = new URLSearchParams();
    if (plan.slug) qs.set("plano", plan.slug);
    appendCheckoutContext(qs);

    const next = `/cadastro/checkout?${qs.toString()}`;
    router.replace(`/login?next=${encodeURIComponent(next)}`);
  }

  function getExistingAccountIdentifierType(err: unknown): "email" | "phone" | "email_phone" {
    if (!axios.isAxiosError(err)) return "email";
    const value = String(err.response?.data?.identifierType ?? "").toLowerCase();
    if (value === "phone" || value === "email_phone") return value;
    return "email";
  }

  function redirectExistingAccountToLogin(identifierType: "email" | "phone" | "email_phone" = "email") {
    clearBillingCheckoutSession();
    setLoading(false);
    setError("Este e-mail já possui uma conta. Faça login para finalizar sua assinatura.");

    if (typeof window !== "undefined") {
      const useWhatsapp = identifierType === "phone";
      window.sessionStorage.setItem("flynance_login_method", useWhatsapp ? "whatsapp" : "email");
      window.sessionStorage.setItem(
        "flynance_login_identifier",
        useWhatsapp ? formSnapshot.phoneE164 : formSnapshot.emailNorm
      );
    }

    const qs = new URLSearchParams();
    if (plan.slug) qs.set("plano", plan.slug);
    appendCheckoutContext(qs);

    const next = `/cadastro/checkout?${qs.toString()}`;
    router.replace(
      `/login?next=${encodeURIComponent(next)}&reason=checkout_existing_account`
    );
  }

  // ---------------------------
  // Stripe helpers
  // ---------------------------
  async function createSetupIntent(userId?: string): Promise<{ clientSecret: string; customerId?: string | null }> {
    return createBillingCheckoutSetupIntent(userId);
  }

  async function confirmCardSetup(clientSecret: string) {
    if (!stripe || !elements) throw new Error("Stripe ainda não carregou. Tente novamente.");

    const cardNumber = elements.getElement(CardNumberElement);
    if (!cardNumber) throw new Error("Cartão não carregou corretamente.");

    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: {
        card: cardNumber,
        billing_details: {
          name: form.cardName || formSnapshot.name,
          email: formSnapshot.email,
          phone: formSnapshot.phoneE164,
        },
      },
    });

    if (result.error) {
      throw new Error(result.error.message || "Erro ao validar cartão.");
    }

    const si = result.setupIntent;
    const pm = si.payment_method;
    if (!pm) throw new Error("PaymentMethod não retornou no SetupIntent.");

    const paymentMethodId = typeof pm === "string" ? pm : pm.id;
    if (!paymentMethodId) throw new Error("PaymentMethod inválido.");

    return paymentMethodId;
  }

  // ---------------------------
  // Totais do resumo (UI)
  // ---------------------------
  const effectivePromo = (form.promoCode ?? "").trim().toUpperCase();

  const subtotal = priceNumber;

  const total = subtotal;

  const installments = isAnnual && annualBilling === "INSTALLMENTS" ? 12 : 1;
  const installmentValue = round2(total / installments);

  // ---------------------------
  // Submit: SetupIntent -> confirm -> create subscription
  // ---------------------------
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setCardError(null);

    try {
      if (!acceptedTerms) throw new Error("Você precisa aceitar os termos para continuar.");

      if (
        !formSnapshot.name ||
        !isValidEmail(formSnapshot.email) ||
        !isValidWhatsAppBR(formSnapshot.phoneE164) ||
        !formSnapshot.cpfDigits
      ) {
        throw new Error("Preencha nome, e-mail, WhatsApp válido e CPF.");
      }

      if (!skipCard) {
        if (!form.cardName?.trim()) {
          throw new Error("Informe o nome no cartão.");
        }
        if (!cardNumberComplete || !cardExpiryComplete || !cardCvcComplete) {
          throw new Error("Preencha corretamente os dados do cartão.");
        }
      }

      // Determina caminho: usuário autenticado (tem JWT) ou novo usuário (fluxo lead)
      const sessionUser = doesCheckoutFormMatchUser(user?.userData?.user, {
        emailNorm: formSnapshot.emailNorm,
        phoneDigitsComparable: formSnapshot.phoneDigitsComparable,
      })
        ? user?.userData?.user
        : null;

      let activeUserId: string | undefined;

      if (sessionUser?.id) {
        activeUserId = sessionUser.id;
        if (formSnapshot.cpfDigits) {
          try {
            await api.patch('/users/me/billing', { cpfCnpj: formSnapshot.cpfDigits });
          } catch {
            // best-effort: CPF sync não bloqueia o checkout
          }
        }
      } else {
        // Novo usuário — captura lead e envia billing sem precisar de userId
        try {
          await captureOrUpdateLead();
          await updateLeadBilling({
            cpfCnpj: formSnapshot.cpfDigits || undefined,
            postalCode: form.postalCode || undefined,
            address: form.address || undefined,
            addressNumber: form.addressNumber || undefined,
            addressComplement: form.addressComplement || undefined,
            district: form.district || undefined,
            city: form.city || undefined,
            state: form.state || undefined,
          });
        } catch (err) {
          if (isExistingAccountCheckoutError(err)) {
            redirectExistingAccountToLogin(getExistingAccountIdentifierType(err));
            return;
          }
          throw err;
        }
      }

      // Fluxo sem cartão: advisor/org paga — só cria a conta e volta ao convite
      if (skipCard) {
        setLoading(false);
        clearCheckoutDraft();
        const inviteUrl = `/advisor/client-invite/accept?token=${encodeURIComponent(advisorInviteToken)}`;
        router.replace(inviteUrl);
        return;
      }

      // 1) SetupIntent — token identifica lead ou user
      let clientSecret: string;
      try {
        ({ clientSecret } = await createSetupIntent(activeUserId));
      } catch (err) {
        if (isBillingCheckoutTokenError(err)) {
          redirectToCheckoutValidation(
            "Sua validacao de checkout expirou. Faca login novamente para continuar."
          );
          return;
        }

        throw err;
      }

      // 2) Confirmar cartão no Stripe (gera pm_...)
      const paymentMethodId = await confirmCardSetup(clientSecret);

      // 3) Criar assinatura
      const promoCode = isAnnual ? (form.promoCode?.trim() || ANNUAL_COUPON_CODE) : undefined;

      const payload: any = {
        planId: plan.id,
        paymentMethodId,
        promoCode,
      };

      if (activeUserId) payload.userId = activeUserId;
      if (isAnnual) payload.annualBilling = annualBilling;
      if (advisorInviteToken) payload.advisorInviteToken = advisorInviteToken;

      try {
        await createBillingCheckoutSubscription(payload);
      } catch (err) {
        if (isBillingCheckoutTokenError(err)) {
          redirectToCheckoutValidation(
            "Sua validacao de checkout expirou. Faca login novamente para continuar."
          );
          return;
        }

        throw err;
      }

      setLoading(false);
      setView("SUCCESS");
      clearCheckoutDraft();

      // remove step se houver (e garante URL limpa)
      const plano = searchParams.get("plano") ?? plan.slug ?? "";
      const qs = new URLSearchParams();
      if (plano) qs.set("plano", plano);
      appendCheckoutContext(qs);
      router.replace(`/cadastro/checkout?${qs.toString()}`);
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? getErrorMessage(err.response?.data?.message ?? err.message)
        : err instanceof Error
        ? err.message
        : "Ocorreu um erro inesperado.";

      setError(msg);
      setLoading(false);
    }
  };

  const openLegal = (doc: LegalDocKey) => {
    setLegalDoc(doc);
    setLegalOpen(true);
  };

  const submitLabel = isAnnual
    ? annualBilling === "INSTALLMENTS"
      ? "Assinar em 12x"
      : "Assinar à vista"
    : "Assinar agora";

  const loadingLabel = useMemo(() => {
    if (!loading) return submitLabel;
    return "Ativando seu acesso…";
  }, [loading, submitLabel]);

  const phoneFly = "555493075665";
  const msgToFly = "Olá fly, vamos organizar minha vida financeira";
  const talkToFly = `https://wa.me/${phoneFly}?text=${encodeURIComponent(msgToFly)}`;

  // label da forma de pagamento (sucesso)
  const paymentLabel = useMemo(() => {
    if (!isAnnual) return "Cartão de crédito";
    return annualBilling === "INSTALLMENTS" ? "Cartão de crédito (12x)" : "Cartão de crédito (à vista)";
  }, [isAnnual, annualBilling]);

  // label do valor no sucesso
  const successValueLabel = useMemo(() => {
    if (!isAnnual) return formatCurrency(priceNumber);
    if (annualBilling === "INSTALLMENTS") return `${installments}x de ${formatCurrency(installmentValue)} (Total: ${formatCurrency(total)})`;
    return formatCurrency(total);
  }, [isAnnual, annualBilling, installments, installmentValue, total, priceNumber]);

  return (
    <div>
      <div className="flex flex-col gap-8">
        {error && (
          <div className="text-red-400 bg-red-100 border border-red-300 px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        {view === "CHECKOUT" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-4 bg-white rounded-md shadow-[0_20px_60px_rgba(15,23,42,0.20)] border border-slate-200 p-6 md:p-8">
              {/* Dados do usuário */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-[#333C4D]">Informações de usuário</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    name="name"
                    placeholder="Nome completo"
                    value={form.name}
                    onChange={handleChange}
                    className={inputClasses}
                    disabled={loading}
                  />

                  <input
                    name="email"
                    placeholder="E-mail"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClasses}
                  />

                  <input
                    name="phone"
                    placeholder="(11) 91234-5678"
                    value={form.phone}
                    onChange={handleChange}
                    className={inputClasses}
                    inputMode="numeric"
                  />

                  <input
                    name="cpf"
                    placeholder="CPF"
                    value={form.cpf}
                    onChange={handleChange}
                    className={inputClasses}
                    disabled={loading}
                    inputMode="numeric"
                  />
                </div>

                <div className="flex items-start gap-2 mt-2">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 cursor-pointer"
                    disabled={loading}
                  />
                  <label htmlFor="acceptTerms" className="text-sm">
                    Li e aceito os{" "}
                    <button
                      type="button"
                      onClick={() => openLegal("termos")}
                      className="text-primary underline hover:font-bold cursor-pointer"
                    >
                      termos
                    </button>
                    {" e "}
                    <button
                      type="button"
                      onClick={() => openLegal("privacidade")}
                      className="text-primary underline hover:font-bold cursor-pointer"
                    >
                      privacidade
                    </button>
                    {" ("}
                    <button
                      type="button"
                      onClick={() => openLegal("cookies")}
                      className="text-primary underline hover:font-bold cursor-pointer"
                    >
                      cookies
                    </button>
                    {")."}
                  </label>
                </div>
              </div>

              {/* Cartão de crédito (Stripe Elements) — oculto quando advisor/org paga */}
              {skipCard && (
                <div className="rounded-xl border border-[#D7EAF5] bg-[#F3FAFF] p-4 text-sm text-[#2F6E91]">
                  <p className="font-semibold">Sem cobrança necessária</p>
                  <p className="mt-1 text-xs">
                    O responsável financeiro desta conta é o seu consultor. Não é necessário cadastrar cartão de crédito.
                  </p>
                </div>
              )}
              {!skipCard && (
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
                <div className="flex flex-col lg:flex-row gap-2 justify-between lg:items-center">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <CreditCard /> Cartão de crédito
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    name="cardName"
                    placeholder="Nome no cartão"
                    value={form.cardName}
                    onChange={handleChange}
                    className={inputClasses}
                    disabled={loading}
                  />

                  <input
                    name="promoCode"
                    placeholder={!isAnnual ? "Cupom indisponível no mensal" : "Cupom (padrão: FLY20)"}
                    value={form.promoCode}
                    onChange={handleChange}
                    className={clsx(inputClasses, !isAnnual && "bg-gray-50 text-gray-400 cursor-not-allowed")}
                    disabled={loading || !isAnnual}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <div className={inputClasses}>
                      <CardNumberElement
                        onChange={(e) => {
                          setCardNumberComplete(e.complete);
                          setCardError(e.error?.message ?? null);
                        }}
                        options={{ style: { base: { fontSize: "16px" } } }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Número do cartão</p>
                  </div>

                  <div className="md:col-span-1">
                    <div className={inputClasses}>
                      <CardExpiryElement
                        onChange={(e) => {
                          setCardExpiryComplete(e.complete);
                          setCardError(e.error?.message ?? null);
                        }}
                        options={{ style: { base: { fontSize: "16px" } } }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Validade</p>
                  </div>

                  <div className="md:col-span-1">
                    <div className={inputClasses}>
                      <CardCvcElement
                        onChange={(e) => {
                          setCardCvcComplete(e.complete);
                          setCardError(e.error?.message ?? null);
                        }}
                        options={{ style: { base: { fontSize: "16px" } } }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">CVV</p>
                  </div>
                </div>

                {cardError && (
                  <div className="text-red-400 bg-red-50 border border-red-200 px-3 py-2 rounded-md text-sm">
                    {cardError}
                  </div>
                )}
              </div>
              )}

              {/* Botões */}
              <div className="flex justify-end">
                <button
                  disabled={loading || (!skipCard && (!stripe || !elements))}
                  onClick={handleSubmit}
                  className={clsx(
                    "px-6 py-2 rounded-md font-medium cursor-pointer flex items-center justify-center gap-2",
                    loading ? "bg-gray-300" : "bg-primary text-primary-foreground hover:opacity-90"
                  )}
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-1">
                      {loadingLabel}
                      <span className="inline-flex w-6 justify-start">
                        <span className="animate-pulse">•</span>
                        <span className="animate-pulse [animation-delay:150ms]">•</span>
                        <span className="animate-pulse [animation-delay:300ms]">•</span>
                      </span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {submitLabel} <MoveRight />
                    </span>
                  )}
                </button>
              </div>
            </div>

            <div className="col-span-1">
              <PlanResume
                isAnnual={isAnnual}
                annualBilling={annualBilling}
                onAnnualBillingChange={setAnnualBilling}
                planLabel={planLabel}
                price={priceNumber}
                trialDays={trialDays}
                onChangePeriod={handleChangePeriod}
                form={form}
                skipCard={skipCard}
              />
            </div>
          </div>
        )}

        {/* Sucesso */}
        {view === "SUCCESS" && (
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
                        Sua assinatura <strong>{planLabel}</strong> foi confirmada. Veja abaixo o resumo do seu pedido.
                      </p>

                      <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Acesso liberado imediatamente
                      </span>
                    </div>

                    <div className="mt-6 grid gap-6 md:grid-cols-2 text-sm">
                      <div className="space-y-3 border-b border-gray-200 pb-4 md:border-b-0 md:pb-0">
                        <h3 className="text-base font-semibold text-[#333C4D]">Plano assinado</h3>

                        <p>
                          <span className="text-xs uppercase text-gray-400">Plano</span>
                          <br />
                          <span className="font-medium">{planLabel}</span>
                        </p>

                        <p>
                          <span className="text-xs uppercase text-gray-400">Valor</span>
                          <br />
                          <span className="font-semibold">{successValueLabel}</span>
                        </p>

                        <p>
                          <span className="text-xs uppercase text-gray-400">Forma de pagamento</span>
                          <br />
                          <span>{paymentLabel}</span>
                        </p>

                        {isAnnual && effectivePromo === ANNUAL_COUPON_CODE && (
                          <p className="text-xs text-emerald-700">
                            Cupom aplicado: <strong>{ANNUAL_COUPON_CODE}</strong> (30 dias grátis)
                          </p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-base font-semibold text-[#333C4D]">Informações do usuário</h3>
                        <p>
                          <span className="text-xs uppercase text-gray-400">Cliente</span>
                          <br />
                          <span className="font-medium">{form.name}</span>
                        </p>
                        <p>
                          <span className="text-xs uppercase text-gray-400">E-mail</span>
                          <br />
                          <span>{form.email}</span>
                        </p>
                        <p>
                          <span className="text-xs uppercase text-gray-400">WhatsApp</span>
                          <br />
                          <span>{form.phone}</span>
                        </p>
                        <p>
                          <span className="text-xs uppercase text-gray-400">CPF</span>
                          <br />
                          <span>{form.cpf}</span>
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-gray-200 pt-4">
                      <h3 className="text-base font-semibold text-[#333C4D]">Próximos passos</h3>
                      <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                        <li>• Acesse o dashboard para configurar suas metas.</li>
                        <li>• Conecte suas contas e cartões para importar lançamentos.</li>
                        <li>• Fale com a Fly no WhatsApp se precisar de ajuda.</li>
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
                  <Image src={whatsappIcon} alt="whatsapp icone" width={20} height={20} />
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>

      <LegalDocsModal open={legalOpen} initialDoc={legalDoc} onClose={() => setLegalOpen(false)} />
    </div>
  );
}

interface PlanResumeProps {
  planLabel: string;
  isAnnual: boolean;
  price: number;
  trialDays: number;
  form: FormDTO;
  annualBilling: AnnualBilling;
  onAnnualBillingChange: (v: AnnualBilling) => void;
  onChangePeriod: (period: "MONTHLY" | "ANNUAL") => void;
  skipCard?: boolean;
}

function PlanResume({
  planLabel,
  isAnnual,
  price,
  trialDays,
  form,
  onChangePeriod,
  annualBilling,
  onAnnualBillingChange,
  skipCard = false,
}: PlanResumeProps) {
  const effectivePromo = (form.promoCode ?? "").trim().toUpperCase();
  const promoTrialDays = isAnnual && effectivePromo === ANNUAL_COUPON_CODE ? 30 : trialDays;
  const couponLabel = "Cupom de 30 dias gratis para quem entrar até março";

  const subtotal = price;

  const total = subtotal;

  const installments = isAnnual && annualBilling === "INSTALLMENTS" ? 12 : 1;
  const installmentValue = round2(total / installments);

  const monthlyEquivalent = isAnnual ? round2(total / 12) : null;

  return (
    <div className="bg-white rounded-md shadow-md flex flex-col h-full overflow-hidden">
      {!skipCard && (
        <div className="flex bg-slate-100">
          <button
            type="button"
            onClick={() => onChangePeriod("MONTHLY")}
            aria-pressed={!isAnnual}
            className={clsx(
              "flex-1 py-2 text-sm md:text-sm font-semibold transition-colors",
              !isAnnual
                ? "bg-white text-primary"
                : "bg-slate-100 text-slate-500 hover:text-slate-700"
            )}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => onChangePeriod("ANNUAL")}
            aria-pressed={isAnnual}
            className={clsx(
              "flex-1 py-2 text-sm md:text-sm font-semibold transition-colors",
              isAnnual
                ? "bg-white text-primary"
                : "bg-slate-100 text-slate-500 hover:text-slate-700"
            )}
          >
            Anual
          </button>
        </div>
      )}

      <div className="p-4 md:p-5 flex-1 flex flex-col gap-4">
        <div className="flex flex-col">
          <h3 className="text-base font-semibold text-slate-700">Detalhes</h3>
          <h3 className="text-base font-semibold text-slate-700">{planLabel}</h3>
        </div>

        {isAnnual && (
          <div className="rounded-md border border-slate-200 p-3">
            <p className="text-xs font-semibold text-slate-600 mb-2">Como você quer pagar?</p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onAnnualBillingChange("UPFRONT")}
                className={clsx(
                  "flex-1 rounded-md border px-3 py-2 text-sm font-semibold",
                  annualBilling === "UPFRONT"
                    ? "border-primary bg-primary text-white"
                    : "border-slate-200 bg-white text-slate-700"
                )}
              >
                À vista
              </button>
              <button
                type="button"
                onClick={() => onAnnualBillingChange("INSTALLMENTS")}
                className={clsx(
                  "flex-1 rounded-md border px-3 py-2 text-sm font-semibold",
                  annualBilling === "INSTALLMENTS"
                    ? "border-primary bg-primary text-white"
                    : "border-slate-200 bg-white text-slate-700"
                )}
              >
                12x
              </button>
            </div>

           {/*  {annualBilling === "INSTALLMENTS" && (
              <p className="mt-2 text-xs text-slate-600">
                Fidelidade de 12 meses (cobrança mensal). Cancelamento pelo app fica bloqueado.
              </p>
            )} */}
          </div>
        )}

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

          {monthlyEquivalent !== null && (
            <div className="flex justify-between">
              <dt>Equivalente por mês</dt>
              <dd>{formatCurrency(monthlyEquivalent)}</dd>
            </div>
          )}

        </dl>

        <div className="pt-3 border-t border-slate-200">
          <h4 className="text-xs md:text-base font-semibold text-slate-700 mb-2">Benefícios</h4>
          <ul className="space-y-1 text-sm text-slate-600">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              Teste gratuitamente por {promoTrialDays} dias
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-primary" />
              {couponLabel}
            </li>
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

        <div className="pt-3 border-t border-slate-200 text-sm md:text-sm text-slate-700">
          <h4 className="font-semibold mb-2">Informações do usuário</h4>
          <p>
            <strong>Cliente:</strong> {form.name || "-"}
          </p>
          <p>
            <strong>E-mail:</strong> {form.email || "-"}
          </p>
          <p>
            <strong>WhatsApp:</strong> {form.phone || "-"}
          </p>
          <p>
            <strong>CPF:</strong> {form.cpf || "-"}
          </p>
        </div>
      </div>

      <div className="px-4 py-3 bg-primary h-20 text-white flex items-center justify-between">
        <span className="text-sm md:text-2xl font-semibold">Total</span>
        <span className="text-lg md:text-4xl font-extrabold">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
