import { Errors } from '../utils/errors.js';

/**
 * Para `role`, rechaza con 403 (`message`) un body con cualquier campo fuera de `allowed`,
 * aunque el validador lo fuera a ignorar. Va ANTES de `validate(...)`, que descarta lo
 * desconocido. Los demás roles pasan. Debe usarse después de authenticate.
 *
 *   router.patch('/:id', authenticate, ..., limitBodyFieldsForRole('student', ['name'], '…'), validate(...), ...)
 */
export function limitBodyFieldsForRole(role, allowed, message) {
  return (req, _res, next) => {
    if (req.user?.role !== role || !req.body || typeof req.body !== 'object') return next();
    const extra = Object.keys(req.body).some((field) => !allowed.includes(field));
    return next(extra ? Errors.forbidden(message) : undefined);
  };
}
