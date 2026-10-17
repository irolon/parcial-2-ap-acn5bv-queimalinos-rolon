import { jest } from '@jest/globals';

const mockRepo = {
  findMetricsByStudent: jest.fn(),
  findLatestMetric: jest.fn(),
  findLatestHeightCm: jest.fn(),
  insertMetric: jest.fn(),
  findMetricById: jest.fn(),
  deleteMetric: jest.fn(),
};
const mockAccess = { assertCanAccessStudent: jest.fn() };

jest.unstable_mockModule(
  '../../../../src/repositories/body-metrics/body-metrics.repository.js',
  () => mockRepo
);
jest.unstable_mockModule(
  '../../../../src/services/students/student-access.service.js',
  () => mockAccess
);

const service = await import('../../../../src/services/body-metrics/body-metrics.service.js');

const TRAINER = { id: 'trainer-1', role: 'trainer' };
const STUDENT = { id: 'student-1', role: 'student' };
const metric = (over = {}) => ({
  id: 'm1',
  student_id: 'student-1',
  weight_kg: 80,
  height_cm: 180,
  recorded_at: '2026-10-10T12:00:00.000Z',
  recorded_by: 'trainer',
  ...over,
});

beforeEach(() => {
  mockAccess.assertCanAccessStudent.mockResolvedValue({ id: 'student-1' });
});

describe('body-metrics.service — list', () => {
  it('verifica el acceso y devuelve el historial con IMC, arrastrando la altura', async () => {
    mockRepo.findMetricsByStudent.mockResolvedValue([
      metric({ id: 'a', recorded_at: '2026-10-01T12:00:00Z' }),
      metric({ id: 'b', weight_kg: 78, height_cm: null, recorded_at: '2026-10-08T12:00:00Z' }),
      metric({ id: 'c', weight_kg: 77, height_cm: null, recorded_at: '2026-10-15T12:00:00Z' }),
    ]);

    const data = await service.list(TRAINER, 'student-1');

    expect(mockAccess.assertCanAccessStudent).toHaveBeenCalledWith(TRAINER, 'student-1');
    expect(data.map((m) => m.id)).toEqual(['a', 'b', 'c']);
    expect(data.map((m) => m.bmi)).toEqual([24.7, 24.1, 23.8]);
  });

  it('sin acceso → 403 y no lee medidas', async () => {
    mockAccess.assertCanAccessStudent.mockRejectedValue(
      Object.assign(new Error('x'), { code: 'FORBIDDEN', statusCode: 403 })
    );
    await expect(service.list(TRAINER, 'student-1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(mockRepo.findMetricsByStudent).not.toHaveBeenCalled();
  });
});

describe('body-metrics.service — create', () => {
  it('el trainer carga → recorded_by trainer, created true, con IMC', async () => {
    mockRepo.insertMetric.mockImplementation(async (row) => metric({ ...row, id: 'new' }));

    const r = await service.create(TRAINER, 'student-1', { weight_kg: 80, height_cm: 180 });

    expect(mockRepo.insertMetric).toHaveBeenCalledWith({
      weight_kg: 80,
      height_cm: 180,
      student_id: 'student-1',
      recorded_by: 'trainer',
    });
    expect(r.created).toBe(true);
    expect(r.metric.bmi).toBe(24.7);
  });

  it('el alumno carga → recorded_by student', async () => {
    mockRepo.insertMetric.mockImplementation(async (row) => metric({ ...row }));
    await service.create(STUDENT, 'student-1', { weight_kg: 80 });
    expect(mockRepo.insertMetric).toHaveBeenCalledWith(
      expect.objectContaining({ recorded_by: 'student' })
    );
  });

  it('sin altura, el IMC usa la última altura previa', async () => {
    mockRepo.insertMetric.mockResolvedValue(metric({ height_cm: null }));
    mockRepo.findLatestHeightCm.mockResolvedValue(180);

    const r = await service.create(TRAINER, 'student-1', { weight_kg: 80 });

    expect(mockRepo.findLatestHeightCm).toHaveBeenCalledWith('student-1', '2026-10-10T12:00:00.000Z');
    expect(r.metric.bmi).toBe(24.7);
  });

  it('reintento con el mismo id del mismo alumno → created false y la fila guardada', async () => {
    mockRepo.insertMetric.mockResolvedValue(null); // 23505: el id ya existe
    mockRepo.findMetricById.mockResolvedValue(metric({ id: 'dup' }));

    const r = await service.create(STUDENT, 'student-1', { id: 'dup', weight_kg: 80 });

    expect(mockRepo.findMetricById).toHaveBeenCalledWith('dup');
    expect(r.created).toBe(false);
    expect(r.metric.id).toBe('dup');
  });

  it('el mismo id pero de otro alumno → 409 METRIC_ID_CONFLICT', async () => {
    mockRepo.insertMetric.mockResolvedValue(null);
    mockRepo.findMetricById.mockResolvedValue(metric({ id: 'dup', student_id: 'student-2' }));

    await expect(
      service.create(TRAINER, 'student-1', { id: 'dup', weight_kg: 80 })
    ).rejects.toMatchObject({ code: 'METRIC_ID_CONFLICT', statusCode: 409 });
  });

  it('sin acceso → 403 y no inserta', async () => {
    mockAccess.assertCanAccessStudent.mockRejectedValue(
      Object.assign(new Error('x'), { code: 'FORBIDDEN', statusCode: 403 })
    );
    await expect(service.create(TRAINER, 'student-1', { weight_kg: 80 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockRepo.insertMetric).not.toHaveBeenCalled();
  });
});

describe('body-metrics.service — remove', () => {
  it('el trainer dueño borra una medida que cargó el alumno', async () => {
    mockRepo.findMetricById.mockResolvedValue(metric({ recorded_by: 'student' }));
    await service.remove(TRAINER, 'student-1', 'm1');
    expect(mockRepo.deleteMetric).toHaveBeenCalledWith('m1');
  });

  it('el alumno borra una que cargó él', async () => {
    mockRepo.findMetricById.mockResolvedValue(metric({ recorded_by: 'student' }));
    await service.remove(STUDENT, 'student-1', 'm1');
    expect(mockRepo.deleteMetric).toHaveBeenCalledWith('m1');
  });

  it('el alumno no puede borrar una que cargó el trainer → 403', async () => {
    mockRepo.findMetricById.mockResolvedValue(metric({ recorded_by: 'trainer' }));
    await expect(service.remove(STUDENT, 'student-1', 'm1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(mockRepo.deleteMetric).not.toHaveBeenCalled();
  });

  it('una medida inexistente → 404', async () => {
    mockRepo.findMetricById.mockResolvedValue(null);
    await expect(service.remove(TRAINER, 'student-1', 'm1')).rejects.toMatchObject({
      code: 'METRIC_NOT_FOUND',
      statusCode: 404,
    });
  });

  it('una medida de otro alumno, pedida por la URL de este → 404 y no borra', async () => {
    mockRepo.findMetricById.mockResolvedValue(metric({ student_id: 'student-2' }));
    await expect(service.remove(TRAINER, 'student-1', 'm1')).rejects.toMatchObject({
      code: 'METRIC_NOT_FOUND',
    });
    expect(mockRepo.deleteMetric).not.toHaveBeenCalled();
  });
});

describe('body-metrics.service — latestForStudent', () => {
  it('sin medidas → null', async () => {
    mockRepo.findLatestMetric.mockResolvedValue(null);
    await expect(service.latestForStudent('student-1')).resolves.toBeNull();
  });

  it('con la última medida sin altura, usa la altura previa', async () => {
    mockRepo.findLatestMetric.mockResolvedValue(metric({ height_cm: null }));
    mockRepo.findLatestHeightCm.mockResolvedValue(180);
    const latest = await service.latestForStudent('student-1');
    expect(latest.bmi).toBe(24.7);
  });
});
