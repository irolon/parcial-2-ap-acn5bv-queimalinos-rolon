import { Errors } from '../../../../src/shared/utils/errors.js';

describe('Errors.notificationNotFound', () => {
  it('es un 404 NOTIFICATION_NOT_FOUND', () => {
    const err = Errors.notificationNotFound();
    expect(err.statusCode ?? err.status).toBe(404);
    expect(err.code).toBe('NOTIFICATION_NOT_FOUND');
    expect(err.message).toBe('La notificación no existe');
  });
});
