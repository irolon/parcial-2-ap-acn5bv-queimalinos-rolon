import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

// Cada await de la consulta devuelve la próxima respuesta de la cola.
const responses = [];
const q = {};
for (const m of ['select', 'eq', 'in', 'order', 'range']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(responses.shift() ?? { data: [], error: null });
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/export/sessions-export.repository.js'));

const page = (n) => ({
  data: Array.from({ length: n }, (_, i) => ({ id: `s-${i}` })),
  error: null,
});

beforeEach(() => {
  jest.clearAllMocks();
  responses.length = 0;
});

describe('sessions-export.repository · findSessionsForStudents', () => {
  it('lista vacía → [] sin consultar', async () => {
    await expect(repo.findSessionsForStudents([])).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('pagina de a 500 hasta una página corta (1200 sesiones → 3 pedidos)', async () => {
    responses.push(page(500), page(500), page(200));
    const sessions = await repo.findSessionsForStudents(['stu-1']);
    expect(sessions).toHaveLength(1200);
    expect(q.range.mock.calls).toEqual([
      [0, 499],
      [500, 999],
      [1000, 1499],
    ]);
  });

  it('trae rutina, series y los dos ejercicios (con el hint de la FK) de los alumnos dados', async () => {
    await repo.findSessionsForStudents(['stu-1', 'stu-2']);
    expect(supabase.from).toHaveBeenCalledWith('sessions');
    const columns = q.select.mock.calls[0][0];
    expect(columns).toContain('routine:routines(name)');
    expect(columns).toContain('exercise:exercises!session_sets_exercise_id_fkey(name)');
    expect(columns).toContain('original:exercises!session_sets_original_exercise_id_fkey(name)');
    expect(q.in).toHaveBeenCalledWith('student_id', ['stu-1', 'stu-2']);
    expect(q.order.mock.calls.map((c) => c[0])).toEqual(['started_at', 'id']);
  });

  it('error de Supabase → INTERNAL_ERROR', async () => {
    responses.push({ data: null, error: { message: 'boom' } });
    await expect(repo.findSessionsForStudents(['stu-1'])).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
    });
  });
});

describe('sessions-export.repository · findTrainerStudents', () => {
  it('activos e inactivos del trainer, por nombre', async () => {
    responses.push({
      data: [{ id: 'stu-1', name: 'Ana', email: 'a@x.com', active: false }],
      error: null,
    });
    const students = await repo.findTrainerStudents('tr-1');
    expect(students).toHaveLength(1);
    expect(supabase.from).toHaveBeenCalledWith('students');
    expect(q.select).toHaveBeenCalledWith('id, name, email, active');
    expect(q.eq).toHaveBeenCalledWith('trainer_id', 'tr-1');
    expect(q.eq).not.toHaveBeenCalledWith('active', expect.anything());
    expect(q.order.mock.calls.map((c) => c[0])).toEqual(['name', 'id']);
  });

  it('pagina de a 1000 (más de 1000 alumnos → el CSV no queda incompleto)', async () => {
    responses.push(page(1000), page(5));
    await expect(repo.findTrainerStudents('tr-1')).resolves.toHaveLength(1005);
    expect(q.range.mock.calls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });
});
