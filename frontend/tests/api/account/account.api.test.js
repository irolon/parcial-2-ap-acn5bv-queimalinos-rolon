import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as accountApi from '@/api/account/account.api';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => {
  configureClient({ getToken: () => 'access-1' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const csvResponse = (body) =>
  new Response(body, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8' } });

describe('account.api', () => {
  it('changePassword hace PUT /auth/password con Bearer y los tres campos', async () => {
    const payload = { token: 't-2', expires_in: '1h', password_changed_at: '2026-11-09T12:00:00Z' };
    const fetchMock = stubFetch(async () => jsonResponse(200, payload));
    const values = { current_password: 'Viej4clave', new_password: 'Nuev4clave', refresh_token: 'r-1' };
    await expect(accountApi.changePassword(values)).resolves.toEqual(payload);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/auth/password');
    expect(init.method).toBe('PUT');
    expect(init.headers.Authorization).toBe('Bearer access-1');
    expect(bodyOf(init)).toEqual(values);
  });

  it('resetStudentPassword hace POST /students/:id/password-reset sin body', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { temporary_password: 'Ab3kP9mQx2' }));
    await expect(accountApi.resetStudentPassword('s-1')).resolves.toEqual({ temporary_password: 'Ab3kP9mQx2' });
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/students/s-1/password-reset');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
  });

  it('exportSessions sin id pide GET /students/export y devuelve el texto', async () => {
    const fetchMock = stubFetch(async () => csvResponse('﻿Alumno\r\n'));
    await expect(accountApi.exportSessions()).resolves.toBe('﻿Alumno\r\n');
    expect(calls(fetchMock)[0][0]).toBe('/students/export');
    expect(calls(fetchMock)[0][1].method).toBe('GET');
  });

  it('exportSessions con id pide GET /students/:id/export', async () => {
    const fetchMock = stubFetch(async () => csvResponse('﻿Fecha\r\n'));
    await expect(accountApi.exportSessions('s-1')).resolves.toBe('﻿Fecha\r\n');
    expect(calls(fetchMock)[0][0]).toBe('/students/s-1/export');
  });
});
