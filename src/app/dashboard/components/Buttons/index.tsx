import { Plus } from 'lucide-react'

interface NewTransactionButtonProps {
  onClick: () => void
}

export function NewTransactionButton({ onClick }: NewTransactionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 bg-[#CEF2E1] text-[#333C4D] font-bold px-4 py-2 rounded-full text-sm hover:bg-[#bde9d4] transition cursor-pointer"
    >
      <Plus size={16} />
      Nova Transação
    </button>
  )
}
