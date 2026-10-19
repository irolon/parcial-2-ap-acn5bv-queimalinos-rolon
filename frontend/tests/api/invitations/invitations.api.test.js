import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as invitationsApi from '@/api/invitations/invitations.api';
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

describe('invitations.api', () => {
  it('createInvitation hace POST /invitations con Bearer y devuelve data desempaquetado', async () => {
    const data = { invitation_id: 'i-1', token: 'tok', join_url: 'http://x/join/tok', expires_at: 'z' };
    const fetchMock = stubFetch(async () => jsonResponse(201, { data }));
    const body = { student_name: 'Ana', student_email: 'ana@fit.com', goal: 'Fuerza' };
    await expect(invitationsApi.createInvitation(body)).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/invitations');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual(body);
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('getInvitation hace GET /invitations/:token sin Bearer y sin desempaquetar', async () => {
    const payload = { trainer: { name: 'Pablo' }, student_name: 'Ana', student_email: 'a@b.com', goal: null };
    const fetchMock = stubFetch(async () => jsonResponse(200, payload));
    await expect(invitationsApi.getInvitation('tok/1')).resolves.toEqual(payload);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/invitations/tok%2F1');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBeUndefined();
  });

  it.each([
    [404, 'INVITATION_NOT_FOUND'],
    [410, 'INVITATION_EXPIRED'],
    [410, 'INVITATION_ALREADY_USED'],
    [401, 'UNAUTHORIZED'],
  ])('getInvitation con %s %s tira el error sin renovar', async (status, code) => {
    stubFetch(async () => errorResponse(status, code));
    await expect(invitationsApi.getInvitation('tok')).rejects.toMatchObject({ status, code });
    expect(refreshSession).not.toHaveBeenCalled();
  });
});
