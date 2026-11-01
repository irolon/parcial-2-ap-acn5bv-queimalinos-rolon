import { isAvailable, slotKey } from '@/utils/agenda';
import AppointmentBlock from './AppointmentBlock';
import { gridHours, groupByCell } from './groupAppointments';

const COLS = 'grid grid-cols-[50px_repeat(7,minmax(0,1fr))]';
const pad = (n) => String(n).padStart(2, '0');

/** Grilla semanal (escritorio): una fila por hora y una columna por día. */
export default function WeekGrid({ week, availability, appointments, showCancelled, onSelect }) {
  const cells = groupByCell(appointments, showCancelled);
  const hours = gridHours(availability, appointments, showCancelled);
  return (
    <div role="grid" aria-label="Agenda semanal" className="overflow-hidden rounded-[14px] border border-ink2 bg-ink1">
      <div role="row" className={`${COLS} border-b border-ink2`}>
        <div role="columnheader" aria-label="Hora" />
        {week.days.map((day) => (
          <div
            key={day.date}
            role="columnheader"
            aria-current={day.isToday ? 'date' : undefined}
            className={`border-l border-ink2 px-2 py-3 text-center font-mono text-[10px] tracking-widest ${
              day.isToday ? 'text-accentText' : 'text-ink6'
            }`}
          >
            {day.label}
          </div>
        ))}
      </div>
      {hours.map((hour) => (
        <div key={hour} role="row" className={`${COLS} border-b border-ink2 last:border-b-0`}>
          <div role="rowheader" className="px-1.5 py-2 text-right font-mono text-[10px] text-ink6">
            {pad(hour)}:00
          </div>
          {week.days.map((day) => {
            const free = isAvailable(availability, day.weekday, hour);
            return (
              <div
                key={day.date}
                role="gridcell"
                data-available={free}
                className={`flex min-h-9 flex-col gap-1 border-l border-ink2 p-[3px] ${free ? 'bg-ink2' : 'bg-ink1'}`}
              >
                {(cells.get(slotKey(day.date, hour)) ?? []).map((appt) => (
                  <AppointmentBlock key={appt.id} appointment={appt} onSelect={onSelect} />
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
