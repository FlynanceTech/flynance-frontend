'use client'
import { Mail } from 'lucide-react'
import Link from 'next/link'
import React, { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Lottie from 'lottie-react'
import emailSendingAnimation from '../../../assets/animation/send-email.json'


import logo from '../../../assets/flynance-logo-white.png'
import texture from '../../../assets/teture.svg'
import instagram from "../../../assets/icons/instagram-fill-icon.png"
import tiktop from "../../../assets/icons/tiktok-icon.png"
import youtube from "../../../assets/icons/youtube-fill-icon.png"

import { sendLoginCode, verifyCode } from '@/services/auth'
import { OtpInput } from '@/components/ui/input'
import { getErrorMessage } from '@/utils/getErrorMessage'
import InstallPrompt from '@/components/cadastro/InstallPrompt/InstallPrompt'

export default function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const router = useRouter()

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await sendLoginCode({ email })
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
      await verifyCode({ email, code })
      router.push('/dashboard')
    } catch {
      setError('Código inválido ou expirado.')
    } finally {
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
      await sendLoginCode({ email })
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="
      w-screen h-screen flex flex-col 
      bg-gradient-to-r from-[#3ECC89] to-[#1F6645]
      lg:bg-none lg:bg-[#1F6645] 
      lg:grid lg:grid-cols-2 lg:pr-8
    ">
      <section className='relative w-full h-full bg-gradient-to-r from-[#3ECC89] to-[#1F6645] flex items-center justify-center px-8'>
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
              <Link href="/cadastro/checkout?plano=mensal" className="border border-white text-white py-2 px-8 lg:py-4 lg:px-16 rounded-full text-base lg:text-xl hover:bg-white hover:text-green-700 transition-all">
                Crie agora mesmo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full h-full lg:py-8 flex flex-col gap-8 items-center justify-center z-30 lg:mt-0 ">
        <div className="flex flex-col gap-8 items-center justify-center w-full h-full bg-white rounded-t-[48px] lg:rounded-[64px]">
          <form
            onSubmit={step === 'email' ? handleSendCode : handleVerifyCode}
            className="flex flex-col gap-6 items-center justify-center w-full text-center max-w-md px-8 lg:px-0"
          >
            {step === 'email' ? (
              <div className='pt-8 flex flex-col gap-4'>
                <h2 className="font-semibold text-xl lg:text-2xl text-[#333C4D] mt-4 hidden lg:block">
                  Entre com seu e-mail
                </h2>

                <div className="relative w-full">
                  <input
                    type="email"
                    name="email"
                    placeholder="exemplo@email.com"
                    className={`w-full pl-10 pr-4 py-3 border rounded-md focus:outline-none focus:ring-2 ${
                      error.includes("e-mail") ? "border-red-400 focus:ring-red-300" : "border-gray-300 focus:ring-green-500"
                    }`}
                    onChange={(e) => setEmail(e.target.value)}
                    value={email}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    <Mail size={20} />
                  </div>
                </div>

                {error && <p className="text-sm text-red-500 mt-2">{error}</p>}

                <button
                  type='submit'
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-green-400 to-green-700 text-white font-semibold py-3 rounded-md hover:opacity-90 transition"
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

                <p className="text-sm text-gray-500 max-w-sm">
                  Enviaremos um código de acesso para o e-mail informado.
                </p>
              </div>
            ) : (
              <>
                <h2 className="font-semibold text-xl text-[#333C4D] mt-4">Digite o código enviado por e-mail</h2>
                <OtpInput length={4} onComplete={handleComplete} />
                {error && <p className="text-sm text-red-500">{error}</p>}
                <button type="button" onClick={handleResend} className="text-sm text-green-600 hover:underline">
                  Reenviar código
                </button>
                <button
                  disabled={loading}
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-400 to-green-700 text-white py-3 rounded-md"
                >
                  {loading ? 'Verificando...' : 'Entrar'}
                </button>
              </>
            )}
            {message && <p className="text-sm text-green-600">{message}</p>}

            <div className="flex-col gap-4 lg:gap-8 items-center lg:hidden flex">
              <span className="text-sm font-light">Ainda não tem uma conta?</span>
              <Link href="/cadastro/checkout?plano=mensal" className=" rounded-full text-xs hover:bg-white hover:text-green-700 transition-all">
                Crie agora mesmo
              </Link>
            </div>

            <div className="flex flex-col gap-4 items-center pb-4">
              <h3 className="text-lg lg:text-xl text-green-700">Nos siga nas redes sociais</h3>
              <div className="flex gap-6">
                <Link href="https://www.instagram.com/flynance.app/" target="_blank">
                  <Image src={instagram} alt="Instagram" width={24} height={24} />
                </Link>
                <Link href="https://www.tiktok.com/@flynanceapp" target="_blank">
                  <Image src={tiktop} alt="TikTok" width={24} height={24} />
                </Link>
                <Link href="https://www.youtube.com/@Flynanceapp" target="_blank">
                  <Image src={youtube} alt="YouTube" width={24} height={24} />
                </Link>
              </div>
            </div>
          </form>
        </div>
      </section>
      
      <InstallPrompt  />
    </main>
  )
}
