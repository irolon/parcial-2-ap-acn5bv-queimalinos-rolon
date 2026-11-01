import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockAppointments, mockAvailability, mockStudents, mockNotify, importSrc,
  TRAINER, STUDENT, OTHER_STUDENT_ID, NOW, studentRow, apptRow,
} from '../../../helpers/agenda/agenda.setup.js';

const { createForStudent, createForTrainer } = await importSrc('services/agenda/appointment-create.service.js');
const { Errors } = await importSrc('shared/utils/errors.js');

// Viernes 06/11 18:00 AR = 21:00 UTC. Disponibilidad: viernes 14–20.
const FRI_18 = '2026-11-06T21:00:00.000Z';
const AVAILABILITY = [{ weekday: 5, start_time: '14:00:00', end_time: '20:00:00' }];
const unavailable = expect.objectContaining({ statusCode: 400, code: 'SLOT_UNAVAILABLE' });

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  mockStudents.findStudentById.mockResolvedValue(studentRow());
  mockAvailability.findAvailability.mockResolvedValue(AVAILABILITY);
  mockAppointments.insertAppointment.mockImplementation(async (row) => apptRow(row));
  mockNotify.notify.mockResolvedValue({ id: 'n-1' });
});
afterEach(() => jest.useRealTimers());

describe('createForStudent', () => {
  const input = { scheduled_at: FRI_18, notes: 'Piernas' };

  it('crea el turno pending de 60 min en el PT del alumno y avisa al PT sin push', async () => {
    const result = await createForStudent(STUDENT, input);
    expect(mockAppointments.insertAppointment).toHaveBeenCalledWith({
      trainer_id: TRAINER.id, student_id: STUDENT.id, scheduled_at: FRI_18, duration_min: 60,
      status: 'pending', notes: 'Piernas',
    });
    expect(result).toMatchObject({ status: 'pending', student: { id: STUDENT.id, name: 'Lucía' } });
    expect(mockNotify.notify).toHaveBeenCalledWith({
      userId: TRAINER.id, userRole: 'trainer', type: 'appointment',
      title: 'Lucía pidió un turno para el vie 06/11 a las 18:00', body: null,
      data: { appointment_id: result.id }, push: false,
    });
  });

  it.each([
    ['no está en hora en punto', '2026-11-06T21:30:00.000Z'],
    ['ya pasó', '2026-11-03T21:00:00.000Z'],
    ['es la hora actual', '2026-11-04T15:00:00.000Z'],
    ['está a más de 28 días', '2026-12-04T21:00:00.000Z'],
    ['cae fuera de la disponibilidad (sábado)', '2026-11-07T21:00:00.000Z'],
    ['cae fuera de la disponibilidad (viernes 20:00, el fin es exclusivo)', '2026-11-06T23:00:00.000Z'],
    ['cae fuera de la disponibilidad (viernes 13:00)', '2026-11-06T16:00:00.000Z'],
  ])('400 SLOT_UNAVAILABLE si el horario %s', async (_label, scheduled_at) => {
    await expect(createForStudent(STUDENT, { scheduled_at, notes: null })).rejects.toEqual(unavailable);
    expect(mockAppointments.insertAppointment).not.toHaveBeenCalled();
  });

  it('acepta justo hoy + 28 días si está disponible', async () => {
    mockAvailability.findAvailability.mockResolvedValue([{ weekday: 3, start_time: '08:00:00', end_time: '23:00:00' }]);
    await expect(
      createForStudent(STUDENT, { scheduled_at: '2026-12-02T15:00:00.000Z', notes: null })
    ).resolves.toBeDefined();
  });

  it('un horario a las 22:00 AR (01:00 UTC del día siguiente) se valida con el día argentino', async () => {
    mockAvailability.findAvailability.mockResolvedValue([{ weekday: 5, start_time: '21:00:00', end_time: '23:00:00' }]);
    await expect(
      createForStudent(STUDENT, { scheduled_at: '2026-11-07T01:00:00.000Z', notes: null })
    ).resolves.toBeDefined();
  });

  it('Review Focus 1: el 23505 del índice llega como 409 SLOT_TAKEN y no se notifica', async () => {
    mockAppointments.insertAppointment.mockRejectedValue(Errors.slotTaken());
    await expect(createForStudent(STUDENT, input)).rejects.toMatchObject({ statusCode: 409, code: 'SLOT_TAKEN' });
    expect(mockNotify.notify).not.toHaveBeenCalled();
  });

  it('403 si el alumno no tiene entrenador', async () => {
    mockStudents.findStudentById.mockResolvedValue(studentRow({ trainer_id: null }));
    await expect(createForStudent(STUDENT, input)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('un fallo de la notificación no rompe la respuesta', async () => {
    mockNotify.notify.mockRejectedValue(new Error('db'));
    await expect(createForStudent(STUDENT, input)).resolves.toMatchObject({ status: 'pending' });
  });
});

describe('createForTrainer', () => {
  const input = { student_id: STUDENT.id, scheduled_at: FRI_18, notes: null };

  it('crea el turno confirmed aunque esté fuera de la disponibilidad y avisa al alumno con push', async () => {
    mockAvailability.findAvailability.mockResolvedValue([]);
    const result = await createForTrainer(TRAINER, input);
    expect(mockAppointments.insertAppointment).toHaveBeenCalledWith(
      expect.objectContaining({ trainer_id: TRAINER.id, student_id: STUDENT.id, status: 'confirmed', duration_min: 60 })
    );
    expect(mockAvailability.findAvailability).not.toHaveBeenCalled();
    expect(mockNotify.notify).toHaveBeenCalledWith({
      userId: STUDENT.id, userRole: 'student', type: 'appointment',
      title: 'Tu entrenador te agendó un turno el vie 06/11 a las 18:00', body: null,
      data: { appointment_id: result.id }, push: true,
    });
  });

  it('403 con un alumno de otro PT, inexistente o inactivo', async () => {
    mockStudents.findStudentById.mockResolvedValueOnce(studentRow({ trainer_id: 'otro' }));
    await expect(createForTrainer(TRAINER, input)).rejects.toMatchObject({ statusCode: 403 });
    mockStudents.findStudentById.mockResolvedValueOnce(null);
    await expect(createForTrainer(TRAINER, { ...input, student_id: OTHER_STUDENT_ID })).rejects.toMatchObject({
      statusCode: 403,
    });
    mockStudents.findStudentById.mockResolvedValueOnce(studentRow({ active: false }));
    await expect(createForTrainer(TRAINER, input)).rejects.toMatchObject({ statusCode: 403 });
    expect(mockAppointments.insertAppointment).not.toHaveBeenCalled();
  });

  it.each([
    ['no está en hora en punto', '2026-11-06T21:15:00.000Z'],
    ['ya pasó', '2026-11-04T14:00:00.000Z'],
  ])('400 SLOT_UNAVAILABLE si el horario %s', async (_label, scheduled_at) => {
    await expect(createForTrainer(TRAINER, { ...input, scheduled_at })).rejects.toEqual(unavailable);
  });

  it('el PT puede agendar a más de 28 días', async () => {
    await expect(
      createForTrainer(TRAINER, { ...input, scheduled_at: '2026-12-18T21:00:00.000Z' })
    ).resolves.toBeDefined();
  });

  it('SLOT_TAKEN se propaga', async () => {
    mockAppointments.insertAppointment.mockRejectedValue(Errors.slotTaken());
    await expect(createForTrainer(TRAINER, input)).rejects.toMatchObject({ code: 'SLOT_TAKEN' });
  });
});
