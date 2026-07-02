import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'ghost' | 'icon' | 'chip'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-600 disabled:opacity-40',
  ghost:
    'rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40',
  icon: 'rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40',
  chip: 'rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-sm text-slate-600 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:opacity-40',
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
