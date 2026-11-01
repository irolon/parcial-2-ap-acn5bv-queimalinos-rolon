import { Errors } from '../../shared/utils/errors.js';
import { isRealCalendarDate } from '../../shared/utils/validators.js';
import { AVAILABILITY_MAX_SLOTS } from '../../models/agenda/availability.model.js';
import { DAY_MS } from '../../shared/utils/dates/dates.js';

const fail = (details) => {
  throw Errors.validation('Error de validación', details);
};

const HOUR_RE = /^([01]\d|2[0-3]):00$/;

/** Valida una franja y, si está bien, la devuelve normalizada. */
function checkSlot(slot, i, details) {
  const field = `slots[${i}]`;
  if (typeof slot !== 'object' || slot === null || Array.isArray(slot)) {
    details.push({ field, message: 'la franja debe ser un objeto' });
    return null;
  }
  const before = details.length;
  if (!Number.isInteger(slot.weekday) || slot.weekday < 1 || slot.weekday > 7) {
    details.push({ field: `${field}.weekday`, message: 'weekday debe ser un entero entre 1 (lunes) y 7 (domingo)' });
  }
  for (const key of ['start_time', 'end_time']) {
    if (typeof slot[key] !== 'string' || !HOUR_RE.test(slot[key])) {
      details.push({ field: `${field}.${key}`, message: `${key} debe ser una hora en punto con formato HH:00` });
    }
  }
  if (details.length === before && slot.start_time >= slot.end_time) {
    details.push({ field: `${field}.end_time`, message: 'La hora de inicio tiene que ser anterior a la de fin' });
  }
  if (details.length > before) return null;
  return { weekday: slot.weekday, start_time: slot.start_time, end_time: slot.end_time };
}

/** Marca cada franja que pisa a otra del mismo día (las que solo se tocan en el borde no se pisan). */
function checkOverlaps(slots, details) {
  const overlapping = new Set();
  slots.forEach((a, i) => {
    slots.forEach((b, j) => {
      if (j > i && a && b && a.weekday === b.weekday && a.start_time < b.end_time && b.start_time < a.end_time) {
        overlapping.add(i).add(j);
      }
    });
  });
  for (const i of [...overlapping].sort((a, b) => a - b)) {
    details.push({ field: `slots[${i}]`, message: 'La franja se superpone con otra del mismo día' });
  }
}

/** Body del PUT: { slots: [{ weekday, start_time, end_time }] } (0–50, sin superposición). */
export function validateAvailabilityBody(body) {
  const slots = body?.slots;
  if (!Array.isArray(slots)) fail([{ field: 'slots', message: 'slots debe ser una lista' }]);
  if (slots.length > AVAILABILITY_MAX_SLOTS) {
    fail([{ field: 'slots', message: `slots admite hasta ${AVAILABILITY_MAX_SLOTS} franjas` }]);
  }
  const details = [];
  const clean = slots.map((slot, i) => checkSlot(slot, i, details));
  checkOverlaps(clean, details);
  if (details.length > 0) fail(details);
  return { slots: clean };
}

/** Query de rango: from y to 'YYYY-MM-DD' reales, from <= to y a lo sumo `maxDays` días inclusivos. */
export function validateRangeQuery(query, maxDays) {
  const details = [];
  for (const key of ['from', 'to']) {
    if (!isRealCalendarDate(query?.[key])) {
      details.push({ field: key, message: `${key} debe ser una fecha YYYY-MM-DD válida` });
    }
  }
  if (details.length > 0) fail(details);
  const days = (Date.parse(query.to) - Date.parse(query.from)) / DAY_MS + 1;
  if (days < 1) fail([{ field: 'to', message: 'to no puede ser anterior a from' }]);
  if (days > maxDays) fail([{ field: 'to', message: `El rango no puede pasar de ${maxDays} días` }]);
  return { from: query.from, to: query.to };
}
