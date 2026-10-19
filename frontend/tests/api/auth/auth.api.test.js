import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as authApi from '@/api/auth/auth.api';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

const refreshSession = vi.fn();

beforeEach(() => {
  refreshSession.mockReset();
  configureClient({ getToken: () => 'access-1', refreshSession });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('auth.api', () => {
  it('login hace POST /auth/login con email y password, sin Bearer', async () => {
    const payload = { user: { id: 1, role: 'trainer' }, token: 't', refresh_token: 'r', expires_in: '1h' };
    const fetchMock = stubFetch(async () => jsonResponse(200, payload));
    await expect(authApi.login({ email: 'a@b.com', password: 'x' })).resolves.toEqual(payload);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/auth/login');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual({ email: 'a@b.com', password: 'x' });
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('refresh hace POST /auth/refresh con refresh_token', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { token: 'nuevo', expires_in: '1h' }));
    await expect(authApi.refresh('r-1')).resolves.toEqual({ token: 'nuevo', expires_in: '1h' });
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/auth/refresh');
    expect(bodyOf(init)).toEqual({ refresh_token: 'r-1' });
  });

  it('logout hace POST /auth/logout con Bearer y devuelve null en 204', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(204));
    await expect(authApi.logout('r-1')).resolves.toBeNull();
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/auth/logout');
    expect(init.headers.Authorization).toBe('Bearer access-1');
    expect(bodyOf(init)).toEqual({ refresh_token: 'r-1' });
  });

  it.each([
    ['login', () => authApi.login({ email: 'a@b.com', password: 'x' })],
    ['refresh', () => authApi.refresh('r')],
    ['logout', () => authApi.logout('r')],
  ])('%s con 401 UNAUTHORIZED no dispara la renovación', async (_name, call) => {
    const fetchMock = stubFetch(async () => errorResponse(401, 'UNAUTHORIZED'));
    await expect(call()).rejects.toMatchObject({ status: 401, code: 'UNAUTHORIZED' });
    expect(refreshSession).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
