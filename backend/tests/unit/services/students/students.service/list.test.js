import { jest } from '@jest/globals';
import { scheduleOf } from '../../../../../src/models/students/adherence.js';
import {
  mockStudentsRepo,
  service,
} from '../../../../helpers/students/students-service.setup.js';

const fakeNow = (iso) => jest.useFakeTimers({ now: new Date(iso), doNotFake: ['nextTick', 'setImmediate'] });

describe('students.service — list', () => {
  beforeEach(() => {
    mockStudentsRepo.findLastSessionDates.mockResolvedValue([]);
    mockStudentsRepo.findActiveRoutineSchedules.mockResolvedValue(new Map());
    mockStudentsRepo.findFinishedSessionDates.mockResolvedValue(new Map());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('suma days_per_week y adherence_7d con una sola consulta por lote', async () => {
    // Jueves 2026-11-05 13:00 en Argentina: la ventana arranca el jueves 29/10.
    fakeNow('2026-11-05T16:00:00Z');
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({
      data: [{ id: 's1' }, { id: 's2' }],
      total: 2,
    });
    mockStudentsRepo.findActiveRoutineSchedules.mockResolvedValue(
      new Map([['s1', scheduleOf([{ days: ['monday', 'wednesday', 'friday'], since: '2026-09-01' }])], ['s2', scheduleOf([])]])
    );
    mockStudentsRepo.findFinishedSessionDates.mockResolvedValue(
      new Map([['s1', ['2026-10-30', '2026-11-02']], ['s2', []]])
    );

    const r = await service.list('trainer-1', {});

    expect(mockStudentsRepo.findActiveRoutineSchedules).toHaveBeenCalledTimes(1);
    expect(mockStudentsRepo.findActiveRoutineSchedules).toHaveBeenCalledWith(['s1', 's2']);
    expect(mockStudentsRepo.findFinishedSessionDates).toHaveBeenCalledTimes(1);
    expect(mockStudentsRepo.findFinishedSessionDates).toHaveBeenCalledWith(
      ['s1', 's2'],
      '2026-10-29T00:00:00-03:00'
    );
    expect(r.data[0]).toMatchObject({ days_per_week: 3, adherence_7d: { assigned: 3, done: 2, pct: 67 } });
    expect(r.data[1]).toMatchObject({ days_per_week: 0, adherence_7d: { assigned: 0, done: 0, pct: null } });
  });

  it('los días anteriores al alta y a la rutina no cuentan (alumno nuevo no arranca en 0 %)', async () => {
    // Jueves 05/11; ventana 29/10-04/11. L/X/V: 30/10, 02/11 y 04/11.
    fakeNow('2026-11-05T16:00:00Z');
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({
      data: [
        // Alta el 03/11: solo cuenta el 04/11, y entrenó.
        { id: 'nueva', created_at: '2026-11-03T12:00:00Z' },
        // Alta vieja, rutina creada el 01/11: cuentan 02/11 y 04/11.
        { id: 'cambio', created_at: '2026-01-10T12:00:00Z' },
        // Alta el 03/11 con la rutina creada hoy.
        { id: 'sin', created_at: '2026-11-03T12:00:00Z' },
      ],
      total: 3,
    });
    const lxv = (since) => scheduleOf([{ days: ['monday', 'wednesday', 'friday'], since }]);
    mockStudentsRepo.findActiveRoutineSchedules.mockResolvedValue(
      new Map([['nueva', lxv('2026-11-03')], ['cambio', lxv('2026-11-01')], ['sin', lxv('2026-11-05')]])
    );
    mockStudentsRepo.findFinishedSessionDates.mockResolvedValue(
      new Map([['nueva', ['2026-11-04']], ['cambio', ['2026-11-02']]])
    );

    const r = await service.list('trainer-1', {});

    expect(r.data[0].adherence_7d).toEqual({ assigned: 1, done: 1, pct: 100 });
    expect(r.data[1].adherence_7d).toEqual({ assigned: 2, done: 1, pct: 50 });
    // Ningún día de la ventana es posterior a la rutina: sin plan todavía, no 0 %.
    expect(r.data[2].adherence_7d).toEqual({ assigned: 0, done: 0, pct: null });
  });

  it('a las 23:30 en Argentina (02:30Z del día siguiente) el día es el argentino', async () => {
    fakeNow('2026-11-06T02:30:00Z');
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [{ id: 's1' }], total: 1 });
    await service.list('trainer-1', {});
    // Hoy sigue siendo el jueves 05/11 en Argentina.
    expect(mockStudentsRepo.findFinishedSessionDates).toHaveBeenCalledWith(
      ['s1'],
      '2026-10-29T00:00:00-03:00'
    );
  });

  it('devuelve data + meta de paginación', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [{ id: 's1' }], total: 1 });
    const r = await service.list('trainer-1', { page: 1, limit: 20 });
    expect(r.data).toHaveLength(1);
    expect(r.meta).toEqual({ total: 1, page: 1, limit: 20, total_pages: 1 });
  });

  it('aplica defaults (solo activos, page 1, limit 20) y pasa el trainer al repo', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [], total: 0 });
    const r = await service.list('trainer-1', {});
    expect(r.meta.page).toBe(1);
    expect(r.meta.limit).toBe(20);
    expect(mockStudentsRepo.findStudentsByTrainer).toHaveBeenCalledWith(
      expect.objectContaining({ trainerId: 'trainer-1', active: true, page: 1, limit: 20 })
    );
  });

  it('con active=false pide los dados de baja', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [], total: 0 });
    await service.list('trainer-1', { active: false });
    expect(mockStudentsRepo.findStudentsByTrainer).toHaveBeenCalledWith(
      expect.objectContaining({ active: false })
    );
  });

  it('suma last_session_at a cada alumno, y null si nunca entrenó', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({
      data: [{ id: 's1' }, { id: 's2' }],
      total: 2,
    });
    mockStudentsRepo.findLastSessionDates.mockResolvedValue([
      { student_id: 's1', last_session_at: '2026-10-15T20:00:00Z' },
    ]);

    const r = await service.list('trainer-1', {});

    expect(mockStudentsRepo.findLastSessionDates).toHaveBeenCalledWith(['s1', 's2']);
    expect(r.data).toEqual([
      expect.objectContaining({ id: 's1', last_session_at: '2026-10-15T20:00:00Z' }),
      expect.objectContaining({ id: 's2', last_session_at: null }),
    ]);
  });

  it('con la página vacía no consulta la vista (PostgREST rechaza .in([]))', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [], total: 0 });
    const r = await service.list('trainer-1', { page: 3 });
    expect(r.data).toEqual([]);
    expect(mockStudentsRepo.findLastSessionDates).not.toHaveBeenCalled();
  });
});
