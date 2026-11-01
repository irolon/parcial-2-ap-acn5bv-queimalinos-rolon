import { STATUS_STYLES, appointmentAriaLabel, studentName } from './status';

/** Turno dentro de una celda o de la lista: botón con el color de su estado. */
export default function AppointmentBlock({ appointment, onSelect }) {
  const style = STATUS_STYLES[appointment.status];
  return (
    <button
      type="button"
      aria-label={appointmentAriaLabel(appointment)}
      data-status={appointment.status}
      onClick={() => onSelect(appointment)}
      className={`flex w-full cursor-pointer flex-col items-start rounded-[5px] border-l-2 px-2 py-1 text-left focus-visible:outline-2 focus-visible:outline-accentText ${style.block}`}
    >
      <span className="w-full truncate font-display text-[11px] font-medium leading-tight text-bone0">
        {studentName(appointment)}
      </span>
      <span className={`font-mono text-[9px] uppercase tracking-wider no-underline ${style.text}`}>
        {style.label}
      </span>
    </button>
  );
}
