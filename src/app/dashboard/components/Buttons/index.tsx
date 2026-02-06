import { ImportIcon, Plus } from 'lucide-react'

interface ButtonProps {
  onClick: () => void
  disabled?: boolean
  label?: string
}

export function NewTransactionButton({ onClick }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 bg-secondary/30 text-primary font-bold px-4 py-2 rounded-full text-sm hover:bg-secondary/35 transition cursor-pointer"
    >
      <Plus size={16} />
      Nova Transacao
    </button>
  )
}

export function ImportTransactionsButton({ onClick, disabled, label }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 bg-white border border-primary text-primary font-bold px-4 py-2 rounded-full text-sm hover:bg-secondary/35 transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ImportIcon size={16} />
      {label ?? 'Importa Transacao'}
    </button>
  )
}
