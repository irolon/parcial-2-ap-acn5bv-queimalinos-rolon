import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const result = { current: { data: null, error: null } };
const q = {};
for (const m of ['select', 'eq', 'upsert', 'maybeSingle', 'single']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/notifications/preferences.repository.js'));

const PREFS = { message: false, comment: true, appointment: true, pr: true, achievement: true };
const ROW = { ...PREFS, updated_at: 'NOW' };

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: null, error: null };
});

describe('preferences.repository', () => {
  it('findByStudent busca la fila del alumno con maybeSingle', async () => {
    result.current = { data: ROW, error: null };
    await expect(repo.findByStudent('s-1')).resolves.toEqual(ROW);
    expect(supabase.from).toHaveBeenCalledWith('notification_preferences');
    expect(q.select).toHaveBeenCalledWith('message, comment, appointment, pr, achievement, updated_at');
    expect(q.eq).toHaveBeenCalledWith('student_id', 's-1');
    expect(q.maybeSingle).toHaveBeenCalled();
  });

  it('findByStudent sin fila devuelve null', async () => {
    await expect(repo.findByStudent('s-1')).resolves.toBeNull();
  });

  it('upsert por student_id con updated_at y devuelve la fila', async () => {
    result.current = { data: ROW, error: null };
    await expect(repo.upsert('s-1', PREFS, 'NOW')).resolves.toEqual(ROW);
    expect(supabase.from).toHaveBeenCalledWith('notification_preferences');
    expect(q.upsert).toHaveBeenCalledWith(
      { student_id: 's-1', ...PREFS, updated_at: 'NOW' },
      { onConflict: 'student_id' }
    );
    expect(q.single).toHaveBeenCalled();
  });

  it.each([
    ['findByStudent', () => repo.findByStudent('s-1')],
    ['upsert', () => repo.upsert('s-1', PREFS, 'NOW')],
  ])('%s: un error de Supabase es un 500', async (_n, call) => {
    result.current = { data: null, error: { message: 'boom' } };
    await expect(call()).rejects.toMatchObject({ statusCode: 500 });
  });
});
