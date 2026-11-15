export function MiniRow({ left, right, className = '' }) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-chip border border-surface-1 bg-bg-1 px-3 py-2 text-[13px] text-bone-2 ${className}`}>
      <span className="flex min-w-0 items-center gap-2">{left}</span>
      {right != null && <span className="font-mono text-muted">{right}</span>}
    </div>
  )
}
