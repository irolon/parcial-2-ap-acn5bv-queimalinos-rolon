export default function ExerciseGridSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Cargando ejercicios…</span>
      <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-[200px] animate-pulse rounded-xl border border-ink3 bg-ink2" />
        ))}
      </div>
    </div>
  );
}
