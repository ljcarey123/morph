import { useState, type ReactNode } from 'react'

interface DisclosureProps {
  label: string
  children: ReactNode
}

export function Disclosure({ label, children }: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen((prev) => !prev)
        }}
        aria-expanded={isOpen}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
      >
        {label}
        <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-full z-10 mt-2 max-h-72 w-80 overflow-y-auto rounded-xl border border-white/10 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-xl">
          {children}
        </div>
      ) : null}
    </div>
  )
}
