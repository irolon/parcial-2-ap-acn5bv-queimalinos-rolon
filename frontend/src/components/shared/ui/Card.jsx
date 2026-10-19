export default function Card({ title, extra, padding = 20, className = '', children, ...rest }) {
  return (
    <div
      className={`rounded-xl border border-ink2 bg-ink1 ${className}`}
      style={{ padding }}
      {...rest}
    >
      {(title || extra) && (
        <div className="mb-3.5 flex items-center justify-between">
          {title && <div className="font-display text-[15px] font-semibold text-bone0">{title}</div>}
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}
