import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Rutas absolutas: el mock tiene que resolver al MISMO archivo que importa el repositorio.
const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const query = {
  select: jest.fn(),
  eq: jest.fn(),
  order: jest.fn(),
  contains: jest.fn(),
  limit: jest.fn(),
  maybeSingle: jest.fn(),
};
for (const method of ['select', 'eq', 'contains', 'limit']) query[method].mockReturnValue(query);
const supabase = { from: jest.fn(() => query) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const { findRoutinesByTrainer, findActiveRoutineForStudentToday, findAccessibleExerciseIds } = await import(
  src('repositories/routines/routines.repository.js')
);
const { ROUTINE_COLUMNS } = await import(src('models/routines/routine.model.js'));

describe('routines.repository · findRoutinesByTrainer', () => {
  beforeEach(() => query.eq.mockClear());

  it('embebe el alumno (nombre y si está activo) para no pedir toda la lista de alumnos', async () => {
    const rows = [{ id: 'rt-1', student: { name: 'Ana Paz', active: false } }];
    query.order.mockResolvedValue({ data: rows, error: null });

    await expect(findRoutinesByTrainer({ trainerId: 't-1' })).resolves.toBe(rows);

    expect(supabase.from).toHaveBeenCalledWith('routines');
    const selected = query.select.mock.calls.at(-1)[0];
    expect(selected).toContain(ROUTINE_COLUMNS);
    expect(selected).toMatch(/student:students\s*\(\s*name,\s*active\s*\)/);
    expect(query.eq).toHaveBeenCalledWith('trainer_id', 't-1');
  });

  it('aplica los filtros de alumno y estado', async () => {
    query.order.mockResolvedValue({ data: [], error: null });
    await findRoutinesByTrainer({ trainerId: 't-1', studentId: 'st-1', active: true });
    expect(query.eq).toHaveBeenCalledWith('student_id', 'st-1');
    expect(query.eq).toHaveBeenCalledWith('active', true);
  });

  it('un error de la base es 500', async () => {
    query.order.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(findRoutinesByTrainer({ trainerId: 't-1' })).rejects.toEqual(
      expect.objectContaining({ statusCode: 500 })
    );
  });
});

describe('routines.repository · findActiveRoutineForStudentToday', () => {
  beforeEach(() => {
    for (const method of ['eq', 'contains', 'order', 'limit']) query[method].mockClear();
    query.order.mockReturnValue(query);
  });

  it('rutina activa del alumno que incluye el día; con dos, la más reciente', async () => {
    const latest = { id: 'rt-new', days: ['monday'] };
    query.maybeSingle.mockResolvedValue({ data: latest, error: null });

    await expect(findActiveRoutineForStudentToday('st-1', 'monday')).resolves.toBe(latest);

    expect(supabase.from).toHaveBeenCalledWith('routines');
    expect(query.eq).toHaveBeenCalledWith('student_id', 'st-1');
    expect(query.eq).toHaveBeenCalledWith('active', true);
    expect(query.contains).toHaveBeenCalledWith('days', ['monday']);
    expect(query.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it('un error de la base es 500', async () => {
    query.maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(findActiveRoutineForStudentToday('st-1', 'monday')).rejects.toEqual(
      expect.objectContaining({ statusCode: 500 })
    );
  });
});

describe('routines.repository · findAccessibleExerciseIds', () => {
  const chain = () => {
    const q = { result: { data: [{ id: 'ex-1' }], error: null } };
    for (const m of ['select', 'in', 'or', 'is']) q[m] = jest.fn(() => q);
    q.then = (resolve, reject) => Promise.resolve(q.result).then(resolve, reject);
    return q;
  };

  it('globales o del trainer, incluidos los archivados (series, progreso y edición los siguen usando)', async () => {
    const q = chain();
    supabase.from.mockReturnValueOnce(q);
    expect(await findAccessibleExerciseIds(['ex-1'], 'tr-1')).toEqual(['ex-1']);
    expect(q.or).toHaveBeenCalledWith('is_global.eq.true,trainer_id.eq.tr-1');
    expect(q.is).not.toHaveBeenCalled();
  });

  it('con activeOnly deja afuera los archivados', async () => {
    const q = chain();
    supabase.from.mockReturnValueOnce(q);
    await findAccessibleExerciseIds(['ex-1'], 'tr-1', { activeOnly: true });
    expect(q.is).toHaveBeenCalledWith('archived_at', null);
  });
});
