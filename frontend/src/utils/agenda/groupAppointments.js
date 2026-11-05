import { appointmentCell, hourRange } from './cells';
import { slotKey } from './time';

const visible = (appt, showCancelled) => showCancelled || appt.status !== 'cancelled';

/** Agrupa por celda (`slotKey`), ocultando los cancelados salvo que `showCancelled`. */
export function groupByCell(appointments, showCancelled) {
  const map = new Map();
  for (const appt of appointments ?? []) {
    if (!visible(appt, showCancelled)) continue;
    const { date, hour } = appointmentCell(appt);
    const key = slotKey(date, hour);
    map.set(key, [...(map.get(key) ?? []), appt]);
  }
  return map;
}

/** Filas de la grilla: las de la disponibilidad, ampliadas para que ningún turno visible quede afuera. */
export function gridHours(availability, appointments, showCancelled) {
  const base = hourRange(availability);
  const hours = (appointments ?? [])
    .filter((a) => visible(a, showCancelled))
    .map((a) => appointmentCell(a).hour);
  const first = Math.min(base[0] ?? 8, ...hours);
  const last = Math.max(base[base.length - 1] ?? 20, ...hours);
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}
