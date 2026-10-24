import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '@/api/body-metrics/body-metrics.api';
import { configureClient } from '@/api/shared/client';
import { bodyOf, calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';
import { metric } from '../../helpers/students/fixtures';

beforeEach(() => configureClient({ getToken: () => 'access-1', refreshSession: vi.fn() }));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('body-metrics.api', () => {
  it('listMetrics hace GET /students/:id/metrics y devuelve data', async () => {
    const data = [metric()];
    const fetchMock = stubFetch(async () => jsonResponse(200, { data }));
    await expect(api.listMetrics('st-1')).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/students/st-1/metrics');
    expect(init.method).toBe('GET');
  });

  it('createMetric hace POST con el body y devuelve data', async () => {
    const data = metric();
    const fetchMock = stubFetch(async () => jsonResponse(201, { data }));
    await expect(api.createMetric('st-1', { weight_kg: 80 })).resolves.toEqual(data);
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/students/st-1/metrics');
    expect(init.method).toBe('POST');
    expect(bodyOf(init)).toEqual({ weight_kg: 80 });
  });

  it('deleteMetric hace DELETE /students/:id/metrics/:metricId y resuelve vacío', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(204));
    await expect(api.deleteMetric('st-1', 'm-1')).resolves.toBeUndefined();
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/students/st-1/metrics/m-1');
    expect(init.method).toBe('DELETE');
  });
});
