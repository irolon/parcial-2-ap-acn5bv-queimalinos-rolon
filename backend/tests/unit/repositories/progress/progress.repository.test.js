import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Ruta absoluta: el mock tiene que resolver al MISMO archivo que importa el repositorio.
const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const supabase = { rpc: jest.fn() };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const { fetchLastSessionKg, fetchProgressExercises, fetchWeeklyVolume } = await import(src('repositories/progress/progress.repository.js'));

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

describe('progress.repository · fetchProgressExercises', () => {
  it('llama al RPC progress_exercises con p_student_id y devuelve las filas', async () => {
    supabase.rpc.mockResolvedValue({ data: [{ exercise_id: 'ex-1' }], error: null });
    expect(await fetchProgressExercises('st-1')).toEqual([{ exercise_id: 'ex-1' }]);
    expect(supabase.rpc).toHaveBeenCalledWith('progress_exercises', { p_student_id: 'st-1' });
  });

  it('data null devuelve []; error → 500', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect(await fetchProgressExercises('st-1')).toEqual([]);
    supabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await expect(fetchProgressExercises('st-1')).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe('progress.repository · fetchWeeklyVolume', () => {
  it('llama al RPC weekly_volume con p_student_id, p_from y p_to', async () => {
    supabase.rpc.mockResolvedValue({ data: [{ week_start: '2026-10-20' }], error: null });
    const result = await fetchWeeklyVolume({ studentId: 'st-1', from: '2026-10-01', to: null });
    expect(supabase.rpc).toHaveBeenCalledWith('weekly_volume', {
      p_student_id: 'st-1', p_from: '2026-10-01', p_to: null,
    });
    expect(result).toEqual([{ week_start: '2026-10-20' }]);
  });

  it('error → 500', async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(fetchWeeklyVolume({ studentId: 'st-1', from: null, to: null }))
      .rejects.toMatchObject({ statusCode: 500 });
  });
});
