import Card from '@/components/shared/ui/Card';
import { planRows } from '@/utils/routines/todayPlan';

const HEAD = 'pb-2.5 text-left font-mono text-[9px] font-normal uppercase tracking-[1px] text-ink6';
const CELL = 'py-3 font-display text-[13px]';

/** "Plan de hoy": una fila por ejercicio con #, nombre, series × reps y el peso sugerido ("—" si no hay). */
export default function PlanTable({ exercises }) {
  const rows = planRows(exercises ?? []);
  if (rows.length === 0) return null;
  return (
    <Card title="Plan de hoy">
      <table aria-label="Plan de hoy" className="w-full border-collapse">
        <thead>
          <tr className="border-b border-ink2">
            <th scope="col" className={`${HEAD} w-9`}>#</th>
            <th scope="col" className={HEAD}>Ejercicio</th>
            <th scope="col" className={`${HEAD} whitespace-nowrap pr-3`}>Series × reps</th>
            <th scope="col" className={`${HEAD} text-right`}>Sugerido</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-ink2 last:border-b-0">
              <td className={`${CELL} font-mono text-[11px] text-ink6`}>{String(row.position).padStart(2, '0')}</td>
              <td className={`${CELL} pr-3 font-medium text-bone0`}>{row.name}</td>
              <td className={`${CELL} whitespace-nowrap pr-3 font-semibold text-bone0`}>{row.setsReps}</td>
              <td className={`${CELL} whitespace-nowrap text-right font-semibold text-accentText`}>{row.suggestedLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
