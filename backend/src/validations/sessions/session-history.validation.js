import { Errors } from '../../shared/utils/errors.js';
import { isUuid } from '../../shared/utils/validators.js';

/** Valida ?page=&limit= del historial: inválidos caen al default; limit tope 100. */
export function validateHistoryQuery(query) {
  const page = Number.parseInt(query?.page, 10);
  const limit = Number.parseInt(query?.limit, 10);
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    limit: Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 20,
  };
}

/** Valida :id (alumno) y :sessionId; los devuelve en minúscula. */
export function validateHistoryDetailParams(params) {
  const details = [];
  for (const field of ['id', 'sessionId']) {
    if (!isUuid(params?.[field])) details.push({ field, message: `${field} inválido` });
  }
  if (details.length > 0) throw Errors.validation('Error de validación', details);
  return { id: params.id.toLowerCase(), sessionId: params.sessionId.toLowerCase() };
}
