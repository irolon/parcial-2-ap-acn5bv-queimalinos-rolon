export function BrowserFrame({ title, label, children }) {
  return (
    <div role="img" aria-label={label} className="overflow-hidden rounded-panel border border-surface-2 bg-bg-1">
      <div className="flex h-9 items-center gap-2 border-b border-surface-1 bg-bg-2 px-3.5">
        <i className="size-2.5 rounded-pill bg-surface-2" />
        <i className="size-2.5 rounded-pill bg-surface-2" />
        <i className="size-2.5 rounded-pill bg-surface-2" />
        <span className="ml-3 rounded-tag bg-bg-1 px-3 py-0.5 font-mono text-xs text-muted">{title}</span>
      </div>
      {children}
    </div>
  )
}
