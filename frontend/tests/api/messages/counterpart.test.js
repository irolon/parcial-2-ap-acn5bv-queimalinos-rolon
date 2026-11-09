import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getCounterpart } from '@/api/messages/messages.api';
import { configureClient } from '@/api/shared/client';
import { calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(() => configureClient({ getToken: () => 'access-1' }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('getCounterpart', () => {
  it('pide un solo mensaje (GET, no marca leído) y devuelve el counterpart', async () => {
    const counterpart = { id: 't-1', name: 'Laura Gómez', avatar_url: null };
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: [], meta: { next_before: null }, counterpart }));
    await expect(getCounterpart('s-1')).resolves.toEqual(counterpart);
    const [path, init] = calls(fetchMock)[0];
    expect(path).toBe('/messages/s-1?limit=1');
    expect(init?.method ?? 'GET').toBe('GET');
  });

  it('sin counterpart en la respuesta devuelve null', async () => {
    stubFetch(async () => jsonResponse(200, { data: [], meta: {} }));
    await expect(getCounterpart('s-1')).resolves.toBeNull();
  });
});
