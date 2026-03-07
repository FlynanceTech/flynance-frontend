'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Info, X } from 'lucide-react'
import { useUserSession } from '@/stores/useUserSession'

export type PageOnboardingStep = {
  id: string
  selector: string
  title: string
  description: string
  align?: 'top' | 'bottom'
}

type SpotlightRect = {
  top: number
  left: number
  width: number
  height: number
}

type Props = {
  steps: ReadonlyArray<PageOnboardingStep>
  storageKeyBase: string
  triggerLabel?: string
  hideLabelOnMobile?: boolean
}

export default function PageOnboardingTour({
  steps,
  storageKeyBase,
  triggerLabel = 'Ver guia da tela',
  hideLabelOnMobile = true,
}: Props) {
  const { user, status } = useUserSession()
  const userId = user?.userData?.user?.id ?? 'anonymous'
  const storageKey = `${storageKeyBase}:${userId}`

  const [hydrated, setHydrated] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null)
  const [tooltipHeight, setTooltipHeight] = useState(300)
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => setHydrated(true), [])

  useEffect(() => {
    if (!hydrated || !steps.length || typeof window === 'undefined') return
    if (status === 'idle' || status === 'loading') return

    const completed = window.localStorage.getItem(storageKey)
    if (completed === 'done') return

    setStepIndex(0)
    setIsOpen(true)
  }, [hydrated, steps.length, status, storageKey])

  const currentStep = steps[stepIndex]
  const isFirstStep = stepIndex === 0
  const isLastStep = stepIndex === steps.length - 1

  const findTarget = (step = currentStep) => {
    if (!step || typeof document === 'undefined') return null
    return document.querySelector<HTMLElement>(step.selector)
  }

  const syncTargetRect = (targetElement?: HTMLElement | null) => {
    if (typeof window === 'undefined') return
    const target = targetElement ?? findTarget()

    if (!target) {
      setTargetRect(null)
      return
    }

    const rect = target.getBoundingClientRect()
    const paddedWidth = Math.min(rect.width + 12, window.innerWidth - 16)
    const paddedHeight = Math.min(rect.height + 12, window.innerHeight - 16)
    const maxLeft = Math.max(8, window.innerWidth - paddedWidth - 8)
    const maxTop = Math.max(8, window.innerHeight - paddedHeight - 8)

    setTargetRect({
      top: Math.min(Math.max(rect.top - 6, 8), maxTop),
      left: Math.min(Math.max(rect.left - 6, 8), maxLeft),
      width: paddedWidth,
      height: paddedHeight,
    })
  }

  const markAsDone = () => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, 'done')
  }

  const openTour = () => {
    if (!steps.length) return
    setStepIndex(0)
    setTargetRect(null)
    setIsOpen(true)
  }

  const closeTour = (persist = true) => {
    if (persist) markAsDone()
    setIsOpen(false)
    setTargetRect(null)
  }

  const nextStep = () => {
    if (isLastStep) {
      closeTour(true)
      return
    }
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const previousStep = () => {
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  useEffect(() => {
    if (!isOpen || !currentStep || typeof window === 'undefined') return

    const target = findTarget(currentStep)
    if (!target) {
      setTargetRect(null)
      return
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })

    const syncPosition = () => syncTargetRect(target)
    const timerId = window.setTimeout(syncPosition, 180)

    window.addEventListener('resize', syncPosition)
    window.addEventListener('scroll', syncPosition, true)

    return () => {
      window.clearTimeout(timerId)
      window.removeEventListener('resize', syncPosition)
      window.removeEventListener('scroll', syncPosition, true)
    }
  }, [isOpen, currentStep])

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return

    const measureTooltip = () => {
      const tooltip = tooltipRef.current
      if (!tooltip) return
      const rect = tooltip.getBoundingClientRect()
      if (rect.height > 0) setTooltipHeight(rect.height)
    }

    const rafId = window.requestAnimationFrame(measureTooltip)
    const timeoutId = window.setTimeout(measureTooltip, 160)
    window.addEventListener('resize', measureTooltip)

    return () => {
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
      window.removeEventListener('resize', measureTooltip)
    }
  }, [isOpen, currentStep, targetRect])

  const tooltipStyle = useMemo(() => {
    if (typeof window === 'undefined') return undefined

    const width = Math.min(360, Math.max(260, window.innerWidth - 24))

    if (!targetRect) {
      return {
        width,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      }
    }

    const centerX = targetRect.left + targetRect.width / 2
    const clampedLeft = Math.min(Math.max(centerX, width / 2 + 12), window.innerWidth - width / 2 - 12)
    const availableTop = targetRect.top - 14
    const availableBottom = window.innerHeight - (targetRect.top + targetRect.height) - 14
    const estimatedHeight = Math.max(220, tooltipHeight)
    const canPlaceBottom = availableBottom >= estimatedHeight
    const canPlaceTop = availableTop >= estimatedHeight

    const placeOnTop =
      currentStep?.align === 'top'
        ? true
        : currentStep?.align === 'bottom'
          ? false
          : canPlaceTop && (!canPlaceBottom || availableTop > availableBottom)

    const rawTop = placeOnTop ? targetRect.top - estimatedHeight - 14 : targetRect.top + targetRect.height + 14
    const top = Math.min(Math.max(rawTop, 12), Math.max(12, window.innerHeight - estimatedHeight - 12))

    return {
      width,
      top,
      left: clampedLeft,
      transform: 'translateX(-50%)',
    }
  }, [targetRect, currentStep?.align, tooltipHeight])

  if (!steps.length) return null

  return (
    <>
      <button
        type="button"
        onClick={openTour}
        aria-label={triggerLabel}
        className="inline-flex items-center gap-0 rounded-full border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 sm:gap-2 sm:px-3"
      >
        <Info className="h-3.5 w-3.5" />
        <span className={hideLabelOnMobile ? 'hidden sm:inline' : ''}>{triggerLabel}</span>
      </button>

      {hydrated && isOpen && currentStep && (
        <div className="fixed inset-0 z-[90]">
          <button
            type="button"
            className={`absolute inset-0 ${targetRect ? 'bg-transparent' : 'bg-slate-950/60'}`}
            onClick={() => closeTour(true)}
            aria-label="Fechar onboarding"
          />

          {targetRect && (
            <div
              className="pointer-events-none fixed z-[91] rounded-2xl border-2 border-primary/80 bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.56)] transition-all duration-300"
              style={{
                top: targetRect.top,
                left: targetRect.left,
                width: targetRect.width,
                height: targetRect.height,
              }}
            />
          )}

          <div
            ref={tooltipRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="page-onboarding-title"
            className="fixed z-[92] max-h-[calc(100vh-24px)] overflow-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl transition-[top,left,transform] duration-300"
            style={tooltipStyle}
          >
            <button
              type="button"
              onClick={() => closeTour(true)}
              className="absolute right-4 top-4 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Fechar guia"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
              Passo {stepIndex + 1} de {steps.length}
            </div>

            <h2 id="page-onboarding-title" className="pr-8 text-lg font-bold text-gray-800">
              {currentStep.title}
            </h2>
            <p className="mt-2 text-sm text-gray-600">{currentStep.description}</p>

            <div className="mt-5 flex items-center gap-1.5">
              {steps.map((step, index) => (
                <span
                  key={step.id || index}
                  className={`h-1.5 rounded-full transition-all ${index === stepIndex ? 'w-8 bg-primary' : 'w-3 bg-gray-300'}`}
                />
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => closeTour(true)}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Pular guia
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={previousStep}
                  disabled={isFirstStep}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-secondary"
                >
                  {isLastStep ? 'Concluir' : 'Proximo'}
                  {!isLastStep && <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
