import {
  mockStudentsRepo,
  service,
} from '../../../../helpers/students/students-service.setup.js';

describe('students.service — list', () => {
  beforeEach(() => {
    mockStudentsRepo.findLastSessionDates.mockResolvedValue([]);
    mockStudentsRepo.findStreaks.mockResolvedValue([]);
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
      { id: 's1', last_session_at: '2026-10-15T20:00:00Z', streak: null },
      { id: 's2', last_session_at: null, streak: null },
    ]);
  });

  it('con la página vacía no consulta la vista (PostgREST rechaza .in([]))', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [], total: 0 });
    const r = await service.list('trainer-1', { page: 3 });
    expect(r.data).toEqual([]);
    expect(mockStudentsRepo.findLastSessionDates).not.toHaveBeenCalled();
    expect(mockStudentsRepo.findStreaks).not.toHaveBeenCalled();
  });

  it('agrega la racha de cada alumno (sin student_id)', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [{ id: 'a' }], total: 1 });
    mockStudentsRepo.findStreaks.mockResolvedValue([
      { student_id: 'a', current_days: 12, longest_days: 20, last_trained_date: '2026-10-30' },
    ]);

    const r = await service.list('trainer-1', {});

    expect(mockStudentsRepo.findStreaks).toHaveBeenCalledWith(['a']);
    expect(r.data[0].streak).toEqual({
      current_days: 12,
      longest_days: 20,
      last_trained_date: '2026-10-30',
    });
  });

  it('deja streak en null si el alumno no tiene fila', async () => {
    mockStudentsRepo.findStudentsByTrainer.mockResolvedValue({ data: [{ id: 'a' }], total: 1 });
    const r = await service.list('trainer-1', {});
    expect(r.data[0].streak).toBeNull();
  });
});
