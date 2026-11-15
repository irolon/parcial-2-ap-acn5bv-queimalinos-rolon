export function Eyebrow({ children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 font-mono text-[13px] uppercase tracking-[0.08em] text-brand-text before:h-0.5 before:w-[18px] before:rounded-sm before:bg-brand-text ${className}`}
    >
      {children}
    </span>
  )
}
