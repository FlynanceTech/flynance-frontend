'use client';

declare global {
  interface Window {
    dataLayer: unknown[];
    fbq: (...args: unknown[]) => void;
  }
}

/**
 * Função para rastrear eventos no Google Tag Manager (GTM) e Meta Pixel (Facebook)
 * @param event Nome do evento (ex: 'Lead', 'SubscribeIntent')
 * @param params (opcional) Parâmetros adicionais para enviar
 */
export function trackEvent(event: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined') {
    // Dispara evento para GTM (Google Tag Manager)
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({
        event,
        ...params,
      });
    }

    // Dispara evento para Facebook Pixel
    if (typeof window.fbq === 'function') {
      window.fbq('track', event, params || {});
    }
  }
}
