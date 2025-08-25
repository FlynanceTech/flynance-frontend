// Refatorado: otimizamos componentes repetitivos, removemos redundâncias e adicionamos lógicas para API por step
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Check, CheckCircle, CreditCard, MoveLeft, MoveRight, User, UserCheck } from "lucide-react";
import Image from "next/image";
import { detectCardBrand } from "@/utils/detectCardBrand";
import { CleaveInput } from "../ui/input";
import AlternatePlanModal from "./alternatePlan";
import whatsappIcon from '../../../public/icon/whatsapp.svg'
import { useUsers } from "@/hooks/query/useUsers";
import { usePaymentMutations } from "@/hooks/query/usePayment";
import { UserDTO } from "@/types/user";
import { ClientData, CreatePaymentPayload } from "@/types/payment";
import Link from "next/link";

const steps = ["Informacoes do cliente", "Pagamento", "Finalizacao"];

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

const cardLogos = [
  { src: "/cards-flags/visa.png", alt: "visa", width: 46 },
  { src: "/cards-flags/mastercard.png", alt: "mastercard", width: 26 },
  { src: "/cards-flags/elo.png", alt: "elo", width: 43 },
  { src: "/cards-flags/hipercard.png", alt: "hipercard", width: 57 },
  { src: "/cards-flags/amex.png", alt: "amex", width: 43 },
  { src: "/cards-flags/discover.png", alt: "discover", width: 67 },
];

// somente dígitos
const digits = (s: string) => s.replace(/\D/g, "");

function getPlanAmountInCents(plan: string) {
  // ajuste conforme sua tabela de preços
  // anual: 12x 17,91 = 214,92 -> por transação de cartão normalmente vai o valor da parcela, mas
  // se sua API espera total à vista ou parcelado, adapte aqui.
  if (plan === "anual") return Math.round(17.91 * 100); // parcela
  return Math.round(19.90 * 100); // mensal
}

function splitExpiry(expiry: string) {
  // "MM/AA" -> { month: "MM", year: "20AA" }
  const [m = "", y = ""] = expiry.split("/");
  const year = y.length === 2 ? `20${y}` : y;
  return { month: m, year };
}

// tipa erro sem usar any
function getErrorMessage(err: unknown): string {
  if (typeof err === "string") return err;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (err && typeof err === "object" && "message" in err && typeof (err as any).message === "string") {
    return (err as { message: string }).message;
  }
  return "Erro inesperado.";
}


export default function CheckoutStepper() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [selectedPlan, setSelectedPlan] = useState("anual");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardBrand, setCardBrand] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false)
  const searchParams = useSearchParams();
  const {createMutation} = useUsers()
  const { createCustomerMutation, createPaymentMutation } = usePaymentMutations();
  const [userFly, setUserFly] = useState<UserDTO>()


  useEffect(() => {
    const plano = (searchParams.get("plano") || "anual");
    setSelectedPlan(plano);
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === "cardNumber") setCardBrand(detectCardBrand(value));
  };

  const inputClasses = "p-3 border border-gray-300 rounded-md w-full focus:outline focus:outline-2 focus:outline-green-500 focus:outline-offset-2";

  const handleBack = () => setStep((prev) => Math.max(prev - 1, 0));
  const handleNext = () => setStep((prev) => Math.min(prev + 1, steps.length - 1));

  const switchIconSteps = (i: number) => i === 0 ? (step > 0 ? <UserCheck size={20}/> : <User size={20}/>) : i === 1 ? <CreditCard size={20}/> : <Check size={20}/>;

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
        // validações básicas de cartão
        if (!form.cardNumber || !form.cardName || !form.expiry || !form.cvv) {
          setLoading(false);
          setError("Preencha os dados do cartão (número, nome, validade e CVV).");
          return;
        }
        if (!userFly) {
          setLoading(false);
          setError("Usuário não encontrado. Volte ao passo anterior.");
          return;
        }
  
        // 1) criar customer no gateway de pagamento
        const customerPayload: ClientData = {
          name: form.name,
          email: form.email,
          mobilePhone: digits(form.phone),
          cpfCnpj: digits(form.cpf),
          externalReference: userFly.id,
        };
  
        const customer = await createCustomerMutation.mutateAsync(customerPayload);
  
        // 2) cobrar no cartão (usando orquestrador: createPayment)
        const { month, year } = splitExpiry(form.expiry);
        const amountInCents = getPlanAmountInCents(selectedPlan);
  
        const paymentPayload: CreatePaymentPayload = {
          customerId: customer.id,
          paymentDetails: {
            amount: amountInCents / 100, // se sua API espera em reais, mantenha /100; se for em centavos, envie amountInCents
            description: `Assinatura Flynance - ${selectedPlan}`,
            creditCard: {
              holderName: form.cardName,
              number: digits(form.cardNumber),
              expiryMonth: month,
              expiryYear: year,
              ccv: digits(form.cvv),
            },
          },
        };
  
        const paymentRes = await createPaymentMutation.mutateAsync(paymentPayload);
        console.log("payment", paymentRes);
  
        setLoading(false);
        handleNext(); // vai para confirmação (step 2)
  
      }
    } catch (err: unknown) {
      console.log("err", err);
      setLoading(false);
      setError(getErrorMessage(err));
    }
  };

  const msgToFly = 'Olá fly, vamos organizar minha vida financeira'

  const talkToFly = `https://wa.me/+55 54 9307-5665?text=${msgToFly}`

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto py-6 px-4 flex justify-between text-sm">
        {steps.map((label, i) => (
          <div key={i} className="flex flex-col items-center gap-1 text-center w-full">
            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center", step >= i ? "bg-[#00B066] text-white" : "bg-gray-200 text-gray-500")}>{switchIconSteps(i)}</div>
            <span className="text-xs text-gray-600 font-medium">{label}</span>
          </div>
        ))}
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-8 flex flex-col gap-8">
        {error && <div className="text-red-600 bg-red-100 border border-red-300 px-4 py-2 rounded-md text-sm">{error}</div>}

        {step === 0 && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
              <h2 className="text-2xl font-bold text-[#333C4D]">Informacoes de usuario</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="name" placeholder="Nome completo" value={form.name} onChange={handleChange} className={inputClasses} />
                <input name="email" placeholder="E-mail" value={form.email} onChange={handleChange} className={inputClasses} />
                <CleaveInput name="phone" placeholder="(11) 91234-5678" options={{ delimiters: ['(', ') ', '-'], blocks: [0, 2, 5, 4], numericOnly: true }} className={inputClasses} onChange={handleChange}/>
                <CleaveInput name="cpf" placeholder="CPF" options={{ delimiters: ['.', '.', '-'], blocks: [3, 3, 3, 2], numericOnly: true }} className={inputClasses} onChange={handleChange}/>
              </div>
              <div className="flex items-start gap-2 mt-2">
                <input type="checkbox" id="acceptTerms" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-1 h-4 w-4 cursor-pointer" />
                <label htmlFor="acceptTerms" className="text-sm">Li e aceito os <a href="/termos" className="text-green-600 underline">termos</a> e <a href="/privacidade" className="text-green-600 underline">privacidade</a>.</label>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="md:text-2xl font-bold text-[#333C4D]">Resumo da Assinatura</h2>
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="border border-[#3ECC89] text-xs md:text-sm px-4 py-2 text-[#3ECC89]
                  rounded-full hover:bg-[#3ECC89] hover:text-white cursor-pointer"
                >
                  Alterar Plano
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div className="pb-4 border-b border-gray-200">
                  <p><strong>Plano:</strong> Flynance {selectedPlan}</p>
                  {selectedPlan === 'anual' && <span className="text-sm">10% de desconto aplicado</span>}
                </div>
                <div className="pb-4 border-b border-gray-200">
                  <p><strong>Valor:</strong> {selectedPlan === "anual" ? "12x R$ 17,91" : "R$ 19,90 / mês"}</p>
                  {selectedPlan === 'anual' && <span className="text-sm">Cobrança anual ( R$ 214,92 )</span>}
                </div>
            
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
              <div className="flex flex-col lg:flex-row gap-2 justify-between lg:items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2"><CreditCard /> Cartao de credito</h2>
                <div className="flex items-center gap-2">
                  {cardLogos.map(({ src, alt, width }) => (
                    <Image key={alt} src={src} alt={alt} width={width} height={16} className={clsx("transition-opacity", cardBrand !== alt && "grayscale opacity-40")} />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    options={{ date: true, datePattern: ['m', 'y'] }}
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
              </div>
              <input name="cardName" placeholder="Nome no cartao" value={form.cardName} onChange={handleChange} className={inputClasses} />
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="md:text-xl font-bold text-[#333C4D]">Resumo da Assinatura</h2>
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="border border-[#3ECC89] text-xs md:text-sm px-4 py-2 text-[#3ECC89]
                  rounded-full hover:bg-[#3ECC89] hover:text-white cursor-pointer"
                >
                  Alterar Plano
                </button>
              </div>
              <div className="flex flex-col gap-4">
                <div className="pb-4 border-b border-gray-200">
                  <p><strong>Plano:</strong> Flynance {selectedPlan}</p>
                  {selectedPlan === 'anual' && <span className="text-sm">10% de desconto aplicado</span>}
                </div>
                <div className="pb-4 border-b border-gray-200">
                  <p><strong>Valor:</strong> {selectedPlan === "anual" ? "12x R$ 17,91" : "R$ 19,90 / mês"}</p>
                  {selectedPlan === 'anual' && <span className="text-sm">Cobrança anual ( R$ 214,92 )</span>}
                </div>
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
            </div>
          </>
        )}

        {step === 2 && (
          <div className="bg-white border border-gray-200 p-6 rounded-lg text-center">
            <CheckCircle size={48} className="mx-auto text-[#00B066] mb-4" />
            <h2 className="text-2xl font-bold text-[#333C4D] mb-2">Assinatura ativada <br/> com sucesso!</h2>
            <p className="text-sm text-gray-500 mb-4">Veja os detalhes do seu pedido.</p>
            <div className="text-left text-sm ">
              <div className="flex flex-col gap-4 pb-4 border-b border-gray-200">
                <h3 className="text-xl font-bold">Plano Assinado</h3>
                <p><strong>Plano:</strong> Flynance {selectedPlan}</p>
                <p><strong>Valor:</strong> {selectedPlan === "anual" ? "12x R$ 17,91" : "R$ 19,90 / mes"}</p>
                <p><strong>Forma de pagamento:</strong> Cartao</p>
              </div>
              <div className="flex flex-col gap-4 py-4 border-b border-gray-200">
                <h3 className="text-xl font-bold">Informações do Usuário</h3>
                <p><strong>Cliente:</strong> {form.name}</p>
                <p><strong>E-mail:</strong> {form.email}</p>
                <p><strong>Whatsap:</strong> {form.phone}</p>
                <p><strong>CPF:</strong> {form.cpf}</p>
              </div>
              <div className="flex flex-col gap-4">
                <h3 className="text-xl font-bold">Acesso liberado</h3>
                <ul className="ml-6 mt-2 text-green-700 list-none">
                  <li className="flex gap-2 items-center"><Check /> Assistente IA no WhatsApp</li>
                  <li className="flex gap-2 items-center"><Check /> Dashboard financeiro</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {step < 2 ? (
          <div className={clsx("flex", step > 0 ? "justify-between" : "justify-end")}>
            {step > 0 && <button onClick={handleBack} className="px-4 py-2 border rounded-md flex gap-2"><MoveLeft /> Voltar</button>}
            <button disabled={loading} onClick={handleSubmit} className={clsx("px-6 py-2 rounded-md font-medium cursor-pointer", loading ? "bg-gray-300" : "bg-[#00B066] text-white hover:opacity-90")}>{loading ? "Aguarde..." : <span className="flex gap-2">Continuar <MoveRight /></span>}</button>
          </div>
        ): 
        <div className="flex flex-col lg:flex-row lg:justify-between gap-8">
          <Link href="/login" className="px-4 py-2 border rounded-md border-gray-300 flex gap-2 items-center justify-center">Ir para o dashboard <MoveRight /></Link>
          <Link href={talkToFly} className={clsx("px-4 py-2 rounded-md font-medium cursor-pointer flex gap-2 items-center justify-center bg-[#00B066] text-white hover:opacity-90")}>
            <span className="flex gap-2">Falar com a fly <Image src={whatsappIcon} alt="whatsapp icone" width="24" height="24"/></span>
          </Link>
        </div>
        }
      </div>
      <AlternatePlanModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectPlan={(plan) => setSelectedPlan(plan)}
      />
    </div>
  );
}
