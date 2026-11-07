/**
 * Error de aplicación con código semántico y status HTTP.
 * El error.middleware traduce esto al formato de error del contrato de API:
 *   { error: { code, message, details } }
 */
/** Código del 409 al asignar un desafío que el alumno ya tiene activo. */
export const CHALLENGE_ALREADY_ACTIVE = 'CHALLENGE_ALREADY_ACTIVE';

export class AppError extends Error {
  constructor(statusCode, code, message, details = [], headers = undefined) {
    super(message);
    if (headers) this.headers = headers;
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
  routineExerciseNotFound: () =>
    new AppError(404, 'ROUTINE_EXERCISE_NOT_FOUND', 'El ejercicio no es parte de esta rutina'),
  routineNeedsExercise: () =>
    new AppError(409, 'ROUTINE_NEEDS_EXERCISE', 'La rutina tiene que tener al menos un ejercicio'),
  templateNotFound: () => new AppError(404, 'TEMPLATE_NOT_FOUND', 'Plantilla no encontrada'),
  templateStructureInvalid: (details) =>
    new AppError(
      409,
      'TEMPLATE_STRUCTURE_INVALID',
      'La plantilla está incompleta: editala antes de asignarla',
      details
    ),
  templateExercisesUnavailable: (missingIds, status = 409) =>
    new AppError(
      status,
      'TEMPLATE_EXERCISES_UNAVAILABLE',
      'La plantilla tiene ejercicios que ya no están disponibles',
      missingIds.map((id) => ({ field: 'exercise_id', message: id }))
    ),
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
  sessionNotFound: () => new AppError(404, 'SESSION_NOT_FOUND', 'La sesión no existe'),
  challengeNotFound: () => new AppError(404, 'CHALLENGE_NOT_FOUND', 'El desafío no existe'),
  challengeInUse: (message = 'El desafío tiene asignaciones y no se puede borrar') =>
    new AppError(409, 'CHALLENGE_IN_USE', message),
  challengeAlreadyActive: () =>
    new AppError(409, CHALLENGE_ALREADY_ACTIVE, 'El alumno ya tiene este desafío activo'),
  notificationNotFound: () =>
    new AppError(404, 'NOTIFICATION_NOT_FOUND', 'La notificación no existe'),
  sessionIdConflict: () =>
    new AppError(409, 'SESSION_ID_CONFLICT', 'Ya existe una sesión con ese id'),
  exerciseNotFound: () =>
    new AppError(404, 'EXERCISE_NOT_FOUND', 'El ejercicio no existe'),
  exerciseInUse: () =>
    new AppError(
      409,
      'EXERCISE_IN_USE',
      'No podés borrar este ejercicio porque está en una rutina o en el historial de un alumno'
    ),
  slotTaken: () => new AppError(409, 'SLOT_TAKEN', 'Ese horario ya está ocupado'),
  slotUnavailable: (message) => new AppError(400, 'SLOT_UNAVAILABLE', message),
  invalidStatusTransition: () =>
    new AppError(409, 'INVALID_STATUS_TRANSITION', 'No se puede pasar el turno a ese estado'),
  appointmentLimit: (max) =>
    new AppError(409, 'APPOINTMENT_LIMIT', `Ya tenés ${max} turnos pendientes: esperá a que tu entrenador los confirme`),
  appointmentPast: () => new AppError(409, 'APPOINTMENT_PAST', 'El turno ya pasó'),
  studentInactive: () => new AppError(409, 'STUDENT_INACTIVE', 'El alumno está dado de baja'),
  messageEmpty: () =>
    new AppError(400, 'MESSAGE_EMPTY', 'Escribí un mensaje o adjuntá una foto'),
  imageTooLarge: () => new AppError(413, 'IMAGE_TOO_LARGE', 'La foto supera 5 MB'),
  imageTypeInvalid: () =>
    new AppError(415, 'IMAGE_TYPE_INVALID', 'La foto tiene que ser JPG, PNG o WebP'),
  studentNotFound: () => new AppError(404, 'STUDENT_NOT_FOUND', 'El alumno no existe'),
  aiUnavailable: (message = 'El asistente no está disponible ahora. Probá de nuevo o armá la rutina a mano.') =>
    new AppError(503, 'AI_UNAVAILABLE', message),
  aiInvalidResponse: (message = 'El asistente devolvió una propuesta inválida. Probá de nuevo.') =>
    new AppError(502, 'AI_INVALID_RESPONSE', message),
  chatLimitReached: () =>
    new AppError(429, 'CHAT_LIMIT_REACHED', 'Llegaste al límite de consultas de hoy. Mañana podés seguir.'),
  sessionFinished: () => new AppError(400, 'SESSION_FINISHED', 'La sesión ya terminó'),
  generationNotFound: () => new AppError(404, 'GENERATION_NOT_FOUND', 'La propuesta no existe'),
  generationAlreadySaved: () =>
    new AppError(409, 'GENERATION_ALREADY_SAVED', 'Esta propuesta ya se guardó como plantilla'),
  rateLimitExceeded: (
    retryAfterSeconds,
    message = 'Llegaste al límite de propuestas por hora. Probá de nuevo más tarde.'
  ) =>
    new AppError(429, 'RATE_LIMIT_EXCEEDED', message, [], {
      'Retry-After': String(retryAfterSeconds),
    }),
  internal: (message = 'Error interno del servidor') =>
    new AppError(500, 'INTERNAL_ERROR', message),
};
