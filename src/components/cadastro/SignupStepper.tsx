'use client'

import React, { useState } from 'react'
import { User, Smartphone, Mail } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSignupStore } from '@/stores/useSignupStore'
import { useForm } from 'react-hook-form'
import { useUsers } from '@/hooks/query/useUsers'

const initialForm = {
  name: '',
  phone: '',
  email: '',
  confirmEmail: '',
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '');

  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

type Step = {
  key: keyof typeof initialForm
  placeholder: string
  icon: React.ReactNode
}

const steps: Step[] = [
  { placeholder: 'Nome', icon: <User size={20} />, key: 'name' },
  { placeholder: 'WhatsApp', icon: <Smartphone size={20} />, key: 'phone' },
  { placeholder: 'E-mail', icon: <Mail size={20} />, key: 'email' },
]

export default function SignupStepper() {
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [acceptTerms, setAcceptTerms] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const plano = searchParams.get('plano')
  const { setData } = useSignupStore()
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const {createMutation} = useUsers()



  const {
    register,
    watch,
    setValue,
  } = useForm({ defaultValues: initialForm })

  const form = watch()
  const current = steps[step]

  const validateStep = () => {
    const value = form[current.key].trim()

    switch (current.key) {
      case 'name':
        if (value.length < 2) return 'O nome deve ter pelo menos 2 letras.'
        break
      case 'phone':
        const digits = value.replace(/\D/g, '')
        if (digits.length !== 11) return 'Digite um número de celular válido com DDD.'
        break
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) return 'Informe um e-mail válido.'
        break
    }

    return ''
  }

  const handleNext = async () => {
    if (step < steps.length - 1) {
      const validationError = validateStep()
      if (validationError) {
        setError(validationError)
        return
      }
      setStep(prev => prev + 1)
      setError('')
    } else {
      if (form.confirmEmail !== form.email) {
        setError('Os e-mails não coincidem.')
        return
      }
      if (!acceptTerms) {
        setError('Você precisa aceitar os termos de uso para continuar.')
        return
      }
  
      setError('')
      setLoading(true)
  
      try {
        const body = {
          name: form.name,
          email: form.email,
          phone: form.phone,
        }
        const user = await createMutation.mutateAsync(body)
        console.log('user', user)
    /*     setUser(user) */
        setSuccessMessage('✅ Tudo certo! Agora vamos conferir os planos...')
        setData(body)
  
        setTimeout(() => {
          router.push(`/cadastro/checkout?plano=${plano}`)
        }, 2000)
      } catch {
        setError('Erro ao enviar os dados. Tente novamente.')
      } finally {
        setLoading(false)
      }
    }
  }

/*   const handleBack = () => {
    if (step > 0) setStep(prev => prev - 1)
  } */

  return (
    <div className='flex flex-col items-center w-full pt-8'>
      <div className='flex flex-col w-full max-w-[1280px] items-center justify-center px-8'>
        <div className='flex gap-2 w-full max-w-md mb-8'>
          {[0, 1, 2].map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full ${i <= step ? 'bg-green-500' : 'bg-gray-300'}`}
            />
          ))}
        </div>

        <div className='max-w-[448px] w-full'>
          <h2 className='text-lg font-normal mb-4 text-left text-gray-700'>
            {step === 0 && 'Como podemos te chamar?'}
            {step === 1 && 'Qual seu número de WhatsApp?'}
            {step === 2 && 'Qual seu e-mail?'}
          </h2>
        </div>

        <div className='flex flex-col gap-4 w-full max-w-md'>
          {step === 0 && (
            <input
              {...register('name')}
              placeholder='Nome'
              className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500'
            />
          )}

          {step === 1 && (
            <input
              {...register('phone')}
              onChange={(e) => setValue('phone', formatPhone(e.target.value))}
              placeholder='WhatsApp'
              className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500'
            />
          )}

          {step === 2 && (
            <>
              <input
                {...register('email')}
                placeholder='E-mail'
                className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500'
              />
              <input
                {...register('confirmEmail')}
                placeholder='Confirme seu e-mail'
                className='w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500'
              />
              <div className='flex items-start gap-2 mt-4'>
                <input
                  type='checkbox'
                  id='acceptTerms'
                  checked={acceptTerms}
                  onChange={e => setAcceptTerms(e.target.checked)}
                  className='mt-1'
                />
                <label htmlFor='acceptTerms' className='text-sm text-gray-700'>
                  Aceito os{' '}
                  <a href='/termos' className='text-green-600 underline' target='_blank'>termos de uso</a>{' '}e{' '}
                  <a href='/privacidade' className='text-green-600 underline' target='_blank'>política de privacidade</a>.
                </label>
              </div>
            </>
          )}

          {error && <p className='text-sm text-red-500'>{error}</p>}

          <button
            onClick={handleNext}
            disabled={loading}
            className={`w-full ${step !== 0 ? 'col-span-1' : 'col-span-2'} flex justify-center items-center gap-2 bg-gradient-to-r from-green-400 to-green-700 text-white font-semibold py-3 rounded-md hover:opacity-90 transition ${
              loading ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Enviando...
              </>
            ) : step === 2 ? 'Cadastrar' : 'Continuar'}
          </button>

        </div>

        {successMessage && (
          <p className="text-sm text-green-600 text-center mt-2">{successMessage}</p>
        )}

      </div>
    </div>
  )
}
