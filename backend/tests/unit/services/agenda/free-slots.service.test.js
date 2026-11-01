import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockAppointments, mockAvailability, mockStudents, importSrc, TRAINER, STUDENT, NOW, studentRow,
} from '../../../helpers/agenda/agenda.setup.js';

const { listFree } = await importSrc('services/agenda/free-slots.service.js');

// Lunes a viernes 08–12 (hora de Argentina).
const AVAILABILITY = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_time: '08:00:00', end_time: '12:00:00' }));

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  mockAvailability.findAvailability.mockResolvedValue(AVAILABILITY);
  mockAppointments.findTakenInRange.mockResolvedValue([]);
  mockStudents.findStudentById.mockResolvedValue(studentRow());
});
afterEach(() => jest.useRealTimers());

describe('listFree', () => {
  it('el PT ve sus horarios libres (jueves 05/11: 08, 09, 10 y 11 AR)', async () => {
    const slots = await listFree(TRAINER, { from: '2026-11-05', to: '2026-11-05' });
    expect(slots).toEqual([
      '2026-11-05T11:00:00.000Z', '2026-11-05T12:00:00.000Z', '2026-11-05T13:00:00.000Z', '2026-11-05T14:00:00.000Z',
    ]);
    expect(mockAvailability.findAvailability).toHaveBeenCalledWith(TRAINER.id);
  });

  it('pide los turnos tomados del día entero argentino (hasta las 00:00 AR del día siguiente, exclusivo)', async () => {
    await listFree(TRAINER, { from: '2026-11-05', to: '2026-11-06' });
    expect(mockAppointments.findTakenInRange).toHaveBeenCalledWith(
      TRAINER.id, new Date('2026-11-05T03:00:00.000Z'), new Date('2026-11-07T03:00:00.000Z')
    );
  });

  it('no ofrece horarios ocupados (pending o confirmed)', async () => {
    mockAppointments.findTakenInRange.mockResolvedValue(['2026-11-05T12:00:00+00:00']);
    const slots = await listFree(TRAINER, { from: '2026-11-05', to: '2026-11-05' });
    expect(slots).not.toContain('2026-11-05T12:00:00.000Z');
    expect(slots).toHaveLength(3);
  });

  it('un cancelado no cuenta como ocupado: el repo solo trae pending y confirmed, así que el horario vuelve a estar libre', async () => {
    mockAppointments.findTakenInRange.mockResolvedValue([]);
    const slots = await listFree(TRAINER, { from: '2026-11-05', to: '2026-11-05' });
    expect(slots).toContain('2026-11-05T12:00:00.000Z');
  });

  it('no ofrece horarios pasados ni el actual (hoy 12:00 AR: quedan sin ofrecer 08–11 y las 12 ya no entran)', async () => {
    const slots = await listFree(TRAINER, { from: '2026-11-04', to: '2026-11-04' });
    expect(slots).toEqual([]);
  });

  it('no ofrece horarios fuera de la disponibilidad (fin de semana)', async () => {
    expect(await listFree(TRAINER, { from: '2026-11-07', to: '2026-11-08' })).toEqual([]);
  });

  it('el alumno ve la agenda de SU PT', async () => {
    await listFree(STUDENT, { from: '2026-11-05', to: '2026-11-05' });
    expect(mockStudents.findStudentById).toHaveBeenCalledWith(STUDENT.id);
    expect(mockAvailability.findAvailability).toHaveBeenCalledWith(TRAINER.id);
  });

  it('un alumno sin PT no ve nada', async () => {
    mockStudents.findStudentById.mockResolvedValue(studentRow({ trainer_id: null }));
    expect(await listFree(STUDENT, { from: '2026-11-05', to: '2026-11-05' })).toEqual([]);
    expect(mockAvailability.findAvailability).not.toHaveBeenCalled();
  });

  it('el alumno no ve más allá de hoy + 28 días; el PT sí', async () => {
    // Hoy + 28 días es el miércoles 02/12 12:00 AR: el jueves 03/12 queda afuera para el alumno.
    const range = { from: '2026-12-02', to: '2026-12-04' };
    const asStudent = await listFree(STUDENT, range);
    const asTrainer = await listFree(TRAINER, range);
    expect(asStudent.every((iso) => new Date(iso) <= new Date('2026-12-02T15:00:00Z'))).toBe(true);
    expect(asStudent).toEqual([
      '2026-12-02T11:00:00.000Z', '2026-12-02T12:00:00.000Z', '2026-12-02T13:00:00.000Z', '2026-12-02T14:00:00.000Z',
    ]);
    expect(asTrainer).toHaveLength(12);
  });
});

describe('listFree · alumno inactivo', () => {
  it('un alumno dado de baja no ve los libres: 403', async () => {
    mockStudents.findStudentById.mockResolvedValue(studentRow({ active: false }));
    await expect(listFree(STUDENT, { from: '2026-11-05', to: '2026-11-05' })).rejects.toMatchObject({ statusCode: 403 });
  });
});
