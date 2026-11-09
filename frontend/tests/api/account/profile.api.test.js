import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as profileApi from '@/api/account/profile.api';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

const ME = { id: 't-1', name: 'Laura Gómez', email: 'laura@fit.com', professional_title: null };

beforeEach(() => {
  configureClient({ getToken: () => 'access-1' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('profile.api', () => {
  it('getMe hace GET /auth/me con Bearer y devuelve data', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: ME }));
    await expect(profileApi.getMe()).resolves.toEqual(ME);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/auth/me');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('updateMe hace PATCH /auth/me con el body y devuelve data', async () => {
    const updated = { ...ME, professional_title: 'Lic. en Educación Física' };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: updated }));
    await expect(profileApi.updateMe({ professional_title: 'Lic. en Educación Física' })).resolves.toEqual(updated);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/auth/me');
    expect(init.method).toBe('PATCH');
    expect(bodyOf(init)).toEqual({ professional_title: 'Lic. en Educación Física' });
  });
});
