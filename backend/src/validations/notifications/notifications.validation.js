import { Errors } from '../../shared/utils/errors.js';
import { isUuid, isIsoDateTime } from '../../shared/utils/validators.js';
import { PUSH_PLATFORMS } from '../../models/notifications/notification.model.js';

const fail = (details) => {
  throw Errors.validation('Error de validación', details);
};

export function validateNotificationIdParam(params) {
  if (!isUuid(params.id)) fail([{ field: 'id', message: 'id inválido' }]);
  return { ...params, id: params.id.toLowerCase() };
}

/** Query de listado: unread_only ('true'|'false'), limit 1–100 (20), before ISO. */
export function validateListQuery(query) {
  const details = [];
  const out = { unread_only: false, limit: 20 };
  if (query.unread_only !== undefined) {
    if (query.unread_only !== 'true' && query.unread_only !== 'false') {
      details.push({ field: 'unread_only', message: "unread_only debe ser 'true' o 'false'" });
    } else out.unread_only = query.unread_only === 'true';
  }
  if (query.limit !== undefined) {
    const n = typeof query.limit === 'string' && /^\d+$/.test(query.limit) ? Number(query.limit) : NaN;
    if (!Number.isInteger(n) || n < 1 || n > 100) {
      details.push({ field: 'limit', message: 'limit debe ser un entero entre 1 y 100' });
    } else out.limit = n;
  }
  if (query.before !== undefined) {
    if (!isIsoDateTime(query.before)) {
      details.push({ field: 'before', message: 'before debe ser una fecha ISO 8601 con zona' });
    } else out.before = query.before;
  }
  if (details.length > 0) fail(details);
  return out;
}

export function validateRegisterToken(body) {
  const details = [];
  if (typeof body.token !== 'string' || body.token.length < 1 || body.token.length > 4096) {
    details.push({ field: 'token', message: 'token debe tener entre 1 y 4096 caracteres' });
  }
  if (!PUSH_PLATFORMS.includes(body.platform)) {
    details.push({ field: 'platform', message: `platform debe ser uno de: ${PUSH_PLATFORMS.join(', ')}` });
  }
  if (details.length > 0) fail(details);
  return { token: body.token, platform: body.platform };
}
