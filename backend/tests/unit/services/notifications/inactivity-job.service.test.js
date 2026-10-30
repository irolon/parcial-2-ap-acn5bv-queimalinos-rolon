import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  mockNotify, mockRepo, mockDays, runInactivityAlerts, arrange, student, NOW,
} from '../../../helpers/notifications/inactivity.setup.js';

beforeEach(() => {
  jest.resetAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  arrange();
});

const run = () => runInactivityAlerts({ now: NOW });

describe('runInactivityAlerts', () => {
  it('3 días asignados perdidos: avisa al entrenador con push', async () => {
    arrange({ students: [student('a', { name: 'Lucía' })], lastStarts: { a: '2026-10-26T13:00:00Z' } });
    const result = await run();
    expect(result).toEqual({ checked: 1, notified: 1, skipped: 0, errors: 0 });
    expect(mockNotify.notify).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'tr-a', userRole: 'trainer', type: 'inactivity', push: true,
      title: 'Lucía no entrena hace 4 días',
      data: { student_id: 'a', missed_days: 3, days_since: 4 },
    }));
  });

  it('2 días perdidos: no avisa', async () => {
    arrange({ students: [student('a')], lastStarts: { a: '2026-10-27T13:00:00Z' } });
    expect(await run()).toEqual({ checked: 1, notified: 0, skipped: 1, errors: 0 });
    expect(mockNotify.notify).not.toHaveBeenCalled();
  });

  it('solo cuentan los días asignados', async () => {
    arrange({ students: [student('a')], lastStarts: { a: '2026-10-26T13:00:00Z' } });
    mockDays.findAssignedDays.mockResolvedValue(['monday', 'friday']);
    expect((await run()).notified).toBe(0);
  });

  it('cooldown: con un aviso de los últimos 7 días no repite', async () => {
    arrange({ students: [student('a')], lastStarts: { a: '2026-10-20T13:00:00Z' }, notified: { a: '2026-10-27T12:00:00Z' } });
    expect(await run()).toEqual({ checked: 1, notified: 0, skipped: 1, errors: 0 });
    expect(mockRepo.findLastInactivityNotifications).toHaveBeenCalledWith('2026-10-22T15:00:00.000Z');
    expect(mockNotify.notify).not.toHaveBeenCalled();
  });

  it('cooldown por fecha argentina: el día 6 bloquea y el día 7 exacto permite de nuevo', async () => {
    const base = { students: [student('a')], lastStarts: { a: '2026-10-20T13:00:00Z' } };
    // Hoy es 30/10 (AR). Aviso del 24/10 (6 días): bloquea.
    arrange({ ...base, notified: { a: '2026-10-24T03:00:05Z' } });
    expect((await run()).notified).toBe(0);
    // Aviso del 23/10 creado unos segundos después de las 03:00 UTC (00:00 AR): 7 días, permite.
    arrange({ ...base, notified: { a: '2026-10-23T03:00:05Z' } });
    expect((await run()).notified).toBe(1);
    // Aviso creado el 23/10 a las 22:00 AR (01:00 UTC del 24): sigue siendo fecha AR 23/10, permite.
    arrange({ ...base, notified: { a: '2026-10-24T01:00:00Z' } });
    expect((await run()).notified).toBe(1);
  });

  it('sin sesiones cuenta desde la fecha de alta', async () => {
    arrange({ students: [student('a', { created_at: '2026-10-20T12:00:00Z' })] });
    await run();
    expect(mockNotify.notify).toHaveBeenCalledWith(expect.objectContaining({
      data: { student_id: 'a', missed_days: 9, days_since: 10 },
    }));
  });

  it('alumno recién dado de alta no avisa', async () => {
    arrange({ students: [student('a', { created_at: '2026-10-28T12:00:00Z' })] });
    expect((await run()).notified).toBe(0);
  });

  it('sin alumnos activos (el repo filtra los de baja) no evalúa nada', async () => {
    arrange({ students: [] });
    expect(await run()).toEqual({ checked: 0, notified: 0, skipped: 0, errors: 0 });
    expect(mockDays.findAssignedDays).not.toHaveBeenCalled();
  });

  it('alumno sin entrenador se saltea', async () => {
    arrange({ students: [student('a', { trainer_id: null })] });
    expect(await run()).toEqual({ checked: 1, notified: 0, skipped: 1, errors: 0 });
    expect(mockNotify.notify).not.toHaveBeenCalled();
  });

  it('un alumno que falla se loguea y no corta al resto', async () => {
    arrange({ students: [student('a'), student('b')] });
    mockNotify.notify.mockRejectedValueOnce(new Error('db')).mockResolvedValueOnce({ id: 'n-2' });
    expect(await run()).toEqual({ checked: 2, notified: 1, skipped: 0, errors: 1 });
    expect(console.error).toHaveBeenCalledWith('[notifications] inactividad', 'a', 'db');
  });
});
