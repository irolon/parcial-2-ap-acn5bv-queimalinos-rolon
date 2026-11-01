import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mockNotify, triggers } from '../../../../helpers/notifications/triggers.setup.js';

const appointment = (studentName = 'Lucía') => ({
  id: 'ap-1',
  trainer_id: 'tr-1',
  scheduled_at: '2026-11-06T21:00:00.000Z',
  student: { id: 'st-1', name: studentName, avatar_url: null },
});

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockNotify.notify.mockResolvedValue({ id: 'n-1' });
});

describe('triggers · onAppointmentChanged', () => {
  it.each([
    ['confirmed', 'st-1', 'student', true, 'Tu turno del vie 06/11 a las 18:00 quedó confirmado'],
    ['cancelledByTrainer', 'st-1', 'student', true, 'Tu turno del vie 06/11 a las 18:00 fue cancelado'],
    ['createdByTrainer', 'st-1', 'student', true, 'Tu entrenador te agendó un turno el vie 06/11 a las 18:00'],
    ['requested', 'tr-1', 'trainer', false, 'Lucía pidió un turno para el vie 06/11 a las 18:00'],
    ['cancelledByStudent', 'tr-1', 'trainer', false, 'Lucía canceló su turno del vie 06/11 a las 18:00'],
  ])('%s avisa a %s (%s), push=%s', async (event, userId, userRole, push, title) => {
    await triggers.onAppointmentChanged(event, appointment());
    expect(mockNotify.notify).toHaveBeenCalledWith({
      userId, userRole, type: 'appointment', title, body: null, data: { appointment_id: 'ap-1' }, push,
    });
  });

  it('sin nombre del alumno, el aviso al PT dice "Tu alumno"', async () => {
    await triggers.onAppointmentChanged('requested', appointment(null));
    expect(mockNotify.notify).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tu alumno pidió un turno para el vie 06/11 a las 18:00' })
    );
  });

  it('un evento desconocido no lanza ni notifica', async () => {
    await expect(triggers.onAppointmentChanged('inventado', appointment())).resolves.toBeUndefined();
    expect(mockNotify.notify).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('un notify que falla se traga y se loguea', async () => {
    mockNotify.notify.mockRejectedValue(new Error('db'));
    await expect(triggers.onAppointmentChanged('confirmed', appointment())).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith('[notifications] appointment confirmed', 'db');
  });
});
