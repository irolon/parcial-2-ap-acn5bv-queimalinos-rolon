import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

// Builder encadenable y "thenable": cada método devuelve el mismo objeto.
const result = { current: { data: [], error: null } };
const q = {};
for (const m of ['select', 'eq', 'order', 'upsert', 'maybeSingle', 'single']) q[m] = jest.fn(() => q);
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/gamification/gamification.repository.js'));

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: [], error: null };
});

describe('gamification.repository', () => {
  it('findCatalog ordena por categoría y código', async () => {
    await repo.findCatalog();
    expect(q.order).toHaveBeenNthCalledWith(1, 'category');
    expect(q.order).toHaveBeenNthCalledWith(2, 'code');
  });

  it('findStudentAchievements: logro embebido, unlocked_at desc', async () => {
    await repo.findStudentAchievements('st');
    expect(q.select).toHaveBeenCalledWith(expect.stringContaining('achievement:achievements'));
    expect(q.order).toHaveBeenCalledWith('unlocked_at', { ascending: false });
  });

  it('findUnlockedAt: solo id del logro y fecha, sin el logro embebido', async () => {
    await repo.findUnlockedAt('st');
    expect(q.select).toHaveBeenCalledWith('achievement_id, unlocked_at');
    expect(q.eq).toHaveBeenCalledWith('student_id', 'st');
  });

  it('insertUnlocked: upsert que ignora duplicados y devuelve lo insertado', async () => {
    result.current = { data: [{ achievement_id: 'a' }], error: null };
    const rows = [{ student_id: 'st', achievement_id: 'a', context: {} }];
    await expect(repo.insertUnlocked(rows)).resolves.toEqual([{ achievement_id: 'a' }]);
    expect(q.upsert).toHaveBeenCalledWith(rows, { onConflict: 'student_id,achievement_id', ignoreDuplicates: true });
  });

  it('insertUnlocked con lista vacía no consulta', async () => {
    await expect(repo.insertUnlocked([])).resolves.toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('upsertStreak: upsert por student_id', async () => {
    result.current = { data: { student_id: 'st' }, error: null };
    await repo.upsertStreak('st', { current_days: 1, longest_days: 2, last_trained_date: '2026-10-30' });
    expect(q.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ student_id: 'st', current_days: 1 }),
      { onConflict: 'student_id' }
    );
  });

  it('un error de supabase se propaga como 500', async () => {
    result.current = { data: null, error: { message: 'boom' } };
    await expect(repo.findCatalog()).rejects.toMatchObject({ statusCode: 500 });
  });
});
