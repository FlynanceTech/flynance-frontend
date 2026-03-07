'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Check, Instagram, Undo2, Youtube } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { saveWaitlistEntry } from '../../../data/WaitlistEntry/post'
import texture from '../../../../assets/teture.svg'
import tiktok from '../../../../assets/icons/tiktok-icon.svg'

export default function Espera() {
  const t = useTranslations('waitlistPage')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const response = await saveWaitlistEntry({ name, email, phone })

    setLoading(false)
    setMessage(response.message)
    setResult(response.success)

    if (response.success) {
      setName('')
      setEmail('')
      setPhone('')
    }
  }

  return (
    <main className="relative flex flex-col justify-center items-center max-h-screen w-screen bg-gradient-to-r from-secondary to-primary">
      <header className="hidden lg:block fixed top-8 left-32 w-full py-4 px-8 z-30">
        <Link href="/" className="flex gap-2 text-white cursor-pointer">
          <Undo2 color="#fff" />
          <h3>{t('backToHome')}</h3>
        </Link>
      </header>

      <section className="flex flex-col lg:grid lg:grid-cols-2 h-screen w-full gap-8">
        <div className="relative w-full flex flex-col items-center justify-center z-20 text-center">
          <Image
            src={texture}
            alt="texture"
            className="absolute z-10 max-h-screen min-h-screen"
          />
          <div className="flex flex-col gap-6 lg:gap-8 items-center justify-center max-w-[500px] pt-8 px-8 z-50">
            <h1 className="text-2xl lg:text-3xl font-bold text-[#fff]">{t('heroTitle')}</h1>
            <p className="text-[#fff] font-light text-base lg:text-base">
              {t('heroSubtitleLine1')}
              <br />
              {t('heroSubtitleLine2')}
            </p>
            <div className="flex flex-col gap-4 items-center">
              <h3 className="text-lg lg:text-xl text-[#fff]">{t('followUs')}</h3>
              <div className="flex gap-6 items-center justify-center">
                <Link
                  href="https://www.instagram.com/flynance.app/"
                  target="_blank"
                  aria-label={t('social.instagram')}
                >
                  <Instagram color="#fff" size={28} className="hover:opacity-80 cursor-pointer" />
                </Link>
                <Link
                  href="https://www.tiktok.com/@flynanceapp"
                  aria-label={t('social.tiktok')}
                  target="_blank"
                  className="hover:opacity-80 cursor-pointer"
                >
                  <Image src={tiktok} alt="tiktok" />
                </Link>
                <Link
                  href="https://www.youtube.com/@Flynanceapp"
                  target="_blank"
                  aria-label={t('social.youtube')}
                >
                  <Youtube color="#fff" size={28} className="hover:opacity-80 cursor-pointer" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full h-full lg:p-8 z-20">
          {result ? (
            <div className="flex flex-col lg:justify-center items-center h-full p-8 bg-white rounded-t-[32px] lg:rounded-[32px] gap-4">
              <Check size={64} color="#3ECC89" />
              <h2 className="text-2xl font-bold">{t('successTitle')}</h2>
              <p className="text-center text-sm ">{message}</p>
              <Link
                href="/"
                className="py-3 px-8 flex items-center justify-center text-base text-white bg-gradient-to-r from-secondary to-[#3B82F5] cursor-pointer w-full md:w-auto rounded-full"
              >
                {t('successCta')}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col lg:justify-center items-center h-full p-8 bg-white rounded-t-[32px] lg:rounded-[32px]">
              <h1 className="text-2xl font-bold text-center mb-6 text-[#333C4D]">{t('formTitle')}</h1>
              <form onSubmit={handleSubmit} className="flex flex-col w-full max-w-md gap-4">
                <input
                  type="text"
                  placeholder={t('namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="border border-gray-300 rounded-md p-3 text-[#333C4D] placeholder-gray-400"
                />
                <input
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border border-gray-300 rounded-md p-3 text-[#333C4D] placeholder-gray-400"
                />
                <input
                  type="tel"
                  placeholder={t('phonePlaceholder')}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="border border-gray-300 rounded-md p-3 text-[#333C4D] placeholder-gray-400"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-secondary to-[#3B82F5] text-white py-3 rounded-full font-semibold hover:bg-[#2c6cd3] transition"
                >
                  {loading ? t('submitting') : t('submit')}
                </button>
              </form>
            </div>
          )}
        </div>
      </section>

      <footer className="fixed bottom-4 right-4 block lg:hidden z-50">
        <Link href="/" className="bg-secondary p-4 rounded-full text-white flex items-center justify-center shadow-md">
          <Undo2 />
        </Link>
      </footer>
    </main>
  )
}
