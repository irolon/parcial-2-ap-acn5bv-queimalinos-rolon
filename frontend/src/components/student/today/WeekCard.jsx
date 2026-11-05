import Card from '@/components/shared/ui/Card';
import { weekSummary } from '@/utils/routines/week';
import { DAY_OPTIONS } from '@/utils/students/routineDays';

function stateOf(day) {
  if (day.trained) return 'entrenaste';
  return day.planned ? 'día de entrenamiento' : 'descanso';
}

function toneOf(day) {
  if (day.trained) return 'bg-accent text-accentInk';
  return day.planned ? 'bg-ink3 text-bone0' : 'bg-ink2 text-ink5';
}

/**
 * "Esta semana": los siete días de L a D (entrenados resaltados, los de la rutina marcados y hoy con borde) y cuántos
 * van. La letra es solo visual; el estado de cada día ("Lunes: entrenaste") va en un texto para lectores de pantalla.
 */
export default function WeekCard({ strip }) {
  return (
    <Card title="Esta semana">
      <ul aria-label="Esta semana" className="mb-3 flex gap-1">
        {strip.map((day) => (
          <li
            key={day.weekday}
            className={`flex h-9 flex-1 items-center justify-center rounded-sm border font-mono text-[11px] font-semibold ${toneOf(day)} ${
              day.isToday ? 'border-dashed border-accentText' : 'border-transparent'
            }`}
          >
            <span aria-hidden="true">{day.label}</span>
            <span className="sr-only">
              {`${DAY_OPTIONS[day.weekday - 1].label}: ${stateOf(day)}${day.isToday ? ', hoy' : ''}`}
            </span>
          </li>
        ))}
      </ul>
      <p className="font-mono text-[10px] uppercase tracking-[0.5px] text-ink6">{weekSummary(strip)}</p>
    </Card>
  );
}
