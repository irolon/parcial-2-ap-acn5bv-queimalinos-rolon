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
