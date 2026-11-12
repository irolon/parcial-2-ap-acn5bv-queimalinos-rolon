/**
 * Historial del chat por día de Argentina (GX5, GET /chat/history). Spec:
 * docs/superpowers/specs/2026-11-09-gx5-asistente-ia-alumno-design.md.
 */
import { utcToArgentina } from '../../shared/utils/dates/argentina.js';

/** Filas que se leen como mucho para `days` días: cada día tiene a lo sumo `limitPerDay` pares. */
export const historyCap = (days, limitPerDay) => days * limitPerDay * 2;

/**
 * Agrupa los mensajes (de los más nuevos a los más viejos, como los lee el repositorio) por día argentino:
 * `{ days: [{ date, messages }], next_before }`, días del más nuevo al más viejo y mensajes de cada día en orden
 * (la consulta antes que su respuesta). Si se llegó al tope de filas, el día más viejo pudo quedar cortado: se
 * descarta (salvo que sea el único) y lo trae la página siguiente. `next_before` es el día más viejo devuelto si
 * puede haber más, o null.
 */
export function groupByDay(rows, days, limitPerDay) {
  const groups = [];
  for (const row of rows) {
    const { date } = utcToArgentina(row.created_at);
    if (groups.at(-1)?.date !== date) groups.push({ date, messages: [] });
    groups.at(-1).messages.push(row);
  }
  const capped = rows.length >= historyCap(days, limitPerDay);
  if (capped && groups.length > 1) groups.pop();
  const kept = groups.slice(0, days).map(({ date, messages }) => ({ date, messages: messages.reverse() }));
  const more = capped || groups.length > days;
  return { days: kept, next_before: more && kept.length > 0 ? kept.at(-1).date : null };
}
