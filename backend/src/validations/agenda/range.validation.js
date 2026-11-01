import { Errors } from '../../shared/utils/errors.js';
import { isRealCalendarDate } from '../../shared/utils/validators.js';
import { DAY_MS } from '../../shared/utils/dates/dates.js';

const fail = (details) => {
  throw Errors.validation('Error de validación', details);
};

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
