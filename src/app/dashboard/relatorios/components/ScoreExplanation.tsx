import { useTranslations } from 'next-intl'
import type { ScoreLevel } from './utils'

type Props = {
  level: ScoreLevel
}

export default function ScoreExplanation({ level }: Props) {
  const t = useTranslations('reports.scoreExplanation')

  return <div className="text-xs text-gray-500">{t(level)}</div>
}
