import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));

const result = { current: { data: [], error: null } };
const q = {};
for (const m of ['select', 'eq', 'in', 'or', 'order', 'insert', 'update', 'delete', 'maybeSingle', 'single']) {
  q[m] = jest.fn(() => q);
}
q.then = (resolve) => resolve(result.current);
const supabase = { from: jest.fn(() => q) };
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const challenges = await import(src('repositories/gamification/challenges.repository.js'));
const assignments = await import(src('repositories/gamification/student-challenges.repository.js'));

beforeEach(() => {
  jest.clearAllMocks();
  result.current = { data: [], error: null };
});

describe('challenges.repository', () => {
  it('findVisible: globales + propios, globales primero', async () => {
    result.current = { data: [{ trainer_id: 'tr', name: 'A' }, { trainer_id: null, name: 'B' }], error: null };
    const rows = await challenges.findVisible('tr', 'volume');
    expect(q.or).toHaveBeenCalledWith('trainer_id.is.null,trainer_id.eq.tr');
    expect(q.eq).toHaveBeenCalledWith('goal_type', 'volume');
    expect(rows.map((r) => r.name)).toEqual(['B', 'A']);
  });

  it('hasActiveAssignments cuenta las activas', async () => {
    result.current = { count: 2, error: null };
    await expect(challenges.hasActiveAssignments('c')).resolves.toBe(true);
    expect(q.eq).toHaveBeenCalledWith('status', 'active');
    result.current = { count: 0, error: null };
    await expect(challenges.hasActiveAssignments('c')).resolves.toBe(false);
  });

  it('achievementExists', async () => {
    result.current = { data: { id: 'a' }, error: null };
    await expect(challenges.achievementExists('a')).resolves.toBe(true);
    result.current = { data: null, error: null };
    await expect(challenges.achievementExists('a')).resolves.toBe(false);
  });

  it('un error de base se convierte en 500', async () => {
    result.current = { data: null, error: { message: 'x' } };
    await expect(challenges.remove('c')).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe('student-challenges.repository', () => {
  it('findByStudent: más nuevas primero con el desafío embebido', async () => {
    await assignments.findByStudent('st');
    expect(q.select).toHaveBeenCalledWith(expect.stringContaining('challenge:challenges'));
    expect(q.order).toHaveBeenCalledWith('started_at', { ascending: false });
  });

  it('insertAssignment: 23505 → CHALLENGE_ALREADY_ACTIVE', async () => {
    result.current = { data: null, error: { code: '23505', message: 'dup' } };
    await expect(assignments.insertAssignment({})).rejects.toMatchObject({
      statusCode: 409,
      code: 'CHALLENGE_ALREADY_ACTIVE',
    });
  });

  it('insertAssignment: otro error → 500; ok → fila', async () => {
    result.current = { data: null, error: { code: 'XX', message: 'x' } };
    await expect(assignments.insertAssignment({})).rejects.toMatchObject({ statusCode: 500 });
    result.current = { data: { id: 'sc' }, error: null };
    await expect(assignments.insertAssignment({})).resolves.toEqual({ id: 'sc' });
  });

  it('findActiveStudentIds filtra por entrenador y activos', async () => {
    result.current = { data: [{ id: 's1' }], error: null };
    await expect(assignments.findActiveStudentIds('tr', ['s1', 's2'])).resolves.toEqual(['s1']);
    expect(q.eq).toHaveBeenCalledWith('active', true);
    expect(q.in).toHaveBeenCalledWith('id', ['s1', 's2']);
  });
});
