import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Ruta absoluta: el mock tiene que resolver al MISMO archivo que importa el repositorio.
const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const supabase = { rpc: jest.fn() };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const { fetchLastSessionKg } = await import(src('repositories/progress/progress.repository.js'));

beforeEach(() => jest.resetAllMocks());

describe('progress.repository · fetchLastSessionKg', () => {
  it('llama al RPC una vez y devuelve { exercise_id: kg }', async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        { exercise_id: 'ex-1', last_session_kg: '60' },
        { exercise_id: 'ex-2', last_session_kg: null },
      ],
      error: null,
    });
    const result = await fetchLastSessionKg('st-1', ['ex-1', 'ex-2']);
    expect(supabase.rpc).toHaveBeenCalledWith('last_session_kg', {
      p_student_id: 'st-1',
      p_exercise_ids: ['ex-1', 'ex-2'],
    });
    expect(result).toEqual({ 'ex-1': '60', 'ex-2': null });
  });

  it('lanza un error interno si el RPC falla', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(fetchLastSessionKg('st-1', ['ex-1'])).rejects.toMatchObject({ statusCode: 500 });
  });
});
