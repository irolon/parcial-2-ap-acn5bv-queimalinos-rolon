import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Rutas absolutas: el mock tiene que resolver al MISMO archivo que importa el repositorio.
const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const supabase = { rpc: jest.fn(), from: jest.fn() };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const { reorderRoutineExercises } = await import(
  src('repositories/routines/routine-exercises.repository.js')
);

describe('routine-exercises.repository · reorderRoutineExercises', () => {
  beforeEach(() => supabase.rpc.mockReset());

  it('reordena con una sola llamada a la función SQL (atómica), sin updates sueltos', async () => {
    supabase.rpc.mockResolvedValue({ data: true, error: null });
    await expect(reorderRoutineExercises('rt-1', ['b', 'a'])).resolves.toBe(true);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
    expect(supabase.rpc).toHaveBeenCalledWith('reorder_routine_exercises', {
      p_routine_id: 'rt-1',
      p_ids: ['b', 'a'],
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('false cuando el conjunto no coincide (la función no tocó nada)', async () => {
    supabase.rpc.mockResolvedValue({ data: false, error: null });
    await expect(reorderRoutineExercises('rt-1', ['a'])).resolves.toBe(false);
  });

  it('un error de la base es 500', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(reorderRoutineExercises('rt-1', ['a'])).rejects.toMatchObject({ statusCode: 500 });
  });
});
