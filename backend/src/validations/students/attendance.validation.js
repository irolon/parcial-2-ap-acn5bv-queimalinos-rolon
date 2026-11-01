import { Errors } from '../../shared/utils/errors.js';
import { localDate } from '../../shared/utils/dates.js';

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
/** Antes de esto no hay datos de la app: un año menor se rechaza (y no se recorren siglos de días). */
const MIN_MONTH = '2020-01';

/**
 * Valida la query de GET /students/:id/attendance. `month` (YYYY-MM) es opcional: por defecto,
 * el mes actual en hora argentina. No puede ser posterior al mes actual.
 */
export function validateAttendanceQuery(query) {
  const current = localDate().slice(0, 7);
  if (query.month === undefined) return { month: current };
  if (typeof query.month !== 'string' || !MONTH_RE.test(query.month)) {
    throw Errors.validation('Error de validación', [{ field: 'month', message: 'month debe tener el formato YYYY-MM' }]);
  }
  if (query.month < MIN_MONTH) {
    throw Errors.validation('Error de validación', [{ field: 'month', message: `month no puede ser anterior a ${MIN_MONTH}` }]);
  }
  if (query.month > current) {
    throw Errors.validation('Error de validación', [{ field: 'month', message: 'month no puede ser un mes futuro' }]);
  }
  return { month: query.month };
}
