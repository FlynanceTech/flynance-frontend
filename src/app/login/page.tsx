'use client'
import { Mail } from 'lucide-react'
import Link from 'next/link'
import React, { useEffect, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import Lottie from 'lottie-react'
import emailSendingAnimation from '../../../assets/animation/send-email.json'

import logo from '../../../assets/Logo/PNG/Logo Fly branca 1.png'
import texture from '../../../assets/teture.svg'
import instagram from "../../../assets/icons/instagram-fill-icon.png"
import tiktop from "../../../assets/icons/tiktok-icon.png"

import { sendLoginCode, verifyCode } from '@/services/auth'
import { CleaveInput, Input, OtpInput } from '@/components/ui/input'
import { WhatsappIcon } from '@/components/icon/whatsapp'
import { getErrorMessage } from '@/lib/getErrorMessage'
import clsx from 'clsx'
import { useUserSession } from '@/stores/useUserSession'

export default function Login() {
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'identifier' | 'code'>('identifier')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isPending, startTransition] = useTransition() 
  const { fetchAccount } = useUserSession();


  const router = useRouter()
  const searchParams = useSearchParams()

  const rawNext = searchParams.get('next')
  const nextRoute =
    rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  type LoginMethod = 'email' | 'whatsapp';

const STORAGE_METHOD_KEY = 'flynance_login_method';
const STORAGE_IDENTIFIER_KEY = 'flynance_login_identifier';

const [method, setMethod] = useState<LoginMethod>('email');
const [identifier, setIdentifier] = useState('');

// carregar da sessionStorage quando a tela abrir
useEffect(() => {
  if (typeof window === 'undefined') return;

  const savedMethod = window.sessionStorage.getItem(
    STORAGE_METHOD_KEY,
  ) as LoginMethod | null;

  const savedIdentifier = window.sessionStorage.getItem(
    STORAGE_IDENTIFIER_KEY,
  );

  if (savedMethod === 'email' || savedMethod === 'whatsapp') {
    setMethod(savedMethod);
  }

  if (savedIdentifier) {
    setIdentifier(savedIdentifier);
  }
}, []);

function handleMethodChange(newMethod: LoginMethod) {
  setMethod(newMethod);
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(STORAGE_METHOD_KEY, newMethod);
  }
}

function handleIdentifierChange(value: string) {
  setIdentifier(value);
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(STORAGE_IDENTIFIER_KEY, value);
  }
}

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!identifier.trim()) {
      setError(
        method === 'email'
          ? 'Informe seu e-mail.'
          : 'Informe seu número de WhatsApp.',
      );
      return;
    }
    setLoading(true)
    setError('')
    try {
      const body = method === 'email'
        ? { email: identifier.trim() }
        : { whatsappPhone: identifier.trim() };

      await sendLoginCode(body)
      setStep('code')
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      setMessage('')
      const body = method === 'email'
        ? { email: identifier.trim(), code }
        : { whatsappPhone: identifier.trim(), code }
      await verifyCode(body)

      await fetchAccount()

      const { status } = useUserSession.getState()
      if (status !== 'authenticated') {
        setError('Não foi possível validar sua sessão. Tente novamente.')
        setLoading(false)
        return
      }

      startTransition(() => {
        router.push(nextRoute)
      })
    } catch (err: unknown) {
      setError(getErrorMessage(err) || 'Código inválido ou expirado.')
      setLoading(false)     
    }
  }

  const handleComplete = (code: string) => {
    setCode(code)
  }

  const handleResend = async () => {
    setLoading(true)
    setError('')
    try {
      const body = method === 'email'
        ? { email: identifier.trim()}
        : { whatsappPhone: identifier.trim()};
      await sendLoginCode(body)
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false)
    }
  }

  const handleChangeMethod = () => {
    setStep('identifier')
    setMethod(method === 'email' ? 'whatsapp' : 'email')
    setCode('')
    setIdentifier('')
    setError('')
  }

  return (
    <main className="
      w-screen h-screen flex flex-col 
      bg-gradient-to-r from-secondary to-primary
      lg:bg-none lg:bg-primary 
      lg:grid lg:grid-cols-2 lg:pr-8
    ">
      <section className='relative w-full h-full bg-gradient-to-r from-secondary to-primary flex items-center justify-center px-8'>
        <Image src={texture} alt="texture" className='absolute z-10 max-h-screen min-h-screen' />
        <div className="flex flex-col items-center z-20 text-center">
          <div className="flex flex-col gap-4 lg:gap-8 items-center max-w-[500px] lg:pt-4">
            <Image src={logo} className="w-[120px] lg:w-[150px]" alt="Flynance Logo" />
            <h1 className="text-xl lg:text-3xl font-bold text-white">Bem-vindo à Flynance.</h1>
            <p className="text-white font-light text-sm lg:text-base hidden lg:block">
              Organizar sua vida financeira está a apenas um passo.
            </p>
            <div className="flex-col gap-4 lg:gap-8 items-center hidden lg:flex">
              <span className="text-sm font-light text-white">Ainda não tem uma conta?</span>
              <Link href="/cadastro/checkout?plano=essencial-mensal" className="border border-white text-white py-2 px-8 lg:py-4 lg:px-16 rounded-full text-base lg:text-xl hover:bg-white hover:text-primary transition-all">
                Crie agora mesmo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full h-full lg:py-8 flex flex-col gap-8 items-center justify-center z-30 lg:mt-0 ">
        <div className="flex flex-col gap-8 items-center justify-center w-full h-full bg-white rounded-t-[48px] lg:rounded-[64px]">
          <form
            onSubmit={step === 'identifier' ? handleSendCode : handleVerifyCode}
            className="flex flex-col gap-6 items-center justify-center w-full text-center max-w-md px-8 lg:px-0 "
          >
            
            {step === 'identifier' ? (
              <div className='pt-8 flex flex-col gap-8 w-full h-full'>
                <div className="flex flex-col gap-4 items-center justify-center">
                  <h2 className="font-semibold text-xl lg:text-2xl text-primary mt-4 hidden lg:block">
                    Entrar com
                  </h2>
                  <div className='flex gap-4 items-center  w-full'>
                    <button
                      type="button"
                      onClick={() => handleMethodChange('email')}
                      className={clsx(
                        'px-4 py-2 cursor-pointer rounded-md text-sm flex items-center justify-center gap-2 w-full  hover:scale-105',
                        method === 'email'
                          ? 'bg-gradient-to-r from-secondary to-primary text-white'
                          : 'border border-primary text-primary bg-slate-200',
                      )}
                    >
                        <Mail size={20}/>
                        E-mail
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMethodChange('whatsapp')}
                      className={clsx(
                        'px-4 py-2 cursor-pointer rounded-md text-sm  flex items-center justify-center gap-2 w-full',
                        method === 'whatsapp'
                          ? 'bg-gradient-to-r from-secondary to-primary text-white'
                          : 'border border-primary text-primary bg-slate-200',
                      )}
                    >
                      <WhatsappIcon
                        className={clsx(
                          'w-5 h-5',
                          method === 'whatsapp' ? 'text-white' : 'text-primary'
                        )}
                        fill={ method === 'whatsapp' ? '#fff' : '#0065A4' }
                      />
                      WhatsApp
                    </button>
                  </div>
                </div>
           
                <div className='flex flex-col gap-4'>
                  <div className="relative w-full">
                  {
                    method === 'email' ? (
                      <Input
                        type="email"
                        placeholder="Seu e-mail"
                        value={identifier}
                        onChange={(e) => handleIdentifierChange(e.target.value)}
                        className={`w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 h-12 ${
                        error.includes("e-mail") ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-secondary"
                      }`}
                      />
                    ) : (
                      <CleaveInput
                        type={'tel'}
                        name={'tel'}
                        options={{
                          delimiters: ["(", ") ", "-"],
                          blocks: [0, 2, 5, 4],
                          numericOnly: true,
                        }}
                        value={identifier}
                        onChange={(e) => handleIdentifierChange(e.target.value)}
                        placeholder={
                            '(ddd) 98765-4321'
                        }
                        className={`w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 ${
                        error.includes("e-mail") ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-secondary"
                      }`}
                    />
                    )
                  }
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                      {
                        method === 'email' ? (
                          <Mail size={20} />
                        ) : (
                          <WhatsappIcon className="w-5 h-5 text-primary" fill="#6a7282" />
                        )
                      }
                    </div>
                  </div>

                  {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

                  <button
                    type='submit'
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-secondary to-primary text-white font-semibold py-3 rounded-md cursor-pointer hover:opacity-90 transition"
                  >
                    {loading ? (
                        <div className="flex justify-center items-center gap-2">
                          <Lottie
                            animationData={emailSendingAnimation}
                            loop
                            style={{ width: 24, height: 24 }}
                          />
                          Enviando...
                        </div>
                      ) : (
                        'Enviar código de acesso'
                      )}
                  </button>

                  <p className="text-sm text-gray-500  w-full mx-auto">
                    Enviaremos um código de acesso para o {method === 'email' ? 'E-mail' : 'WhatsApp'} informado.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h2 className="font-semibold text-xl text-[#333C4D] mt-4">Digite o código enviado no seu {method === 'email' ? 'E-mail' : 'WhatsApp'}</h2>
                <OtpInput length={4} onComplete={handleComplete} />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className='flex gap-4 w-full'>
                  <button type="button" onClick={handleChangeMethod} 
                    className={clsx(
                        'px-4 py-2 cursor-pointer rounded-md text-sm flex items-center justify-center gap-2 w-full border border-primary text-primary bg-slate-200',
                      
                      )} disabled={loading}>
                    Trocar para {method === 'email' ? 'WhatsApp' : 'e-mail'}
                  </button>
                  <button type="button" onClick={handleResend}  className={clsx(
                        'px-4 py-2 cursor-pointer rounded-md text-sm flex items-center justify-center gap-2 w-full bg-gradient-to-r from-secondary to-primary text-white',
      
                      )} disabled={loading}>
                    Reenviar código
                  </button>

                </div>
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-gradient-to-r from-secondary to-primary text-white py-3 rounded-md cursor-pointer font-semibold hover:opacity-90 transition"
                >
                  {loading ? 'Verificando...' : isPending ? 'Redirecionando...' : 'Entrar'}
                </button>
              </>
            )}
            {message && <p className="text-sm text-primary">{message}</p>}

            <div className="flex-col gap-4 lg:gap-8 items-center lg:hidden flex">
              <span className="text-sm font-light">Ainda não tem uma conta?</span>
              <Link href="/cadastro/checkout?plano=essencial-mensal" className=" rounded-full text-xs hover:bg-white hover:text-primary transition-all">
                Crie agora mesmo
              </Link>
            </div>

            <div className="flex flex-col gap-4 items-center pb-4">
              <h3 className="text-lg lg:text-xl text-primary">Nos siga nas redes sociais</h3>
              <div className="flex gap-6">
                <Link href="https://www.instagram.com/flynance.app/" target="_blank">
                  <Image src={instagram} alt="Instagram" width={24} height={24} />
                </Link>
                <Link href="https://www.tiktok.com/@flynanceapp" target="_blank">
                  <Image src={tiktop} alt="TikTok" width={24} height={24} />
                </Link>
              {/*   <Link href="https://www.youtube.com/@Flynanceapp" target="_blank">
                  <Image src={youtube} alt="YouTube" width={24} height={24} />
                </Link> */}
              </div>
            </div>
          </form>
        </div>
      </section>
      
    </main>
  )
}
