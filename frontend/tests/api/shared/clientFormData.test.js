import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api, configureClient } from '@/api/shared/client';
import { errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

let token;

beforeEach(() => {
  token = 'access-1';
  configureClient({
    getToken: () => token,
    refreshSession: async () => {
      token = 'access-2';
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function formWith(body) {
  const form = new FormData();
  form.append('body', body);
  return form;
}

describe('client: FormData', () => {
  it('manda el FormData tal cual, sin Content-Type ni JSON.stringify, y con Bearer', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(201, { data: 1 }));
    const form = formWith('hola');
    await expect(api.post('/messages/s-1', form)).resolves.toEqual({ data: 1 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.body).toBe(form);
    expect(init.headers['Content-Type']).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer access-1');
  });

  it('con 401 renueva y reintenta con el mismo FormData', async () => {
    const fetchMock = stubFetch(async () =>
      fetchMock.mock.calls.length === 1 ? errorResponse(401, 'UNAUTHORIZED') : jsonResponse(201, { data: 1 }),
    );
    const form = formWith('hola');
    await api.post('/messages/s-1', form);
    expect(fetchMock.mock.calls.map(([, init]) => init.body)).toEqual([form, form]);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer access-2');
  });

  it('los errores del backend siguen llegando como ApiError', async () => {
    stubFetch(async () => errorResponse(413, 'IMAGE_TOO_LARGE', 'La foto supera 5 MB'));
    await expect(api.post('/messages/s-1', new FormData())).rejects.toMatchObject({
      status: 413,
      code: 'IMAGE_TOO_LARGE',
    });
  });

  it('el JSON sigue igual: Content-Type y stringify', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, {}));
    await api.post('/x', { a: 1 });
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"a":1}');
  });
});
