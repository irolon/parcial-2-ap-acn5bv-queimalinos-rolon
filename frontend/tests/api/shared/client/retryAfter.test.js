import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request } from '@/api/shared/client';
import { stubFetch } from '../../../helpers/shared/fetchMock';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const tooMany = (headers) => new Response(
  JSON.stringify({ error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Ya hay una propuesta en curso', details: [] } }),
  { status: 429, headers: { 'Content-Type': 'application/json', ...headers } },
);

describe('client: Retry-After', () => {
  it('un error con Retry-After en segundos lo expone como `retryAfter`', async () => {
    stubFetch(async () => tooMany({ 'Retry-After': '30' }));
    const error = await request('/trainer-ai/generate-routine', { method: 'POST', body: {} }).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 429, code: 'RATE_LIMIT_EXCEEDED', retryAfter: 30 });
  });

  it('sin el header, o con uno que no es un número, `retryAfter` es null', async () => {
    stubFetch(async () => tooMany({}));
    expect(await request('/x').catch((e) => e)).toMatchObject({ retryAfter: null });
    stubFetch(async () => tooMany({ 'Retry-After': 'mañana' }));
    expect(await request('/x').catch((e) => e)).toMatchObject({ retryAfter: null });
  });
});
