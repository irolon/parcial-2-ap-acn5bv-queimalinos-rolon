import { appointmentCell } from '@/utils/agenda';
import AppointmentBlock from './AppointmentBlock';
import { groupByCell } from './groupAppointments';

const pad = (n) => String(n).padStart(2, '0');

/** Semana en lista por día (menos de 768 px). */
export default function WeekList({ week, appointments, showCancelled, onSelect }) {
  const shown = [...groupByCell(appointments, showCancelled).values()].flat();
  return (
    <div className="flex flex-col gap-4">
      {week.days.map((day) => {
        const items = shown
          .filter((a) => appointmentCell(a).date === day.date)
          .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
        return (
          <section key={day.date} aria-label={day.label} className="rounded-xl border border-ink2 bg-ink1 p-3">
            <h3 className={`mb-2 font-mono text-[11px] tracking-widest ${day.isToday ? 'text-accentText' : 'text-ink6'}`}>
              {day.label}
            </h3>
            {items.length === 0 ? (
              <p className="font-body text-sm text-ink6">Sin turnos</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((appt) => (
                  <li key={appt.id} className="flex items-center gap-3">
                    <span className="w-12 shrink-0 font-mono text-xs text-ink6">
                      {pad(appointmentCell(appt).hour)}:00
                    </span>
                    <AppointmentBlock appointment={appt} onSelect={onSelect} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
