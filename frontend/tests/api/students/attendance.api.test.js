import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAttendance } from '@/api/students/attendance.api';
import { configureClient } from '@/api/shared/client';
import { calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { ATTENDANCE } from '../../helpers/students/attendance';

beforeEach(() => {
  configureClient({ getToken: () => 'access-1', refreshSession: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('attendance.api', () => {
  it('getAttendance hace GET /students/:id/attendance con el mes y devuelve `data`', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: ATTENDANCE }));
    await expect(getAttendance('st 1', '2026-11')).resolves.toEqual(ATTENDANCE);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/students/st%201/attendance?month=2026-11');
    expect(init.method ?? 'GET').toBe('GET');
  });

  it('con un error tira el status y el código', async () => {
    stubFetch(async () => errorResponse(403, 'FORBIDDEN'));
    await expect(getAttendance('st-1', '2026-11')).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });
});
