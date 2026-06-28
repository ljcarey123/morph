import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'icon' | 'chip'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'rounded bg-amber-500 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-amber-400 disabled:opacity-40',
  ghost:
    'rounded px-3 py-2 text-sm text-stone-400 hover:bg-white/10 hover:text-stone-100 disabled:opacity-40',
  icon: 'rounded p-1 text-stone-400 hover:bg-white/10 hover:text-stone-100 disabled:opacity-40',
  chip: 'rounded-full border border-amber-200/20 bg-gradient-to-b from-white/15 to-white/5 px-3 py-1.5 text-left text-sm text-stone-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)] backdrop-blur-sm transition hover:from-amber-300/20 hover:to-amber-200/5 hover:text-amber-100 disabled:opacity-40',
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
