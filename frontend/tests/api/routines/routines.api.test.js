import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as routinesApi from '@/api/routines/routines.api';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => {
  configureClient({ getToken: () => 'access-1', refreshSession: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('routines.api', () => {
  it('listRoutines hace GET /routines y devuelve data', async () => {
    const data = [{ id: 'r-1' }];
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(routinesApi.listRoutines()).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/routines');
    expect(init.method).toBe('GET');
  });

  it('createRoutine hace POST /routines con el body y devuelve data', async () => {
    const data = { id: 'r-1' };
    const fetchMock = stubFetch(async () => jsonResponse(201, { data }));
    const body = { student_id: 's-1', name: 'Fuerza' };
    await expect(routinesApi.createRoutine(body)).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/routines');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual(body);
  });
});
