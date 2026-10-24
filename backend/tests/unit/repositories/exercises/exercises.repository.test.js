import { jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Rutas absolutas: el mock tiene que resolver al MISMO archivo que importa el repositorio.
const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const eq = jest.fn();
const supabase = { from: jest.fn(() => ({ delete: () => ({ eq }) })) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const { deleteExercise } = await import(src('repositories/exercises/exercises.repository.js'));

describe('exercises.repository — deleteExercise', () => {
  it('resuelve cuando se borra', async () => {
    eq.mockResolvedValue({ error: null });
    await expect(deleteExercise('ex-1')).resolves.toBeUndefined();
    expect(eq).toHaveBeenCalledWith('id', 'ex-1');
  });

  it('responde 409 EXERCISE_IN_USE si está referenciado (23503)', async () => {
    eq.mockResolvedValue({ error: { code: '23503', message: 'fk' } });
    await expect(deleteExercise('ex-1')).rejects.toEqual(
      expect.objectContaining({ statusCode: 409, code: 'EXERCISE_IN_USE' })
    );
  });

  it('cualquier otro error de la base es 500', async () => {
    eq.mockResolvedValue({ error: { code: '42P01', message: 'boom' } });
    await expect(deleteExercise('ex-1')).rejects.toEqual(
      expect.objectContaining({ statusCode: 500 })
    );
  });
});
