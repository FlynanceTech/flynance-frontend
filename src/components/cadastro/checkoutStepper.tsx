/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, CheckCircle, CreditCard, MoveLeft, MoveRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import LegalDocsModal from "@/components/ui/LegalDocsModal";
import whatsappIcon from "../../../public/icons/whatsapp.svg";

import { useUsers } from "@/hooks/query/useUsers";
import { useUserSession } from "@/stores/useUserSession";

import { UserDTO } from "@/types/user";
import { PlansResponse } from "@/types/plan";

import api from "@/lib/axios"; // axiosInstance com token
import { getUsers } from "@/services/users"; // fallback (lista)

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
import { CheckoutCreditCard } from "@/app/dashboard/components/CreditCard";

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

const digits = (s: string) => s.replace(/\D/g, "");
const normalizeDigits = (v?: string) => (v ?? "").replace(/\D/g, "");
const normalizeEmail = (email?: string) => (email ?? "").trim().toLowerCase();

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

type CheckoutStepperProps = {
  plan: PlansResponse;
  step: number;
  onStepChange: (nextStep: number) => void;
};

// Stripe promise (não recriar por render)
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

type AnnualBilling = "UPFRONT" | "INSTALLMENTS";

const ANNUAL_COUPON_CODE = "FLY10" as const;
const ANNUAL_DISCOUNT_PCT = 0.10;

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function CheckoutStepper(props: CheckoutStepperProps) {
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

function CheckoutStepperInner({ plan, step, onStepChange }: CheckoutStepperProps) {
  const stripe = useStripe();
  const elements = useElements();

  const router = useRouter();
  const searchParams = useSearchParams();
  const revalidate = searchParams.get("revalidate");

  const [legalOpen, setLegalOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState<LegalDocKey>("termos");

  const [form, setForm] = useState<FormDTO>(initialForm);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // novo: escolha do anual
  const [annualBilling, setAnnualBilling] = useState<AnnualBilling>("UPFRONT");

  // Stripe element states
  const [cardNumberComplete, setCardNumberComplete] = useState(false);
  const [cardExpiryComplete, setCardExpiryComplete] = useState(false);
  const [cardCvcComplete, setCardCvcComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const { createMutation, updateMutation } = useUsers();
  const { user, fetchAccount } = useUserSession();

  const [userFly, setUserFly] = useState<UserDTO | undefined>(undefined);
  const [leadCreated, setLeadCreated] = useState(false);

  // anti-loop de create
  const lastLeadKeyRef = useRef<string | null>(null);

  // debounce de sync
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (revalidate) fetchAccount();
  }, [revalidate, fetchAccount]);

  // ---------------------------
  // 1) Hidrata com sessão
  // ---------------------------
  useEffect(() => {
    if (!user?.userData?.user) return;

    const sessionUser = user.userData.user;

    setForm((prev) => ({
      ...prev,
      name: sessionUser.name ?? prev.name,
      email: (sessionUser as any).email ?? prev.email,
      phone: (sessionUser as any).phone ?? prev.phone,
      cpf: (sessionUser as any).cpfCnpj ?? prev.cpf,
      postalCode: (sessionUser as any).postalCode ?? prev.postalCode,
      address: (sessionUser as any).address ?? prev.address,
      addressNumber: (sessionUser as any).addressNumber ?? prev.addressNumber,
      addressComplement: (sessionUser as any).addressComplement ?? prev.addressComplement,
      district: (sessionUser as any).district ?? prev.district,
      city: (sessionUser as any).city ?? prev.city,
      state: (sessionUser as any).state ?? prev.state,
    }));

    setUserFly(sessionUser);
    setLeadCreated(true);
  }, [user]);

  const isAnnual = plan.slug?.toLowerCase().includes("anual");
  const priceNumber = Number((plan.priceCents / 100).toFixed(2));
  const planLabel = plan.name || plan.slug || "Plano Flynance";
  const trialDays = (plan as any).trialDays ?? 3;

  useEffect(() => {
    if (!isAnnual) setAnnualBilling("UPFRONT");
  }, [isAnnual]);

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
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const inputClasses =
    "p-3 border border-gray-300 rounded-md w-full focus:outline focus:outline-2 focus:outline-secondary focus:outline-offset-2";

  const handleBack = () => onStepChange(Math.max(step - 1, 0));

  // ---------------------------
  // helpers de erro / conflitos
  // ---------------------------
  const isAlreadyRegisteredError = (err: unknown) => {
    if (!axios.isAxiosError(err)) return false;

    const status = err.response?.status;
    const msg = (err.response?.data?.message ?? "").toString().toLowerCase();

    if (status === 409) return true;
    return msg.includes("já cadastrado") || msg.includes("ja cadastrado");
  };

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

  // ---------------------------
  // 2) GET helper (tenta e retorna null em 404)
  // ---------------------------
  async function safeGet<T>(path: string, params?: Record<string, any>) {
    try {
      const res = await api.get<T>(path, params ? { params } : undefined);
      return res.data as any;
    } catch (err: any) {
      if (axios.isAxiosError(err) && err.response?.status === 404) return null;
      throw err;
    }
  }

  // ---------------------------
  // 3) Busca usuário (fallbacks)
  // ---------------------------
  async function findUserByPhoneAny(phoneE164: string): Promise<UserDTO | null> {
    const e164 = normalizeDigits(phoneE164);
    if (!e164) return null;

    const national = e164.startsWith("55") ? e164.slice(2) : e164;

    const candidates: Array<() => Promise<UserDTO | null>> = [
      async () => (await safeGet<UserDTO>("/user/by-phone", { phone: e164 })) as any,
      async () => (await safeGet<UserDTO>("/user/byPhone", { phone: e164 })) as any,
      async () => (await safeGet<UserDTO>(`/user/phone/${e164}`)) as any,
      async () => (await safeGet<UserDTO>(`/user/by-phone/${e164}`)) as any,

      async () => (await safeGet<UserDTO>("/user/by-phone", { phone: national })) as any,
      async () => (await safeGet<UserDTO>("/user/byPhone", { phone: national })) as any,
      async () => (await safeGet<UserDTO>(`/user/phone/${national}`)) as any,
      async () => (await safeGet<UserDTO>(`/user/by-phone/${national}`)) as any,
    ];

    for (const fn of candidates) {
      const u = await fn();
      if (u && (u as any).id) return u as any;
    }
    return null;
  }

  async function findUserByEmailAny(emailNorm: string): Promise<UserDTO | null> {
    if (!emailNorm) return null;

    const candidates: Array<() => Promise<UserDTO | null>> = [
      async () => (await safeGet<UserDTO>(`/user/by-email/${emailNorm}`)) as any, // query param
    ];

    for (const fn of candidates) {
      const u = await fn();
      if (u && (u as any).id) return u as any;
    }
    return null;
  }

  async function findExistingUserByPhoneOrEmail(phoneE164: string, emailNorm: string): Promise<UserDTO | null> {
    const byEmail = await findUserByEmailAny(emailNorm);
    if (byEmail?.id) return byEmail;

    const byPhone = await findUserByPhoneAny(phoneE164);
    if (byPhone?.id) return byPhone;

    try {
      const list = await getUsers();
      const phoneDigits = normalizeDigits(phoneE164);
      const found =
        list.find((u) => normalizeEmail((u as any).email) === emailNorm) ??
        list.find((u) => normalizeDigits((u as any).phone) === phoneDigits) ??
        null;

      return (found as any) ?? null;
    } catch {
      return null;
    }
  }

  // ---------------------------
  // 4) Atualiza dados no user (somente o que mudou)
  // ---------------------------
  async function syncUserWithFormIfNeeded(
    base: UserDTO,
    snap: { name: string; email: string; emailNorm: string; phoneE164: string; cpfDigits: string }
  ): Promise<UserDTO> {
    if (!base?.id) return base;

    const currentName = (base as any).name ?? "";
    const currentEmail = normalizeEmail((base as any).email ?? "");
    const currentPhoneDigits = normalizeDigits((base as any).phone ?? "");
    const currentCpf = normalizeDigits((base as any).cpfCnpj ?? "");

    const patch: any = {};

    if (snap.name && snap.name !== currentName) patch.name = snap.name;
    if (snap.email && snap.emailNorm !== currentEmail) patch.email = snap.email;

    const snapPhoneDigits = normalizeDigits(snap.phoneE164);
    if (snapPhoneDigits && snapPhoneDigits !== currentPhoneDigits) patch.phone = snap.phoneE164;

    if (snap.cpfDigits && snap.cpfDigits.length >= 11 && snap.cpfDigits !== currentCpf) {
      patch.cpfCnpj = snap.cpfDigits;
    }

    if (Object.keys(patch).length === 0) return base;

    const updated = await updateMutation.mutateAsync({ id: base.id, data: patch });
    return { ...(base as any), ...(updated as any) } as any;
  }

  // ---------------------------
  // 5) Resolve user (create-or-get) + sync
  // ---------------------------
  async function resolveUserAndSync(): Promise<UserDTO> {
    const sessionUser = user?.userData?.user;
    const snap = {
      name: formSnapshot.name,
      email: formSnapshot.email,
      emailNorm: formSnapshot.emailNorm,
      phoneE164: formSnapshot.phoneE164,
      cpfDigits: formSnapshot.cpfDigits,
    };

    if (!snap.name || !isValidEmail(snap.email) || !isValidWhatsAppBR(snap.phoneE164)) {
      throw new Error("Preencha nome, e-mail e WhatsApp válido para continuar.");
    }

    if (userFly?.id) {
      try {
        const synced = await syncUserWithFormIfNeeded(userFly, snap);
        setUserFly(synced);
        return synced;
      } catch (err) {
        if (isAlreadyRegisteredError(err)) {
          const existing = await findExistingUserByPhoneOrEmail(snap.phoneE164, snap.emailNorm);
          if (!existing?.id) {
            throw new Error("E-mail ou WhatsApp já estão em uso. Use outro e-mail/WhatsApp ou faça login.");
          }

          try {
            const syncedExisting = await syncUserWithFormIfNeeded(existing, snap);
            setUserFly(syncedExisting);
            return syncedExisting;
          } catch {
            setUserFly(existing);
            return existing;
          }
        }
        throw err;
      }
    }

    if (sessionUser?.id) {
      try {
        const synced = await syncUserWithFormIfNeeded(sessionUser, snap);
        setUserFly(synced);
        return synced;
      } catch (err) {
        if (isAlreadyRegisteredError(err)) {
          const existing = await findExistingUserByPhoneOrEmail(snap.phoneE164, snap.emailNorm);
          if (!existing?.id) {
            throw new Error("E-mail ou WhatsApp já estão em uso. Use outro e-mail/WhatsApp ou faça login.");
          }

          try {
            const syncedExisting = await syncUserWithFormIfNeeded(existing, snap);
            setUserFly(syncedExisting);
            return syncedExisting;
          } catch {
            setUserFly(existing);
            return existing;
          }
        }
        throw err;
      }
    }

    try {
      const created = await createMutation.mutateAsync({
        name: snap.name,
        email: snap.email,
        phone: snap.phoneE164,
      });

      const u = created?.user as UserDTO | undefined;
      if (!u?.id) throw new Error("Não foi possível criar o usuário.");

      try {
        const synced = await syncUserWithFormIfNeeded(u, snap);
        setUserFly(synced);
        return synced;
      } catch {
        setUserFly(u);
        return u;
      }
    } catch (err) {
      if (isAlreadyRegisteredError(err)) {
        const existing = await findExistingUserByPhoneOrEmail(snap.phoneE164, snap.emailNorm);
        if (!existing?.id) {
          throw new Error("E-mail ou WhatsApp já estão em uso. Use outro e-mail/WhatsApp ou faça login.");
        }

        try {
          const syncedExisting = await syncUserWithFormIfNeeded(existing, snap);
          setUserFly(syncedExisting);
          return syncedExisting;
        } catch {
          setUserFly(existing);
          return existing;
        }
      }
      throw err;
    }
  }

  // ---------------------------
  // 6) Auto-lead
  // ---------------------------
  useEffect(() => {
    if (leadCreated) return;

    const sessionUser = user?.userData?.user;
    if (sessionUser?.id) {
      setUserFly(sessionUser);
      setLeadCreated(true);
      return;
    }

    if (!isMinDataValid) return;

    const key = `${formSnapshot.name}|${formSnapshot.emailNorm}|${normalizeDigits(formSnapshot.phoneE164)}`;
    if (lastLeadKeyRef.current === key) return;
    lastLeadKeyRef.current = key;

    const t = setTimeout(() => {
      resolveUserAndSync()
        .then(() => setLeadCreated(true))
        .catch((err) => console.error("Auto-lead resolve error:", err));
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadCreated, user?.userData?.user, isMinDataValid, formSnapshot.name, formSnapshot.emailNorm, formSnapshot.phoneE164]);

  // ---------------------------
  // 7) Auto-sync (debounced)
  // ---------------------------
  useEffect(() => {
    if (!userFly?.id) return;

    const ok = !!formSnapshot.name && isValidEmail(formSnapshot.email) && isValidWhatsAppBR(formSnapshot.phoneE164);
    if (!ok) return;

    const syncKey = `${userFly.id}|${formSnapshot.name}|${formSnapshot.emailNorm}|${normalizeDigits(formSnapshot.phoneE164)}|${formSnapshot.cpfDigits}`;
    if (lastSyncedKeyRef.current === syncKey) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    syncTimerRef.current = setTimeout(() => {
      syncUserWithFormIfNeeded(userFly, {
        name: formSnapshot.name,
        email: formSnapshot.email,
        emailNorm: formSnapshot.emailNorm,
        phoneE164: formSnapshot.phoneE164,
        cpfDigits: formSnapshot.cpfDigits,
      })
        .then((synced) => {
          lastSyncedKeyRef.current = syncKey;
          setUserFly(synced);
        })
        .catch((err) => console.error("Auto-sync error:", err));
    }, 650);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userFly?.id, formSnapshot.name, formSnapshot.emailNorm, formSnapshot.phoneE164, formSnapshot.cpfDigits]);

  type BillingPeriod = "MONTHLY" | "ANNUAL";

  const handleChangePeriod = (period: BillingPeriod) => {
    if (!plan.slug) return;

    const currentSlug = plan.slug.toLowerCase();
    let targetSlug = currentSlug;

    if (period === "ANNUAL") {
      if (currentSlug.includes("mensal")) targetSlug = currentSlug.replace("mensal", "anual");
    } else {
      if (currentSlug.includes("anual")) targetSlug = currentSlug.replace("anual", "mensal");
    }

    if (targetSlug === currentSlug) return;
    router.push(`/cadastro/checkout?plano=${targetSlug}&step=0`);
  };

  // ---------------------------
  // Stripe helpers
  // ---------------------------
  async function createSetupIntent(userId: string): Promise<{ clientSecret: string; customerId?: string | null }> {
    const res = await api.post("/billing/setup-intent", { userId });
    const data = res.data ?? {};

    const clientSecret =
      data.clientSecret ??
      data.client_secret ??
      data?.setupIntent?.client_secret ??
      data?.setup_intent?.client_secret;

    if (!clientSecret || typeof clientSecret !== "string") {
      throw new Error("Não foi possível iniciar o pagamento (SetupIntent sem clientSecret).");
    }

    return { clientSecret, customerId: data.customerId ?? data.customer_id ?? null };
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
  // Submit: SetupIntent -> confirm -> create subscription
  // ---------------------------
  const handleSubmit = async () => {
    if (step === 2) return;

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

      if (!form.cardName?.trim()) {
        throw new Error("Informe o nome no cartão.");
      }

      // Validação rápida do Stripe Elements
      if (!cardNumberComplete || !cardExpiryComplete || !cardCvcComplete) {
        throw new Error("Preencha corretamente os dados do cartão.");
      }

      const ensuredUser = await resolveUserAndSync();

      // 1) SetupIntent (backend cria/garante customer do Stripe)
      const { clientSecret } = await createSetupIntent(ensuredUser.id);

      // 2) Confirmar cartão no Stripe (gera pm_...)
      const paymentMethodId = await confirmCardSetup(clientSecret);

      // 3) Criar assinatura
      const promoCode = isAnnual
        ? (form.promoCode?.trim() || ANNUAL_COUPON_CODE)
        : undefined;

      const payload: any = {
        userId: ensuredUser.id,
        planId: plan.id,
        paymentMethodId,
        promoCode,
      };

      if (isAnnual) {
        payload.annualBilling = annualBilling; // "UPFRONT" | "INSTALLMENTS"
      }
      await api.post("/billing/subscription", payload);

      setLoading(false);
      onStepChange(2);
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

  return (
    <div>
      <div className="flex flex-col gap-8">
        {error && (
          <div className="text-red-600 bg-red-100 border border-red-300 px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        {step !== 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-1 lg:col-span-2 flex flex-col gap-4 bg-white rounded-md shadow-[0_20px_60px_rgba(15,23,42,0.20)] border border-slate-200 p-6 md:p-8">
              {/* Dados do usuário */}
              <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
                <h2 className="text-2xl font-bold text-[#333C4D]">
                  Informações de usuário
                </h2>

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
                    disabled={loading}
                  />

                  <input
                    name="phone"
                    placeholder="(11) 91234-5678"
                    value={form.phone}
                    onChange={handleChange}
                    className={inputClasses}
                    disabled={loading}
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
                      className="text-primary underline  hover:font-bold cursor-pointer"
                    >
                      privacidade
                    </button>

                    {" ("}
                    <button
                      type="button"
                      onClick={() => openLegal("cookies")}
                      className="text-primary underline  hover:font-bold cursor-pointer"
                    >
                      cookies
                    </button>
                    {")."}
                  </label>
                </div>
              </div>

              {/* Cartão de crédito (Stripe Elements) */}
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
                    placeholder={!isAnnual ? "Cupom indisponível no mensal" : "Cupom (padrão: FLY10)"}
                    value={form.promoCode}
                    onChange={handleChange}
                    className={clsx(
                      inputClasses,
                      !isAnnual && "bg-gray-50 text-gray-400 cursor-not-allowed"
                    )}
                    disabled={loading || !isAnnual}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <div className={inputClasses}>
                      <CardNumberElement
                        onChange={(e) => {
                          console.log(e.elementType, e.complete, e);
                          setCardNumberComplete(e.complete);
                          setCardError(e.error?.message ?? null);
                        }}
                        options={{
                          style: {
                            base: { fontSize: "16px" },
                          },
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Número do cartão</p>
                  </div>

                  <div className="md:col-span-1">
                    <div className={inputClasses}>
                      <CardExpiryElement
                        onChange={(e) => {
                          console.log(e.elementType, e.complete, e);
                          setCardExpiryComplete(e.complete);
                          setCardError(e.error?.message ?? null);
                        }}
                        options={{
                          style: {
                            base: { fontSize: "16px" },
                          },
                        }}
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
                        options={{
                          style: {
                            base: { fontSize: "16px" },
                          },
                        }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">CVV</p>
                  </div>
                </div>

                {cardError && (
                  <div className="text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-md text-sm">
                    {cardError}
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className={clsx("flex", step > 0 ? "justify-between" : "justify-end")}>
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
                  disabled={loading || !stripe || !elements}
                  onClick={handleSubmit}
                  className={clsx(
                    "px-6 py-2 rounded-md font-medium cursor-pointer flex items-center justify-center gap-2",
                    loading ? "bg-gray-300" : "bg-primary text-white hover:opacity-90"
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
                step={step}
                form={form}
              />
            </div>
          </div>
        )}

        {/* Sucesso */}
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
                        Sua assinatura <strong>{planLabel}</strong> foi confirmada.
                        Veja abaixo o resumo do seu pedido.
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
                          <span className="text-xs uppercase text-gray-400">Plano</span>
                          <br />
                          <span className="font-medium">{planLabel}</span>
                        </p>
                        <p>
                          <span className="text-xs uppercase text-gray-400">Valor</span>
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
                      <h3 className="text-base font-semibold text-[#333C4D]">
                        Próximos passos
                      </h3>
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
      <LegalDocsModal
        open={legalOpen}
        onClose={() => setLegalOpen(false)}
      />
    </div>
  );
}

interface PlanResumeProps {
  planLabel: string;
  isAnnual: boolean;
  price: number;
  trialDays: number;
  step: number;
  form: FormDTO;
  annualBilling: AnnualBilling;
  onAnnualBillingChange: (v: AnnualBilling) => void;
  onChangePeriod: (period: "MONTHLY" | "ANNUAL") => void;
}

function PlanResume({
  planLabel,
  isAnnual,
  price,
  trialDays,
  step,
  form,
  onChangePeriod,
  annualBilling,
  onAnnualBillingChange,
}: PlanResumeProps) {
  // Exibição: no anual "à vista" você pode mostrar desconto / comparação,
  // mas o valor real vem do Stripe (cupom etc). Aqui é só UI.
  const effectivePromo = (form.promoCode ?? "").trim().toUpperCase();
  const hasDiscount = isAnnual && effectivePromo === ANNUAL_COUPON_CODE;

  const subtotal = price;

  const total = hasDiscount
    ? round2(subtotal * (1 - ANNUAL_DISCOUNT_PCT))
    : subtotal;

  const installments = isAnnual && annualBilling === "INSTALLMENTS" ? 12 : 1;
  const installmentValue = round2(total / installments);

  const discount = hasDiscount ? round2(subtotal - total) : 0;

  const monthlyEquivalent =
    isAnnual ? round2(total / 12) : null;


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

            {annualBilling === "INSTALLMENTS" && (
              <p className="mt-2 text-xs text-slate-600">
                Fidelidade de 12 meses (cobrança mensal). Cancelamento pelo app fica bloqueado.
              </p>
            )}
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

          {hasDiscount && (
            <div className="flex justify-between text-emerald-600">
              <dt>Desconto ({ANNUAL_COUPON_CODE})</dt>
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
              Teste gratuitamente por {trialDays} dias
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

        {step !== 2 && (
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
