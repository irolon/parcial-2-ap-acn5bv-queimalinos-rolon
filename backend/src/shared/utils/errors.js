/**
 * Error de aplicación con código semántico y status HTTP.
 * El error.middleware traduce esto al formato de error del contrato de API:
 *   { error: { code, message, details } }
 */
export class AppError extends Error {
  constructor(statusCode, code, message, details = []) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
}

// Atajos para los errores más comunes del dominio.
export const Errors = {
  validation: (message = 'Datos inválidos', details = []) =>
    new AppError(400, 'VALIDATION_ERROR', message, details),
  invalidCredentials: () =>
    new AppError(401, 'INVALID_CREDENTIALS', 'Email o contraseña incorrectos'),
  unauthorized: (message = 'No autenticado') => new AppError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'No tenés permiso para esta acción') =>
    new AppError(403, 'FORBIDDEN', message),
  notFound: (message = 'Recurso no encontrado') => new AppError(404, 'NOT_FOUND', message),
  emailExists: () =>
    new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Ya existe una cuenta con ese email'),
  studentEmailExists: () =>
    new AppError(409, 'STUDENT_EMAIL_EXISTS', 'Ya existe un alumno con ese email'),
  invitationNotFound: () =>
    new AppError(404, 'INVITATION_NOT_FOUND', 'La invitación no existe'),
  invitationExpired: () =>
    new AppError(410, 'INVITATION_EXPIRED', 'Esta invitación venció, pedile una nueva a tu profe'),
  invitationUsed: () =>
    new AppError(410, 'INVITATION_ALREADY_USED', 'Esta invitación ya fue utilizada'),
  accountDisabled: () =>
    new AppError(401, 'ACCOUNT_DISABLED', 'Tu entrenador dio de baja tu cuenta'),
  metricNotFound: () => new AppError(404, 'METRIC_NOT_FOUND', 'La medida no existe'),
  metricIdConflict: () =>
    new AppError(409, 'METRIC_ID_CONFLICT', 'Ya existe una medida con ese id'),
  internal: (message = 'Error interno del servidor') =>
    new AppError(500, 'INTERNAL_ERROR', message),
};
