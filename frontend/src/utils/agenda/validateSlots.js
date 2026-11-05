const HOUR_RE = /^([01]\d|2[0-3]):00$/;
export const MAX_SLOTS = 50;
const OVERLAP = 'La franja se superpone con otra del mismo día';

/** Primer mensaje de error de una franja (mismos textos que el backend), o `null` si está bien. */
function slotError(slot) {
  if (typeof slot !== 'object' || slot === null || Array.isArray(slot)) return 'la franja debe ser un objeto';
  if (!Number.isInteger(slot.weekday) || slot.weekday < 1 || slot.weekday > 7) {
    return 'weekday debe ser un entero entre 1 (lunes) y 7 (domingo)';
  }
  for (const key of ['start_time', 'end_time']) {
    if (typeof slot[key] !== 'string' || !HOUR_RE.test(slot[key])) return `${key} debe ser una hora en punto con formato HH:00`;
  }
  return slot.start_time >= slot.end_time ? 'La hora de inicio tiene que ser anterior a la de fin' : null;
}

const overlaps = (a, b) => a.weekday === b.weekday && a.start_time < b.end_time && b.start_time < a.end_time;

/**
 * Valida las franjas como el PUT /availability. Devuelve un mapa índice → mensaje (vacío si todo está bien);
 * pasar de 50 franjas agrega la clave `'slots'`. Las superpuestas (mismo día) marcan a ambas.
 */
export function validateSlots(slots) {
  const errors = {};
  if (slots.length > MAX_SLOTS) errors.slots = `slots admite hasta ${MAX_SLOTS} franjas`;
  const valid = slots.map((slot, i) => {
    const message = slotError(slot);
    if (message) errors[i] = message;
    return message ? null : slot;
  });
  valid.forEach((a, i) => {
    valid.forEach((b, j) => {
      if (j > i && a && b && overlaps(a, b)) {
        errors[i] ??= OVERLAP;
        errors[j] ??= OVERLAP;
      }
    });
  });
  return errors;
}
