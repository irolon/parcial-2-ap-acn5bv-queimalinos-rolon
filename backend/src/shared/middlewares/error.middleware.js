import { AppError, Errors } from '../utils/errors.js';
import { env } from '../../config/env.js';

/** 404 para rutas no registradas. */
export function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

// Errores de express.json() (body-parser): los marca con err.type.
const BODY_PARSER_ERRORS = {
  'entity.parse.failed': Errors.invalidJson,
  'entity.too.large': Errors.payloadTooLarge,
};

/**
 * Manejador central de errores. Traduce cualquier error al formato del contrato:
 *   { error: { code, message, details } }
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const bodyError = BODY_PARSER_ERRORS[err?.type];
  if (bodyError) err = bodyError();

  if (err instanceof AppError) {
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
