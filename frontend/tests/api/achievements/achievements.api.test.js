import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api/achievements/achievements.api';
import { configureClient } from '@/api/shared/client';
import { calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => configureClient({ getToken: () => 'access-1', refreshSession: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

describe('achievements.api', () => {
  it.each([
    ['listAchievements', [], '/achievements'],
    ['getStudentAchievements', ['s-1'], '/students/s-1/achievements'],
    ['getStudentStreak', ['s-1'], '/students/s-1/streak'],
    ['getStudentChallenges', ['s-1'], '/students/s-1/challenges'],
  ])('%s hace GET %s y devuelve data', async (fn, args, expected) => {
    const data = [{ id: 'x' }];
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(api[fn](...args)).resolves.toEqual(data);
    expect(calls(fetchMock)[0][0]).toBe(expected);
    expect(calls(fetchMock)[0][1].method).toBe('GET');
  });
});
