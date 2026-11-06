import { Errors } from '../../../../src/shared/utils/errors.js';

describe('Errors.notificationNotFound', () => {
  it('es un 404 NOTIFICATION_NOT_FOUND', () => {
    const err = Errors.notificationNotFound();
    expect(err.statusCode ?? err.status).toBe(404);
    expect(err.code).toBe('NOTIFICATION_NOT_FOUND');
    expect(err.message).toBe('La notificación no existe');
  });
});

describe('Errors de la agenda', () => {
  it.each([
    ['slotTaken', [], 409, 'SLOT_TAKEN', 'Ese horario ya está ocupado'],
    ['slotUnavailable', ['Fuera de la disponibilidad'], 400, 'SLOT_UNAVAILABLE', 'Fuera de la disponibilidad'],
    ['invalidStatusTransition', [], 409, 'INVALID_STATUS_TRANSITION', 'No se puede pasar el turno a ese estado'],
    ['appointmentPast', [], 409, 'APPOINTMENT_PAST', 'El turno ya pasó'],
  ])('%s', (name, args, status, code, message) => {
    const err = Errors[name](...args);
    expect(err.statusCode).toBe(status);
    expect(err.code).toBe(code);
    expect(err.message).toBe(message);
  });
});

describe('Errors de mensajería', () => {
  it.each([
    ['messageEmpty', 400, 'MESSAGE_EMPTY', 'Escribí un mensaje o adjuntá una foto'],
    ['imageTooLarge', 413, 'IMAGE_TOO_LARGE', 'La foto supera 5 MB'],
    ['imageTypeInvalid', 415, 'IMAGE_TYPE_INVALID', 'La foto tiene que ser JPG, PNG o WebP'],
  ])('%s', (name, status, code, message) => {
    const err = Errors[name]();
    expect(err.statusCode ?? err.status).toBe(status);
    expect(err.code).toBe(code);
    expect(err.message).toBe(message);
  });
});

describe('Errors del asistente IA del entrenador', () => {
  it.each([
    ['aiUnavailable', [], 503, 'AI_UNAVAILABLE', 'El asistente no está disponible ahora. Probá de nuevo o armá la rutina a mano.'],
    ['aiInvalidResponse', [], 502, 'AI_INVALID_RESPONSE', 'El asistente devolvió una propuesta inválida. Probá de nuevo.'],
    ['generationNotFound', [], 404, 'GENERATION_NOT_FOUND', 'La propuesta no existe'],
    ['generationAlreadySaved', [], 409, 'GENERATION_ALREADY_SAVED', 'Esta propuesta ya se guardó como plantilla'],
    ['studentNotFound', [], 404, 'STUDENT_NOT_FOUND', 'El alumno no existe'],
  ])('%s', (name, args, status, code, message) => {
    const err = Errors[name](...args);
    expect(err.statusCode).toBe(status);
    expect(err.code).toBe(code);
    expect(err.message).toBe(message);
  });

  it('rateLimitExceeded es 429 con Retry-After en segundos', () => {
    const err = Errors.rateLimitExceeded(120);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.headers).toEqual({ 'Retry-After': '120' });
  });

  it('templateExercisesUnavailable acepta otro status (400 al guardar una propuesta)', () => {
    const err = Errors.templateExercisesUnavailable(['ex-1'], 400);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('TEMPLATE_EXERCISES_UNAVAILABLE');
    expect(Errors.templateExercisesUnavailable(['ex-1']).statusCode).toBe(409);
  });
});
