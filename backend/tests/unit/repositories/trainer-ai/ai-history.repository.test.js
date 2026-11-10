import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { fileURLToPath } from 'node:url';
import { fake, reset, supabase, callsOf } from '../../../helpers/trainer-ai/supabase-fake.js';

const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));
jest.unstable_mockModule(src('config/supabase.js'), () => ({ supabase }));

const repo = await import(src('repositories/trainer-ai/ai-history.repository.js'));

describe('ai-history.repository', () => {
  beforeEach(reset);

  it('findFinishedSessionsSince: sesiones del alumno terminadas desde la fecha, de la más nueva a la más vieja', async () => {
    fake.result = { data: [{ id: 'ss-1' }], error: null };
    await expect(repo.findFinishedSessionsSince('s-1', '2026-10-11T15:00:00.000Z')).resolves.toEqual([{ id: 'ss-1' }]);
    expect(fake.tables).toEqual(['sessions']);
    expect(callsOf('select')).toEqual([['id, finished_at, rpe']]);
    expect(callsOf('eq')).toEqual([['student_id', 's-1']]);
    expect(callsOf('gte')).toEqual([['finished_at', '2026-10-11T15:00:00.000Z']]);
    expect(callsOf('order')).toEqual([['finished_at', { ascending: false }]]);
  });

  it('un error de la base es 500', async () => {
    fake.result = { data: null, error: { message: 'boom' } };
    await expect(repo.findFinishedSessionsSince('s-1', '2026-10-11T15:00:00.000Z')).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});
