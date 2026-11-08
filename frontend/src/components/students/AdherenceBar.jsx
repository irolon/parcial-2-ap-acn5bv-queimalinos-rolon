import { adherencePct, adherenceTitle, adherenceTone } from '@/utils/students/adherence';

const FILL = { good: 'bg-good', accent: 'bg-accent', hot: 'bg-hot' };

/** Barra de adherencia de 7 días de la tarjeta del alumno, o "Sin plan" (como la fila del celular). */
export default function AdherenceBar({ student }) {
  const pct = adherencePct(student);
  if (pct === null) return <span className="mt-1 block font-mono text-[11px] text-ink6">Sin plan</span>;
  const value = Math.min(100, Math.max(0, pct));
  return (
    <span className="mt-1 flex items-center gap-2" title={adherenceTitle(student)}>
      <span
        role="meter"
        aria-label="Adherencia de los últimos 7 días"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        className="block h-1 w-24 shrink-0 overflow-hidden rounded-sm bg-ink3"
      >
        <span className={`block h-full rounded-sm ${FILL[adherenceTone(pct)]}`} style={{ width: `${value}%` }} />
      </span>
      <span aria-hidden="true" className="font-mono text-[11px] text-ink6">
        {pct}%
      </span>
    </span>
  );
}
