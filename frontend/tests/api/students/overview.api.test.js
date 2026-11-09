import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getOverview } from '@/api/students/overview.api';
import { configureClient } from '@/api/shared/client';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { overview } from '../../helpers/students/overview';

beforeEach(() => {
  configureClient({ getToken: () => 'access-1', refreshSession: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('overview.api', () => {
  it('getOverview hace GET /students/overview con Bearer y devuelve data', async () => {
    const data = overview({ at_risk: 3 });
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(getOverview()).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/students/overview');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('con un error tira el status y el código', async () => {
    stubFetch(async () => errorResponse(403, 'FORBIDDEN'));
    await expect(getOverview()).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });
});
