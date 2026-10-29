import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Rutas absolutas: el mock tiene que resolver al MISMO archivo que importa el repositorio.
const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const query = { select: jest.fn(), eq: jest.fn(), order: jest.fn() };
query.select.mockReturnValue(query);
query.eq.mockReturnValue(query);
const supabase = { from: jest.fn(() => query) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const { findRoutinesByTrainer } = await import(src('repositories/routines/routines.repository.js'));
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
