import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'icon' | 'chip'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40',
  ghost:
    'rounded px-3 py-2 text-sm text-zinc-400 hover:bg-white/10 hover:text-zinc-100 disabled:opacity-40',
  icon: 'rounded p-1 text-zinc-400 hover:bg-white/10 hover:text-zinc-100 disabled:opacity-40',
  chip: 'rounded border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-white/10 disabled:opacity-40',
}

export function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={`${VARIANT_CLASSES[variant]} ${className}`.trim()} {...rest} />
  )
}
