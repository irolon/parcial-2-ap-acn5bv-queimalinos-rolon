import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as studentsApi from '@/api/students/students.api';
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

describe('students.api', () => {
  it('joinFromInvitation hace POST /students con token y password, sin Bearer', async () => {
    const payload = { student: { id: 's-1' }, token: 't', refresh_token: 'r' };
    const fetchMock = stubFetch(async () => jsonResponse(201, payload));
    await expect(studentsApi.joinFromInvitation({ token: 'tok', password: 'x12345678' })).resolves.toEqual(payload);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/students');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual({ token: 'tok', password: 'x12345678' });
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('con 401 no dispara la renovación y con 410 tira el código', async () => {
    const fetchMock = stubFetch(async () => errorResponse(401, 'UNAUTHORIZED'));
    await expect(studentsApi.joinFromInvitation({ token: 't', password: 'p' })).rejects.toMatchObject({ status: 401 });
    expect(refreshSession).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    stubFetch(async () => errorResponse(410, 'INVITATION_EXPIRED'));
    await expect(studentsApi.joinFromInvitation({ token: 't', password: 'p' })).rejects.toMatchObject({
      status: 410,
      code: 'INVITATION_EXPIRED',
    });
  });
});
