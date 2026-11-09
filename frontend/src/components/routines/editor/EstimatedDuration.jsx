import { estimateMinutes } from '@/utils/routines/duration';

/** "Duración estimada ~N min" de la tabla del editor; sin ejercicios (o con todo vacío, 0 min) no se muestra. */
export default function EstimatedDuration({ exercises }) {
  const minutes = estimateMinutes(exercises ?? []);
  if (minutes === 0) return null;
  return (
    <p
      title="Series × (45 s de trabajo + descanso)"
      className="font-mono text-[11px] uppercase tracking-[1px] text-ink6"
    >
      Duración estimada ~{minutes} min
    </p>
  );
}
