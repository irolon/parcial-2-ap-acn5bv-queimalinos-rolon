import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as preferencesApi from '@/api/notifications/preferences.api';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

const PREFS = { message: true, comment: false, appointment: true, pr: true, achievement: true };

beforeEach(() => {
  configureClient({ getToken: () => 'access-1' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('preferences.api', () => {
  it('getPreferences hace GET /notifications/preferences con Bearer y devuelve data', async () => {
    const data = { ...PREFS, updated_at: null };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(preferencesApi.getPreferences()).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/notifications/preferences');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('savePreferences hace PUT /notifications/preferences con los cinco y devuelve data', async () => {
    const data = { ...PREFS, updated_at: '2026-11-09T15:00:00.000Z' };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(preferencesApi.savePreferences({ ...PREFS, updated_at: null })).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/notifications/preferences');
    expect(init.method).toBe('PUT');
    expect(bodyOf(init)).toEqual(PREFS);
  });
});
