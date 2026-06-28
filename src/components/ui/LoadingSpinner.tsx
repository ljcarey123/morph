type SpinnerSize = 'sm' | 'md' | 'lg'

interface LoadingSpinnerProps {
  size?: SpinnerSize
  label?: string
  className?: string
}

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: 'h-3 w-3 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-8 w-8 border-[3px]',
}

export function LoadingSpinner({
  size = 'md',
  label = 'Loading…',
  className = '',
}: LoadingSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-stone-600 border-t-amber-400 ${SIZE_CLASSES[size]} ${className}`.trim()}
    />
  )
}
