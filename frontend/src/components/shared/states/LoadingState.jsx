export default function LoadingState({ rows = 3, label = 'Cargando…' }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3 p-1">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          data-testid="skeleton-row"
          className="h-14 animate-pulse rounded-xl bg-ink2"
          style={{ opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  );
}
