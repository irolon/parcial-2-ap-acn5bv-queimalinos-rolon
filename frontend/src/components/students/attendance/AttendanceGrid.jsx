import { calendarCells, dayLabel } from '@/utils/students/attendanceCalendar';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

const CELL = {
  trained: 'bg-accent text-accentInk',
  missed: 'bg-hot/15 text-hot',
  rest: 'bg-ink2 text-bone2',
  upcoming: 'bg-ink2/45 text-ink6',
};

const LEGEND = [
  { label: 'Entrenó', dot: 'bg-accent' },
  { label: 'Faltó', dot: 'bg-hot/60' },
  { label: 'Descanso', dot: 'bg-ink3' },
];

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-ink6 lg:flex-col">
      {LEGEND.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className={`size-2.5 rounded-full ${item.dot}`} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Grilla del mes (`YYYY-MM`) de lunes a domingo con el estado de cada día (`days` de la asistencia), hoy (`today`,
 * `YYYY-MM-DD`) con borde y la leyenda. `dimmed`: todavía es el mes anterior mientras llega el nuevo.
 */
export default function AttendanceGrid({ month, days, today, dimmed = false }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div
        role="group"
        aria-label="Días del mes"
        aria-busy={dimmed || undefined}
        className={`grid w-full grid-cols-7 gap-1 transition-opacity lg:max-w-[360px] ${dimmed ? 'opacity-50' : ''}`}
      >
        {WEEKDAYS.map((d) => (
          <span key={d} aria-hidden="true" className="text-center font-mono text-[10px] text-ink6">
            {d}
          </span>
        ))}
        {calendarCells(month, days).map((cell, i) =>
          cell ? (
            <span
              key={cell.date}
              role="img"
              aria-label={`${cell.day}, ${dayLabel(cell.status)}`}
              className={`flex aspect-square items-center justify-center rounded-md font-mono text-xs ${
                CELL[cell.status] ?? CELL.rest
              } ${cell.date === today ? 'border-2 border-accentText' : ''}`}
            >
              {cell.day}
            </span>
          ) : (
            <span key={`blank-${i}`} aria-hidden="true" />
          ),
        )}
      </div>
      <Legend />
    </div>
  );
}
