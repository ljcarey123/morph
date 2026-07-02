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
        onClick={() => { setIsOpen((prev) => !prev) }}
        aria-expanded={isOpen}
        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
      >
        {label}
        <span className={`text-[10px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-full z-10 mt-2 max-h-72 w-80 animate-[chip-in_200ms_cubic-bezier(0.34,1.56,0.64,1)_both] overflow-y-auto rounded-2xl border border-slate-100 bg-white p-4 shadow-xl">
          {children}
        </div>
      ) : null}
    </div>
  )
}
