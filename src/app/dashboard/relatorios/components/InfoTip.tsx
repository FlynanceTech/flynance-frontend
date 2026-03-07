import { Info } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function InfoTip({ text }: { text: string }) {
  const t = useTranslations('reports.common')

  return (
    <div className="group relative">
      <button
        type="button"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:text-gray-600"
        aria-label={t('moreInfoAria')}
      >
        <Info size={12} />
      </button>
      <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-56 -translate-x-1/2 rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-600 opacity-0 shadow-sm transition group-hover:opacity-100">
        {text}
      </div>
    </div>
  )
}
