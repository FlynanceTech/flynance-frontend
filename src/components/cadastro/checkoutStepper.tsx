/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Check,
  CheckCircle,
  CreditCard,
  MoveLeft,
  MoveRight,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";

import { detectCardBrand } from "@/utils/detectCardBrand";
import { CleaveInput } from "../ui/input";
import whatsappIcon from "../../../public/icons/whatsapp.svg";

import { useUsers } from "@/hooks/query/useUsers";
import { usePaymentMutations } from "@/hooks/query/usePayment";
import { useUserSession } from "@/stores/useUserSession";

import { UserDTO } from "@/types/user";
import { PlansResponse } from "@/types/plan";
import { ClientData, CreatePaymentPayload } from "@/types/payment";
import {
  CardBrand,
  CheckoutCreditCard,
} from "@/app/dashboard/components/CreditCard";

import api from "@/lib/axios"; // ✅ axiosInstance com token
import { getUsers } from "@/services/users"; // fallback (lista)
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

  cardNumber: string;
  cardName: string;
  expiry: string;
  cvv: string;
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
  cardNumber: "",
  cardName: "",
  expiry: "",
  cvv: "",
};

const digits = (s: string) => s.replace(/\D/g, "");
const normalizeDigits = (v?: string) => (v ?? "").replace(/\D/g, "");
const normalizeEmail = (email?: string) => (email ?? "").trim().toLowerCase();

/** Normaliza para E.164 BR SEM + : 55 + DDD + número */
const toE164BR = (phoneRaw?: string) => {
  const d = normalizeDigits(phoneRaw);
  if (!d) return "";
  return d.startsWith("55") ? d : `55${d}`;
};

/**
 * WhatsApp BR (pragmático):
 * - aceita com ou sem 55
 * - DDD válido 11..99
 * - assinante 8 ou 9 dígitos (não exige 9)
 * - assinante não começa com 0
 */
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
  onStepChange: (nextStep: number) => void;
};

export default function CheckoutStepper({
  plan,
  step,
  onStepChange,
}: CheckoutStepperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const revalidate = searchParams.get("revalidate");

  const [form, setForm] = useState<FormDTO>(initialForm);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardBrand, setCardBrand] = useState<CardBrand>("OTHER");

  const { createMutation, updateMutation } = useUsers();
  const { createCustomerMutation, createPaymentMutation } =
    usePaymentMutations();

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
      cardName: prev.cardName || "",
      cpf: (sessionUser as any).cpfCnpj ?? prev.cpf,
      postalCode: (sessionUser as any).postalCode ?? prev.postalCode,
      address: (sessionUser as any).address ?? prev.address,
      addressNumber: (sessionUser as any).addressNumber ?? prev.addressNumber,
      addressComplement:
        (sessionUser as any).addressComplement ?? prev.addressComplement,
      district: (sessionUser as any).district ?? prev.district,
      city: (sessionUser as any).city ?? prev.city,
      state: (sessionUser as any).state ?? prev.state,
    }));

    setUserFly(sessionUser);
    setLeadCreated(true);
  }, [user]);

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

  // ---------------------------
  // helpers de erro / conflitos
  // ---------------------------
  const getApiMessage = (err: unknown) => {
    if (!axios.isAxiosError(err)) return "";
    const msg = err.response?.data?.message;
    return typeof msg === "string" ? msg : "";
  };

  // ⚠️ MAIS ESTRITO (pra não classificar qualquer 400 como "já cadastrado")
  const isAlreadyRegisteredError = (err: unknown) => {
    if (!axios.isAxiosError(err)) return false;

    const status = err.response?.status;
    const msg = (err.response?.data?.message ?? "").toString().toLowerCase();

    // se backend usa 409 para conflito
    if (status === 409) return true;

    // se usa 400 com mensagem explícita
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
      phoneDigitsNational: normalizeDigits(form.phone),
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
  // 3) Busca usuário (múltiplos endpoints)
  //    Isso resolve seu 404 no "getUserByPhone"
  // ---------------------------
  async function findUserByPhoneAny(phoneE164: string): Promise<UserDTO | null> {
    const e164 = normalizeDigits(phoneE164);
    if (!e164) return null;

    const national = e164.startsWith("55") ? e164.slice(2) : e164; // DDD+num

    const candidates: Array<() => Promise<UserDTO | null>> = [
      // query patterns
      async () => (await safeGet<UserDTO>("/user/by-phone", { phone: e164 })) as any,
      async () => (await safeGet<UserDTO>("/user/byPhone", { phone: e164 })) as any,
      async () => (await safeGet<UserDTO>("/user", { phone: e164 })) as any,
      async () => (await safeGet<UserDTO>("/user/search", { phone: e164 })) as any,

      async () => (await safeGet<UserDTO>("/user/by-phone", { phone: national })) as any,
      async () => (await safeGet<UserDTO>("/user/byPhone", { phone: national })) as any,
      async () => (await safeGet<UserDTO>("/user", { phone: national })) as any,
      async () => (await safeGet<UserDTO>("/user/search", { phone: national })) as any,

      // path patterns
      async () => (await safeGet<UserDTO>(`/user/phone/${e164}`)) as any,
      async () => (await safeGet<UserDTO>(`/user/phone/${national}`)) as any,
      async () => (await safeGet<UserDTO>(`/user/by-phone/${e164}`)) as any,
      async () => (await safeGet<UserDTO>(`/user/by-phone/${national}`)) as any,

      // last resort (se seu backend realmente for /user/:id e aceitar phone)
      async () => (await safeGet<UserDTO>(`/user/${e164}`)) as any,
      async () => (await safeGet<UserDTO>(`/user/${national}`)) as any,
    ];

    for (const fn of candidates) {
      try {
        const u = await fn();
        if (u && (u as any).id) return u as any;
      } catch (e) {
        // ignorar erros de rota inexistente (404 já vira null)
        // mas se for 500/401, deixa subir
        throw e;
      }
    }

    return null;
  }

  async function findUserByEmailAny(emailNorm: string): Promise<UserDTO | null> {
    if (!emailNorm) return null;

    const candidates: Array<() => Promise<UserDTO | null>> = [
      async () => (await safeGet<UserDTO>("/user/by-email", { email: emailNorm })) as any,
      async () => (await safeGet<UserDTO>("/user/byEmail", { email: emailNorm })) as any,
      async () => (await safeGet<UserDTO>("/user", { email: emailNorm })) as any,
      async () => (await safeGet<UserDTO>("/user/search", { email: emailNorm })) as any,
      async () => (await safeGet<UserDTO>(`/user/email/${encodeURIComponent(emailNorm)}`)) as any,
      async () => (await safeGet<UserDTO>(`/user/by-email/${encodeURIComponent(emailNorm)}`)) as any,
    ];

    for (const fn of candidates) {
      try {
        const u = await fn();
        if (u && (u as any).id) return u as any;
      } catch (e) {
        throw e;
      }
    }

    return null;
  }

  async function findExistingUserByPhoneOrEmail(
    phoneE164: string,
    emailNorm: string
  ): Promise<UserDTO | null> {
    // 1) email é mais “único” no seu caso de conflito
    const byEmail = await findUserByEmailAny(emailNorm);
    if (byEmail?.id) return byEmail;

    // 2) phone
    const byPhone = await findUserByPhoneAny(phoneE164);
    if (byPhone?.id) return byPhone;

    // 3) fallback: lista e filtra (pior caso)
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
    snap: {
      name: string;
      email: string;
      emailNorm: string;
      phoneE164: string;
      cpfDigits: string;
    }
  ): Promise<UserDTO> {
    if (!base?.id) return base;

    const currentName = (base as any).name ?? "";
    const currentEmail = normalizeEmail((base as any).email ?? "");
    const currentPhoneDigits = normalizeDigits((base as any).phone ?? "");
    const currentCpf = normalizeDigits((base as any).cpfCnpj ?? "");

    const patch: any = {};

    if (snap.name && snap.name !== currentName) patch.name = snap.name;
    if (snap.email && snap.emailNorm !== currentEmail) patch.email = snap.email;

    // salva phone sempre em E164 BR (55...)
    const snapPhoneDigits = normalizeDigits(snap.phoneE164);
    if (snapPhoneDigits && snapPhoneDigits !== currentPhoneDigits) {
      patch.phone = snap.phoneE164;
    }

    if (
      snap.cpfDigits &&
      snap.cpfDigits.length >= 11 &&
      snap.cpfDigits !== currentCpf
    ) {
      patch.cpfCnpj = snap.cpfDigits;
    }

    if (Object.keys(patch).length === 0) return base;

    const updated = await updateMutation.mutateAsync({
      id: base.id,
      data: patch,
    });

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

    if (
      !snap.name ||
      !isValidEmail(snap.email) ||
      !isValidWhatsAppBR(snap.phoneE164)
    ) {
      throw new Error("Preencha nome, e-mail e WhatsApp válido para continuar.");
    }

    // A) se já temos userFly, tenta sync. Se der conflito, resolve para outro user
    if (userFly?.id) {
      try {
        const synced = await syncUserWithFormIfNeeded(userFly, snap);
        setUserFly(synced);
        return synced;
      } catch (err) {
        if (isAlreadyRegisteredError(err)) {
          const existing = await findExistingUserByPhoneOrEmail(
            snap.phoneE164,
            snap.emailNorm
          );

          if (!existing?.id) {
            // aqui é o SEU CENÁRIO: backend diz "já cadastrado" mas lookup falha por rota/formato
            // -> agora tentamos múltiplas rotas; se ainda falhar, a mensagem precisa ser correta
            throw new Error(
              "E-mail ou WhatsApp já estão em uso. Use outro e-mail/WhatsApp ou faça login para continuar."
            );
          }

          // tenta sync no existente (se falhar, só usa ele mesmo)
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

    // B) se existe sessão, usa sessão e tenta sync
    if (sessionUser?.id) {
      try {
        const synced = await syncUserWithFormIfNeeded(sessionUser, snap);
        setUserFly(synced);
        return synced;
      } catch (err) {
        if (isAlreadyRegisteredError(err)) {
          const existing = await findExistingUserByPhoneOrEmail(
            snap.phoneE164,
            snap.emailNorm
          );
          if (!existing?.id) {
            throw new Error(
              "E-mail ou WhatsApp já estão em uso. Use outro e-mail/WhatsApp ou faça login para continuar."
            );
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

    // C) não tem user -> cria
    try {
      const created = await createMutation.mutateAsync({
        name: snap.name,
        email: snap.email,
        phone: snap.phoneE164, // sempre E164
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
      // D) create deu "já cadastrado" -> buscar existente
      if (isAlreadyRegisteredError(err)) {
        const existing = await findExistingUserByPhoneOrEmail(
          snap.phoneE164,
          snap.emailNorm
        );

        if (!existing?.id) {
          throw new Error(
            "E-mail ou WhatsApp já estão em uso. Use outro e-mail/WhatsApp ou faça login para continuar."
          );
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

      // qualquer outro erro real
      throw err;
    }
  }

  // ---------------------------
  // 6) Auto-lead (cria/resolve 1x quando min data válido)
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

    const key = `${formSnapshot.name}|${formSnapshot.emailNorm}|${normalizeDigits(
      formSnapshot.phoneE164
    )}`;

    if (lastLeadKeyRef.current === key) return;
    lastLeadKeyRef.current = key;

    const t = setTimeout(() => {
      resolveUserAndSync()
        .then(() => setLeadCreated(true))
        .catch((err) => {
          // não trava checkout por lead
          console.error("Auto-lead resolve error:", err);
        });
    }, 400);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    leadCreated,
    user?.userData?.user,
    isMinDataValid,
    formSnapshot.name,
    formSnapshot.emailNorm,
    formSnapshot.phoneE164,
  ]);

  // ---------------------------
  // 7) Auto-sync (debounced): se userFly existe e user muda dados, atualiza
  // ---------------------------
  useEffect(() => {
    if (!userFly?.id) return;

    const ok =
      !!formSnapshot.name &&
      isValidEmail(formSnapshot.email) &&
      isValidWhatsAppBR(formSnapshot.phoneE164);

    if (!ok) return;

    const syncKey = `${userFly.id}|${formSnapshot.name}|${formSnapshot.emailNorm}|${normalizeDigits(
      formSnapshot.phoneE164
    )}|${formSnapshot.cpfDigits}`;

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
        .catch((err) => {
          // não trava UI; conflitos resolvemos no submit
          console.error("Auto-sync error:", err);
        });
    }, 650);

    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    userFly?.id,
    formSnapshot.name,
    formSnapshot.emailNorm,
    formSnapshot.phoneE164,
    formSnapshot.cpfDigits,
  ]);

  // ---------------------------
  // Submit: garante user + garante sync antes do pagamento
  // ---------------------------
  const handleSubmit = async () => {
    if (step === 2) return;

    setLoading(true);
    setError(null);

    try {
      if (!acceptedTerms) {
        throw new Error("Você precisa aceitar os termos para continuar.");
      }

      if (
        !formSnapshot.name ||
        !isValidEmail(formSnapshot.email) ||
        !isValidWhatsAppBR(formSnapshot.phoneE164) ||
        !formSnapshot.cpfDigits
      ) {
        throw new Error("Preencha nome, e-mail, WhatsApp válido e CPF.");
      }

      if (!form.cardNumber || !form.cardName || !form.expiry || !form.cvv) {
        throw new Error(
          "Preencha os dados do cartão (número, nome, validade e CVV)."
        );
      }

      // ✅ aqui resolve qualquer cenário
      const ensuredUser = await resolveUserAndSync();

      const customerPayload: ClientData = {
        name: formSnapshot.name,
        email: formSnapshot.email,
        mobilePhone: digits(form.phone),
        cpfCnpj: digits(form.cpf),
        externalReference: user?.userData?.user?.id || ensuredUser.id,
      };

      const customer = await createCustomerMutation.mutateAsync(customerPayload);

      const { month, year } = splitExpiry(form.expiry);

      const paymentPayload: CreatePaymentPayload = {
        customerId: customer.id,
        userId: ensuredUser.id,
        planId: plan.id,
        billingType: "CREDIT_CARD",
        paymentDetails: {
          userId: ensuredUser.id,
          planId: plan.id,
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
      onStepChange(2);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        setError(getErrorMessage(message));
      } else {
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

    router.push(`/cadastro/checkout?plano=${targetSlug}&step=0`);
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

                  <CleaveInput
                    name="phone"
                    placeholder="(11) 91234-5678"
                    options={{
                      delimiters: ["(", ") ", "-"],
                      blocks: [0, 2, 5, 4],
                      numericOnly: true,
                    }}
                    value={form.phone}
                    className={inputClasses}
                    onChange={handleChange}
                    disabled={loading}
                  />

                  <CleaveInput
                    name="cpf"
                    placeholder="CPF"
                    options={{
                      delimiters: [".", ".", "-"],
                      blocks: [3, 3, 3, 2],
                      numericOnly: true,
                    }}
                    value={form.cpf}
                    className={inputClasses}
                    onChange={handleChange}
                    disabled={loading}
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
                    <Link href="/termos" className="text-primary underline">
                      termos
                    </Link>{" "}
                    e{" "}
                    <Link href="/privacidade" className="text-primary underline">
                      privacidade
                    </Link>
                    .
                  </label>
                </div>
              </div>

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
                      disabled={loading}
                    />
                    <div className="flex gap-4">
                      <CleaveInput
                        name="expiry"
                        placeholder="MM/AA"
                        options={{ date: true, datePattern: ["m", "y"] }}
                        className={inputClasses}
                        onChange={handleChange}
                        disabled={loading}
                      />
                      <CleaveInput
                        name="cvv"
                        placeholder="CVV"
                        options={{ blocks: [3], numericOnly: true }}
                        className={inputClasses}
                        onChange={handleChange}
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

              {/* Botões */}
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
                      Continuar <MoveRight />
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
  form: FormDTO;
  onChangePeriod: (period: "MONTHLY" | "ANNUAL") => void;
}

function PlanResume({
  planLabel,
  isAnnual,
  price,
  step,
  form,
  onChangePeriod,
}: PlanResumeProps) {
  const total = price;

  const hasDiscount = isAnnual;
  const subtotal = hasDiscount ? total / 0.9 : total;
  const discount = hasDiscount ? subtotal - total : 0;
  const installments = isAnnual ? 12 : 1;
  const installmentValue = total / installments;

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
              Teste gratuitamente por 3 dias
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
