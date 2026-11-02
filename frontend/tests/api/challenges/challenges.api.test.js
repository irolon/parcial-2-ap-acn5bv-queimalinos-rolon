import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api/challenges/challenges.api';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => configureClient({ getToken: () => 'access-1', refreshSession: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());

describe('challenges.api', () => {
  it('listChallenges hace GET /challenges y devuelve data', async () => {
    const data = [{ id: 'c-1' }];
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(api.listChallenges()).resolves.toEqual(data);
    expect(calls(fetchMock)[0][0]).toBe('/challenges');
  });

  it('createChallenge hace POST con el body', async () => {
    const body = { name: 'X', goal_type: 'streak', goal_value: 7, duration_days: 30 };
    const fetchMock = stubFetch(async () => jsonResponse(201, { data: { id: 'c-2', ...body } }));
    await expect(api.createChallenge(body)).resolves.toMatchObject({ id: 'c-2' });
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/challenges');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual(body);
  });

  it('deleteChallenge hace DELETE /challenges/:id', async () => {
    const fetchMock = stubFetch(async () => new Response(null, { status: 204 }));
    await api.deleteChallenge('c-1');
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/challenges/c-1');
    expect(init.method).toBe('DELETE');
  });

  it('assignChallenge manda student_ids y devuelve created y skipped', async () => {
    const data = { created: [{ student_id: 's-1' }], skipped: [{ student_id: 's-2', reason: 'ALREADY_ACTIVE' }] };
    const fetchMock = stubFetch(async () => jsonResponse(201, { data }));
    await expect(api.assignChallenge('c-1', ['s-1', 's-2'])).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/challenges/c-1/assignments');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual({ student_ids: ['s-1', 's-2'] });
  });

  it('getActiveStudents hace GET /challenges/:id/active-students', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: ['s-1'] }));
    await expect(api.getActiveStudents('c-1')).resolves.toEqual(['s-1']);
    expect(calls(fetchMock)[0][0]).toBe('/challenges/c-1/active-students');
  });
});
