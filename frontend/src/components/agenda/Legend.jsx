import { STATUS_STYLES } from './status';

/** Leyenda de colores de los estados. */
export default function Legend() {
  return (
    <ul aria-label="Referencias" className="flex flex-wrap gap-4 font-mono text-[10px] uppercase tracking-wider text-ink6">
      {Object.values(STATUS_STYLES).map((s) => (
        <li key={s.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`h-2 w-2 rounded-full ${s.dot}`} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}
