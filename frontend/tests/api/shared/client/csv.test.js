import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, configureClient } from '@/api/shared/client';
import { errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';

const CSV = '﻿Fecha;Hora\r\n';

function csvResponse(body) {
  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/csv; charset=utf-8' } });
}

beforeEach(() => {
  configureClient({ getToken: () => 'access-1' });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('client: CSV', () => {
  it('con text/csv devuelve el texto tal cual, con BOM y CRLF', async () => {
    stubFetch(async () => csvResponse(CSV));
    const data = await api.get('/students/export');
    expect(data).toBe(CSV);
    expect(data.charCodeAt(0)).toBe(0xfeff);
  });

  it('el JSON sigue parseando', async () => {
    stubFetch(async () => jsonResponse(200, { data: [1] }));
    await expect(api.get('/x')).resolves.toEqual({ data: [1] });
  });

  it('un 403 JSON sigue tirando ApiError', async () => {
    stubFetch(async () => errorResponse(403, 'FORBIDDEN', 'No podés'));
    const err = await api.get('/students/s-9/export').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 403, code: 'FORBIDDEN' });
  });
});
