import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockAppointments, mockNotify, importSrc, TRAINER, STUDENT, APPT_ID, NOW, apptRow,
} from '../../../helpers/agenda/agenda.setup.js';

const service = await importSrc('services/agenda/appointments.service.js');

const OTHER_TRAINER = { id: '99999999-9999-4999-8999-999999999999', role: 'trainer' };
const OTHER_STUDENT = { id: '88888888-8888-4888-8888-888888888888', role: 'student' };

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockNotify.notify.mockResolvedValue({ id: 'n-1' });
  mockAppointments.findAppointmentById.mockResolvedValue(apptRow());
  mockAppointments.updateStatus.mockImplementation(async (_id, _from, status) => apptRow({ status }));
});
afterEach(() => jest.useRealTimers());

describe('list', () => {
  it('el PT filtra por trainer_id y el rango argentino [from, to+1)', async () => {
    mockAppointments.findAppointmentsInRange.mockResolvedValue([apptRow()]);
    const result = await service.list(TRAINER, { from: '2026-11-02', to: '2026-11-08' });
    expect(mockAppointments.findAppointmentsInRange).toHaveBeenCalledWith(
      { trainer_id: TRAINER.id }, new Date('2026-11-02T03:00:00.000Z'), new Date('2026-11-09T03:00:00.000Z')
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: APPT_ID, scheduled_at: '2026-11-06T21:00:00.000Z', student: expect.objectContaining({ name: 'Lucía' }),
      }),
    ]);
  });

  it('el alumno filtra por student_id (solo los suyos)', async () => {
    mockAppointments.findAppointmentsInRange.mockResolvedValue([]);
    await service.list(STUDENT, { from: '2026-11-02', to: '2026-11-08' });
    expect(mockAppointments.findAppointmentsInRange.mock.calls[0][0]).toEqual({ student_id: STUDENT.id });
  });
});

describe('changeStatus · notificaciones', () => {
  it('el PT confirma: avisa al alumno con push', async () => {
    const result = await service.changeStatus(TRAINER, APPT_ID, { status: 'confirmed' });
    expect(result.status).toBe('confirmed');
    expect(mockAppointments.updateStatus).toHaveBeenCalledWith(APPT_ID, 'pending', 'confirmed');
    expect(mockNotify.notify).toHaveBeenCalledWith({
      userId: STUDENT.id, userRole: 'student', type: 'appointment',
      title: 'Tu turno del vie 06/11 a las 18:00 quedó confirmado', body: null,
      data: { appointment_id: APPT_ID }, push: true,
    });
  });

  it.each(['pending', 'confirmed'])('el PT cancela un turno %s: avisa al alumno con push', async (from) => {
    mockAppointments.findAppointmentById.mockResolvedValue(apptRow({ status: from }));
    await service.changeStatus(TRAINER, APPT_ID, { status: 'cancelled' });
    expect(mockNotify.notify).toHaveBeenCalledWith(expect.objectContaining({
      userId: STUDENT.id, userRole: 'student', push: true, title: 'Tu turno del vie 06/11 a las 18:00 fue cancelado',
    }));
  });

  it.each(['pending', 'confirmed'])(
    'Review Focus 5: el alumno cancela un turno %s: fila al PT sin push',
    async (from) => {
      mockAppointments.findAppointmentById.mockResolvedValue(apptRow({ status: from }));
      await service.changeStatus(STUDENT, APPT_ID, { status: 'cancelled' });
      expect(mockNotify.notify).toHaveBeenCalledTimes(1);
      expect(mockNotify.notify).toHaveBeenCalledWith({
        userId: TRAINER.id, userRole: 'trainer', type: 'appointment',
        title: 'Lucía canceló su turno del vie 06/11 a las 18:00', body: null,
        data: { appointment_id: APPT_ID }, push: false,
      });
    }
  );

  it('un alumno inactivo (dado de baja) sí puede cancelar sus turnos', async () => {
    await expect(service.changeStatus(STUDENT, APPT_ID, { status: 'cancelled' })).resolves.toMatchObject({
      status: 'cancelled',
    });
  });

  it('un fallo al notificar no rompe el cambio de estado', async () => {
    mockNotify.notify.mockRejectedValue(new Error('db'));
    await expect(service.changeStatus(TRAINER, APPT_ID, { status: 'confirmed' })).resolves.toMatchObject({
      status: 'confirmed',
    });
  });
});

describe('changeStatus · transiciones (Review Focus 3)', () => {
  const invalid = expect.objectContaining({ statusCode: 409, code: 'INVALID_STATUS_TRANSITION' });

  it('el alumno no puede confirmar', async () => {
    await expect(service.changeStatus(STUDENT, APPT_ID, { status: 'confirmed' })).rejects.toEqual(invalid);
    expect(mockAppointments.updateStatus).not.toHaveBeenCalled();
  });

  it.each([['trainer', TRAINER], ['student', STUDENT]])('nadie reabre un cancelado (%s)', async (_r, user) => {
    mockAppointments.findAppointmentById.mockResolvedValue(apptRow({ status: 'cancelled' }));
    await expect(service.changeStatus(user, APPT_ID, { status: 'confirmed' })).rejects.toEqual(invalid);
    await expect(service.changeStatus(user, APPT_ID, { status: 'cancelled' })).rejects.toEqual(invalid);
  });

  it('el PT no reconfirma un confirmado', async () => {
    mockAppointments.findAppointmentById.mockResolvedValue(apptRow({ status: 'confirmed' }));
    await expect(service.changeStatus(TRAINER, APPT_ID, { status: 'confirmed' })).rejects.toEqual(invalid);
  });

  it('un turno pasado no se toca: 409 APPOINTMENT_PAST (antes que la transición)', async () => {
    mockAppointments.findAppointmentById.mockResolvedValue(apptRow({ scheduled_at: '2026-11-04T14:00:00+00:00' }));
    await expect(service.changeStatus(TRAINER, APPT_ID, { status: 'cancelled' })).rejects.toMatchObject({
      statusCode: 409, code: 'APPOINTMENT_PAST',
    });
    // Incluso con una transición inválida (alumno confirmando) gana "pasado".
    await expect(service.changeStatus(STUDENT, APPT_ID, { status: 'confirmed' })).rejects.toMatchObject({
      code: 'APPOINTMENT_PAST',
    });
    // Un turno que empieza justo ahora también es pasado.
    mockAppointments.findAppointmentById.mockResolvedValue(apptRow({ scheduled_at: NOW.toISOString() }));
    await expect(service.changeStatus(TRAINER, APPT_ID, { status: 'cancelled' })).rejects.toMatchObject({
      code: 'APPOINTMENT_PAST',
    });
    expect(mockAppointments.updateStatus).not.toHaveBeenCalled();
  });
});

describe('changeStatus · carrera', () => {
  it('si el estado cambió en el medio (updateStatus devuelve null): 409 y no se notifica', async () => {
    mockAppointments.updateStatus.mockResolvedValue(null);
    await expect(service.changeStatus(TRAINER, APPT_ID, { status: 'confirmed' })).rejects.toMatchObject({
      statusCode: 409, code: 'INVALID_STATUS_TRANSITION',
    });
    expect(mockNotify.notify).not.toHaveBeenCalled();
  });
});

describe('changeStatus · acceso', () => {
  it.each([
    ['PT de otro', OTHER_TRAINER],
    ['alumno de otro', OTHER_STUDENT],
  ])('turno ajeno (%s): 403 sin tocar nada', async (_l, user) => {
    await expect(service.changeStatus(user, APPT_ID, { status: 'cancelled' })).rejects.toMatchObject({
      statusCode: 403,
    });
    expect(mockAppointments.updateStatus).not.toHaveBeenCalled();
    expect(mockNotify.notify).not.toHaveBeenCalled();
  });

  it('turno inexistente: 403', async () => {
    mockAppointments.findAppointmentById.mockResolvedValue(null);
    await expect(service.changeStatus(TRAINER, APPT_ID, { status: 'cancelled' })).rejects.toMatchObject({
      statusCode: 403,
    });
  });
});

describe('cancelFutureForStudent', () => {
  it('cancela desde ahora los turnos futuros del alumno (lo filtra el repositorio) y devuelve cuántos', async () => {
    mockAppointments.cancelFutureForStudent.mockResolvedValue(2);
    await expect(service.cancelFutureForStudent(STUDENT.id)).resolves.toBe(2);
    expect(mockAppointments.cancelFutureForStudent).toHaveBeenCalledWith(STUDENT.id, NOW);
    expect(mockNotify.notify).not.toHaveBeenCalled();
  });
});
