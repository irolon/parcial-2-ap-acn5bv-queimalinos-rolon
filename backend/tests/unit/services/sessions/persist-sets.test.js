import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fileURLToPath } from 'node:url';

// Ruta absoluta: el mock tiene que resolver al MISMO archivo que importa persist-sets.
const src = (p) => fileURLToPath(new URL(`../../../../src/${p}`, import.meta.url));
const repo = {
  insertNewSets: jest.fn(),
  findSetsByIds: jest.fn(),
  updateSetInSession: jest.fn(),
};
jest.unstable_mockModule(src('repositories/sessions/session-sets.repository.js'), () => repo);
const { persistSets } = await import(src('services/sessions/persist-sets.js'));

const SESSION = 'ses-1';
const candidate = (id, index) => ({
  value: { id, exercise_id: 'ex-1', set_number: index + 1, actual_reps: 10, actual_kg: 50 },
  index,
});
const lote = (...ids) => ids.map(candidate);

beforeEach(() => jest.resetAllMocks());

describe('persistSets · falla a mitad y reintento', () => {
  it('un update que falla a mitad rechaza, pero las nuevas ya quedaron insertadas', async () => {
    repo.insertNewSets.mockResolvedValue(['s1', 's2']);
    repo.updateSetInSession.mockImplementation(async (_sid, id) => {
      if (id === 's4') throw new Error('timeout');
      return true;
    });

    await expect(
      persistSets(SESSION, lote('s1', 's2', 's3', 's4'), new Set(['s3', 's4']), [])
    ).rejects.toThrow('timeout');

    expect(repo.insertNewSets).toHaveBeenCalledTimes(1);
    const rows = repo.insertNewSets.mock.calls[0][0];
    expect(rows.map((r) => [r.id, r.session_id])).toEqual([
      ['s1', SESSION],
      ['s2', SESSION],
    ]);
  });

  it('el reintento del mismo lote completa sin duplicar', async () => {
    repo.updateSetInSession.mockResolvedValue(true);
    const failed = [];

    const saved = await persistSets(
      SESSION,
      lote('s1', 's2', 's3', 's4'),
      new Set(['s1', 's2', 's3', 's4']),
      failed
    );

    expect(saved.map((s) => [s.value.id, s.index, s.created])).toEqual([
      ['s1', 0, false],
      ['s2', 1, false],
      ['s3', 2, false],
      ['s4', 3, false],
    ]);
    expect(repo.insertNewSets).not.toHaveBeenCalled();
    expect(repo.updateSetInSession).toHaveBeenCalledTimes(4);
    expect(failed).toEqual([]);
  });

  it('una serie que antes quedó en failed se guarda al reintentar', async () => {
    repo.insertNewSets.mockResolvedValueOnce([]);
    repo.findSetsByIds.mockResolvedValueOnce([]);
    const firstFailed = [];

    const first = await persistSets(SESSION, lote('s5'), new Set(), firstFailed);

    expect(first).toEqual([]);
    expect(firstFailed).toEqual([expect.objectContaining({ id: 's5', code: 'SET_ID_CONFLICT' })]);

    repo.insertNewSets.mockResolvedValueOnce(['s5']);
    const retryFailed = [];
    const retry = await persistSets(SESSION, lote('s5'), new Set(), retryFailed);

    expect(retry).toEqual([expect.objectContaining({ index: 0, created: true })]);
    expect(retry[0].value.id).toBe('s5');
    expect(retryFailed).toEqual([]);
    expect(repo.updateSetInSession).not.toHaveBeenCalled();
  });
});
