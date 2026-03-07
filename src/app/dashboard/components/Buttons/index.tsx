import type { ButtonHTMLAttributes, ElementType } from 'react'
import clsx from 'clsx'
import { ImportIcon, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ButtonProps {
  onClick: () => void
  disabled?: boolean
  label?: string
}

type ActionTriggerVariant = 'primary' | 'secondary' | 'outline'
type ActionTriggerSize = 'sm' | 'md'

interface ActionTriggerButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  icon?: ElementType<{ className?: string; size?: number }>
  variant?: ActionTriggerVariant
  size?: ActionTriggerSize
}

const ACTION_VARIANT_CLASS: Record<ActionTriggerVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
  outline:
    'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/5',
}

const ACTION_SIZE_CLASS: Record<ActionTriggerSize, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
}

export function ActionTriggerButton({
  label,
  icon: Icon,
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...props
}: ActionTriggerButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60',
        ACTION_VARIANT_CLASS[variant],
        ACTION_SIZE_CLASS[size],
        className
      )}
      {...props}
    >
      {Icon ? <Icon size={16} /> : null}
      {label}
    </button>
  )
}

export function NewTransactionButton({ onClick }: ButtonProps) {
  const t = useTranslations('buttons')

  return (
    <ActionTriggerButton
      onClick={onClick}
      label={t('newTransaction')}
      icon={Plus}
      variant="primary"
      className="font-bold"
    />
  )
}

export function ImportTransactionsButton({ onClick, disabled, label }: ButtonProps) {
  const t = useTranslations('buttons')

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 border border-yellow-fly dark:border-yellow-fly text-white dark:hover:text-black font-bold px-4 py-2 cursor-pointer rounded-full text-sm hover:bg-primary/90 transition disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ImportIcon size={16} />
      {label ?? t('importTransaction')}
    </button>
  )
}
