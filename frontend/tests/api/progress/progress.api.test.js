import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api/progress/progress.api';
import { configureClient } from '@/api/shared/client';
import { calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => configureClient({ getToken: () => 'access-1', refreshSession: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('progress.api', () => {
  it('getOverview pasa student_id, from y to y devuelve data', async () => {
    const data = { exercises: [], weekly_volume: [] };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(api.getOverview('st-1', { from: '2026-08-03', to: '2026-10-29' })).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/progress/overview?student_id=st-1&from=2026-08-03&to=2026-10-29');
    expect(init.method).toBe('GET');
  });

  it('getOverview omite from y to cuando son null (rango "Todo")', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: {} }));
    await api.getOverview('st-1', { from: null, to: null });
    expect(calls(fetchMock)[0][0]).toBe('/progress/overview?student_id=st-1');
  });

  it('acepta un rango null o undefined', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: {} }));
    await api.getOverview('st-1', null);
    await api.getOverview('st-1');
    await api.getExerciseProgress('ex-1', 'st-1', null);
    expect(calls(fetchMock).map(([path]) => path)).toEqual([
      '/progress/overview?student_id=st-1',
      '/progress/overview?student_id=st-1',
      '/progress/exercise/ex-1?student_id=st-1',
    ]);
  });

  it('getExerciseProgress hace GET /progress/exercise/:id con la query', async () => {
    const data = { points: [] };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(api.getExerciseProgress('ex-1', 'st-1', { from: '2026-09-28', to: null })).resolves.toEqual(data);
    expect(calls(fetchMock)[0][0]).toBe('/progress/exercise/ex-1?student_id=st-1&from=2026-09-28');
  });

  it('getBodyProgress hace GET /progress/body/:studentId', async () => {
    const data = { points: [], summary: {} };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(api.getBodyProgress('st-1')).resolves.toEqual(data);
    expect(calls(fetchMock)[0][0]).toBe('/progress/body/st-1');
  });
});
