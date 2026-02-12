type Props = {
  label: string
}

export default function ScoreExplanation({ label }: Props) {
  return (
    <div className="text-xs text-gray-500">
      {label === 'Crítico'
        ? 'Crítico: score baixo indica risco financeiro maior. Foque em aumentar poupança e reduzir dívidas.'
        : label === 'Atenção'
        ? 'Atenção: há espaço para melhorar. Reduza despesas variáveis e aumente reserva.'
        : 'Saudável: continue mantendo bons hábitos e metas consistentes.'}
    </div>
  )
}
