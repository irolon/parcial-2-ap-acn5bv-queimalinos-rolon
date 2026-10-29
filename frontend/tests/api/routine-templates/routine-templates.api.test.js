import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as templatesApi from '@/api/routine-templates/routine-templates.api';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => {
  configureClient({ getToken: () => 'access-1', refreshSession: vi.fn() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('routine-templates.api', () => {
  it('listTemplates hace GET /routine-templates', async () => {
    const data = [{ id: 't-1' }];
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(templatesApi.listTemplates()).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/routine-templates');
    expect(init.method).toBe('GET');
  });

  it('getTemplate hace GET /routine-templates/:id codificando el id', async () => {
    const data = { id: 'a/b' };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(templatesApi.getTemplate('a/b')).resolves.toEqual(data);
    expect(calls(fetchMock)[0][0]).toBe('/routine-templates/a%2Fb');
  });

  it('createTemplate hace POST /routine-templates con el body', async () => {
    const data = { id: 't-1' };
    const fetchMock = stubFetch(async () => jsonResponse(201, { data }));
    const body = { name: 'Plantilla', goal: 'strength', level: null, structure: { version: 1 } };
    await expect(templatesApi.createTemplate(body)).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/routine-templates');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual(body);
  });
});
