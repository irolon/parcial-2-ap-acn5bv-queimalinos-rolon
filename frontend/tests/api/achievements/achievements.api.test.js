import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, configureClient } from '@/api/shared/client';
import { getStudentStreak } from '@/api/achievements/achievements.api';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => configureClient({ getToken: () => 'access-1', refreshSession: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('achievements.api: getStudentStreak', () => {
  it('hace GET /students/:id/streak y devuelve la racha', async () => {
    const data = { current_streak_days: 12, longest_streak_days: 21, last_session_date: '2026-10-31' };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(getStudentStreak('s-1')).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/students/s-1/streak');
    expect(init.method).toBe('GET');
  });

  it('codifica el id en la dirección', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: {} }));
    await getStudentStreak('a/b');
    expect(calls(fetchMock)[0][0]).toBe('/students/a%2Fb/streak');
  });

  it('un error del servidor queda como ApiError', async () => {
    stubFetch(async () => errorResponse(500, 'INTERNAL'));
    await expect(getStudentStreak('s-1')).rejects.toBeInstanceOf(ApiError);
  });
});
