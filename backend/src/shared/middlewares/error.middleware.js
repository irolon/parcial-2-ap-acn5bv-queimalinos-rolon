import { AppError } from '../utils/errors.js';
import { env } from '../../config/env.js';

/** 404 para rutas no registradas. */
export function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

/**
 * Manejador central de errores. Traduce cualquier error al formato del contrato:
 *   { error: { code, message, details } }
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    if (err.headers) res.set(err.headers);
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Error no controlado: log completo en servidor, mensaje genérico al cliente.
  console.error('[UNHANDLED ERROR]', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      details: env.NODE_ENV === 'development' ? [err.message] : [],
    },
  });
}
