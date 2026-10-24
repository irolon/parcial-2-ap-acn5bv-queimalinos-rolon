import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as studentsApi from '@/api/students/students.api';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { student } from '../../helpers/students/fixtures';

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

  it('listStudents sin filtro pide limit=100 y devuelve data', async () => {
    const data = [student()];
    const fetchMock = stubFetch(async () => jsonResponse(200, { data, meta: {} }));
    await expect(studentsApi.listStudents()).resolves.toEqual(data);
    expect(calls(fetchMock)[0][0]).toBe('/students?limit=100');
    expect(calls(fetchMock)[0][1].method).toBe('GET');
  });

  it('listStudents({ active: false }) pide active=false&limit=100', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: [], meta: {} }));
    await studentsApi.listStudents({ active: false });
    expect(calls(fetchMock)[0][0]).toBe('/students?active=false&limit=100');
  });

  it('getStudent hace GET /students/:id y devuelve data', async () => {
    const data = student({ id: 'a/b' });
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(studentsApi.getStudent('a/b')).resolves.toEqual(data);
    expect(calls(fetchMock)[0][0]).toBe('/students/a%2Fb');
  });

  it('updateStudent hace PATCH /students/:id con el body y devuelve data', async () => {
    const data = student({ active: false });
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(studentsApi.updateStudent('st-1', { active: false })).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/students/st-1');
    expect(init.method).toBe('PATCH');
    expect(bodyOf(init)).toEqual({ active: false });
  });
});
