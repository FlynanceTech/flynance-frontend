"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  Check,
  CheckCircle,
  CreditCard,
  MoveLeft,
  MoveRight,
  User,
  UserCheck,
} from "lucide-react";
import Image from "next/image";
import { detectCardBrand } from "@/utils/detectCardBrand";
import { CleaveInput } from "../ui/input";
import AlternatePlanModal from "./alternatePlan";
import whatsappIcon from "../../../public/icons/whatsapp.svg";
import { useUsers } from "@/hooks/query/useUsers";
import { usePaymentMutations } from "@/hooks/query/usePayment";
import { UserDTO } from "@/types/user";
import { ClientData, CreatePaymentPayload } from "@/types/payment";
import Link from "next/link";
import axios from "axios";
import { PlansResponse } from "@/types/plan";
import { CardBrand, CheckoutCreditCard } from "@/app/dashboard/components/CreditCard";
import { useRouter } from "next/navigation";

const steps = ["Informacoes do cliente", "Pagamento", "Finalizacao"];

interface FormDTO  {
  name: string,
  email: string,
  phone: string,
  cpf: string,
  cardNumber: string,
  cardName: string,
  expiry: string,
  cvv: string,
};


const initialForm = {
  name: "",
  email: "",
  phone: "",
  cpf: "",
  cardNumber: "",
  cardName: "",
  expiry: "",
  cvv: "",
};

// somente dígitos
const digits = (s: string) => s.replace(/\D/g, "");

function splitExpiry(expiry: string) {
  // "MM/AA" -> { month: "MM", year: "20AA" }
  const [m = "", y = ""] = expiry.split("/");
  const year = y.length === 2 ? `20${y}` : y;
  return { month: m, year };
}

// tipa erro sem usar any
function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (err as any).message === "string"
  ) {
    return (err as { message: string }).message;
  }
  return "Erro inesperado.";
}

type CheckoutStepperProps = {
  plan: PlansResponse; // plano carregado pelo usePlanBySlug
};

export default function CheckoutStepper({ plan }: CheckoutStepperProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardBrand, setCardBrand] = useState<CardBrand>("OTHER");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { createMutation } = useUsers();
  const { createCustomerMutation, createPaymentMutation } =
    usePaymentMutations();
  const [userFly, setUserFly] = useState<UserDTO>();

  // Deriva algumas infos do plano
  const isAnnual =
    plan.slug?.toLowerCase().includes("anual") ||
    plan.slug?.toLowerCase().includes("anual"); // ajuste se tiver um campo tipo plan.billingPeriod === 'ANNUAL'

  // 👇 ajuste esse campo para o nome correto do preço do teu tipo
  console.log(plan);
  const price = (plan.priceCents / 100).toFixed(2);

  const planLabel = plan.name || plan.slug || "Plano Flynance"; // fallback bonitinho

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "cardNumber") setCardBrand(detectCardBrand(value));
  };

  const inputClasses =
    "p-3 border border-gray-300 rounded-md w-full focus:outline focus:outline-2 focus:outline-secondary focus:outline-offset-2";

  const handleBack = () => setStep((prev) => Math.max(prev - 1, 0));
  const handleNext = () =>
    setStep((prev) => Math.min(prev + 1, steps.length - 1));

  const switchIconSteps = (i: number) =>
    i === 0 ? (
      step > 0 ? (
        <UserCheck size={20} />
      ) : (
        <User size={20} />
      )
    ) : i === 1 ? (
      <CreditCard size={20} />
    ) : (
      <Check size={20} />
    );

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      if (step === 0) {
        // validações básicas
        if (!acceptedTerms) {
          setLoading(false);
          setError("Você precisa aceitar os termos para continuar.");
          return;
        }
        if (!form.name || !form.email || !form.phone || !form.cpf) {
          setLoading(false);
          setError("Preencha nome, e-mail, WhatsApp e CPF.");
          return;
        }

        // cria usuário no seu backend
        const body = {
          name: form.name,
          email: form.email,
          phone: form.phone,
        };
        const user = await createMutation.mutateAsync(body);

        if (user?.user) {
          setUserFly(user.user);
          setLoading(false);
          handleNext();
        } else {
          throw new Error("Não foi possível criar o usuário.");
        }
      } else if (step === 1) {
        if (!form.cardNumber || !form.cardName || !form.expiry || !form.cvv) {
          setLoading(false);
          setError(
            "Preencha os dados do cartão (número, nome, validade e CVV)."
          );
          return;
        }
        if (!userFly) {
          setLoading(false);
          setError("Usuário não encontrado. Volte ao passo anterior.");
          return;
        }

        const customerPayload: ClientData = {
          name: form.name,
          email: form.email,
          mobilePhone: digits(form.phone),
          cpfCnpj: digits(form.cpf),
          externalReference: userFly.id,
        };

        const customer = await createCustomerMutation.mutateAsync(
          customerPayload
        );

        const { month, year } = splitExpiry(form.expiry);

        const paymentPayload: CreatePaymentPayload = {
          customerId: customer.id,
          userId: userFly.id,
          planId: plan.id,
          billingType: "CREDIT_CARD",
          paymentDetails: {
            userId: userFly.id,
            planId: plan.id,
            billingType: "CREDIT_CARD",
            amount: +price,
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

        console.log('check',paymentPayload)

        const paymentRes = await createPaymentMutation.mutateAsync(
          paymentPayload
        );
        console.log("payment", paymentRes);

        setLoading(false);
        handleNext();
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message;
        console.log("Erro do Axios:", message);
        setError(getErrorMessage(message));
      } else {
        console.log("Erro desconhecido:", err);
        setError("Ocorreu um erro inesperado.");
      }
      setLoading(false);
    }
  };

  const handleSelectPlan = (newPlanSlug: string) => {
    setIsModalOpen(false);
    // se sua rota é /planos/checkout?plano=slug
    router.push(`/cadastro/checkout?plano=${newPlanSlug}`);
  };

  const msgToFly = "Olá fly, vamos organizar minha vida financeira";
  const talkToFly = `https://wa.me/+55 54 9307-5665?text=${msgToFly}`;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto py-6 px-4 flex justify-between text-sm">
        {steps.map((label, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1 text-center w-full"
          >
            <div
              className={clsx(
                "w-10 h-10 rounded-full flex items-center justify-center",
                step >= i
                  ? "bg-primary text-white"
                  : "bg-gray-200 text-gray-500"
              )}
            >
              {switchIconSteps(i)}
            </div>
            <span className="text-xs text-gray-600 font-medium">{label}</span>
          </div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-8 flex flex-col gap-8">
        {error && (
          <div className="text-red-600 bg-red-100 border border-red-300 px-4 py-2 rounded-md text-sm">
            {error}
          </div>
        )}

        {step === 0 && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-[#333C4D]">
                Informacoes de usuario
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="name"
                  placeholder="Nome completo"
                  value={form.name}
                  onChange={handleChange}
                  className={inputClasses}
                />
                <input
                  name="email"
                  placeholder="E-mail"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClasses}
                />
                <CleaveInput
                  name="phone"
                  placeholder="(11) 91234-5678"
                  options={{
                    delimiters: ["(", ") ", "-"],
                    blocks: [0, 2, 5, 4],
                    numericOnly: true,
                  }}
                  className={inputClasses}
                  onChange={handleChange}
                />
                <CleaveInput
                  name="cpf"
                  placeholder="CPF"
                  options={{
                    delimiters: [".", ".", "-"],
                    blocks: [3, 3, 3, 2],
                    numericOnly: true,
                  }}
                  className={inputClasses}
                  onChange={handleChange}
                />
              </div>
              <div className="flex items-start gap-2 mt-2">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 cursor-pointer"
                />
                <label htmlFor="acceptTerms" className="text-sm">
                  Li e aceito os{" "}
                  <a href="/termos" className="text-primary underline">
                    termos
                  </a>{" "}
                  e{" "}
                  <a href="/privacidade" className="text-primary underline">
                    privacidade
                  </a>
                  .
                </label>
              </div>
            </div>

            <PlanResume 
              isAnnual={isAnnual}
              planLabel={planLabel}
              price={+price}
              setOpen={setIsModalOpen}
              step={2}
              form={form}
            />
          </>
        )}

        {step === 1 && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row gap-2 justify-between lg:items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <CreditCard /> Cartao de credito
                </h2>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <CheckoutCreditCard
                    name={form.cardName || form.name}
                    number={form.cardNumber}
                    expiry={form.expiry}
                    className="mb-4"
                    brand={cardBrand}
                  />
                </div>
                
                <div className="flex flex-col gap-4 col-span-2">
                  <CleaveInput
                    name="cardNumber"
                    placeholder="Número do cartão"
                    options={{ creditCard: true }}
                    className={`${inputClasses} col-span-2`}
                    onChange={handleChange}
                  />
                  <div className="flex gap-4">
                    <CleaveInput
                      name="expiry"
                      placeholder="MM/AA"
                      options={{ date: true, datePattern: ["m", "y"] }}
                      className={inputClasses}
                      onChange={handleChange}
                    />
                    <CleaveInput
                      name="cvv"
                      placeholder="CVV"
                      options={{ blocks: [3], numericOnly: true }}
                      className={inputClasses}
                      onChange={handleChange}
                    />
                  </div>
                <input
                  name="cardName"
                  placeholder="Nome no cartao"
                  value={form.cardName}
                  onChange={handleChange}
                  className={inputClasses}
                />
                </div>
              </div>
            </div>

            <PlanResume 
              isAnnual={isAnnual}
              planLabel={planLabel}
              price={+price}
              setOpen={setIsModalOpen}
              step={1}
              form={form}
            />
          </>
        )}

        {step === 2 && (
          <div className="bg-white border border-gray-200 p-6 rounded-lg text-center">
            <CheckCircle size={48} className="mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold text-[#333C4D] mb-2">
              Assinatura ativada <br /> com sucesso!
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Veja os detalhes do seu pedido.
            </p>
            <div className="text-left text-sm ">
              <div className="flex flex-col gap-4 pb-4 border-b border-gray-200">
                <h3 className="text-xl font-bold">Plano Assinado</h3>
                <p>
                  <strong>Plano:</strong> {planLabel}
                </p>
                <p>
                  <strong>Valor:</strong> {`R$ ${price}`}
                </p>
                <p>
                  <strong>Forma de pagamento:</strong> Cartao
                </p>
              </div>
              <div className="flex flex-col gap-4 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold">Informações do Usuário</h3>
                <p>
                  <strong>Cliente:</strong> {form.name}
                </p>
                <p>
                  <strong>E-mail:</strong> {form.email}
                </p>
                <p>
                  <strong>Whatsap:</strong> {form.phone}
                </p>
                <p>
                  <strong>CPF:</strong> {form.cpf}
                </p>
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-bold">Acesso liberado</h3>
                <ul className="ml-6 mt-2 text-blue-700 list-none">
                  <li className="flex gap-2 items-center">
                    <Check /> Assistente IA no WhatsApp
                  </li>
                  <li className="flex gap-2 items-center">
                    <Check /> Dashboard financeiro
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {step < 2 ? (
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
        ) : (
          <div className="flex flex-col lg:flex-row lg:justify-between gap-8">
            <Link
              href="/login"
              className="px-4 py-2 border rounded-md border-gray-300 flex gap-2 items-center justify-center"
            >
              Ir para o dashboard <MoveRight />
            </Link>
            <Link
              href={talkToFly}
              className={clsx(
                "px-4 py-2 rounded-md font-medium cursor-pointer flex gap-2 items-center justify-center bg-primary text-white hover:opacity-90"
              )}
            >
              <span className="flex gap-2">
                Falar com a fly{" "}
                <Image
                  src={whatsappIcon}
                  alt="whatsapp icone"
                  width={24}
                  height={24}
                />
              </span>
            </Link>
          </div>
        )}
      </div>

     <AlternatePlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectPlan={handleSelectPlan}
      />
    </div>
  );
}

interface props {
  setOpen: (value: boolean) => void
  planLabel: string
  isAnnual: boolean
  price: number
  step: number
  form: FormDTO
}

function PlanResume({planLabel,isAnnual, price, setOpen, step, form}:props) {
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h2 className="md:text-2xl font-bold text-[#333C4D]">
          Resumo da Assinatura
        </h2>
        <button
          onClick={() => setOpen(true)}
          className="border border-primary text-xs md:text-sm px-4 py-2 text-primary
                  rounded-full hover:bg-primary hover:text-white cursor-pointer"
        >
          Alterar Plano
        </button>
      </div>
      <div className="flex flex-col gap-4">
        <div className="pb-4 border-b border-gray-200">
          <p>
            <strong>Plano:</strong> {planLabel}
          </p>
          {isAnnual && (
            <span className="text-sm">10% de desconto aplicado</span>
          )}
        </div>
        <div className="pb-4 border-b border-gray-200">
          <p>
            <strong>Valor:</strong>{" "}
            {isAnnual ? `R$ ${price / 12}` : `R$ ${price}`}/ mês
          </p>
          {isAnnual && (
            <span className="text-sm">Cobrança anual ({`R$ ${price}`})</span>
          )}
        </div>
      </div>
      {step === 1  && (
        <div>
          <div className="flex justify-between items-center">
            <h2 className="md:text-xl font-bold text-[#333C4D]">Informações de usuário</h2>
          </div>
          <div className="pb-4 border-b border-gray-200">
            <p><strong>Cliente:</strong> {form.name}</p>
          </div>
          <div className="pb-4 border-b border-gray-200">
            <p><strong>E-mail:</strong> {form.email}</p>
          </div>
          <div className="pb-4 border-b border-gray-200">
            <p><strong>Whatsap:</strong> {form.phone}</p>
          </div>
          <div className="pb-4 border-b border-gray-200">
            <p><strong>CPF:</strong> {form.cpf}</p>
          </div>
        </div>
      )
      }
    </div>
  );
}
