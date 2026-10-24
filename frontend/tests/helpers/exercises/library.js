import { screen, within } from '@testing-library/react';
import { LIBRARY } from './fixtures';
import { errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';

export const PAGE_PATH = '/pt/biblioteca';

export const page = () => within(screen.getByRole('main'));

const NOT_HANDLED = () => errorResponse(500, 'INTERNAL', 'Sin handler');

/** Stub de la API de ejercicios: GET devuelve `list`; el resto se delega en `handlers`. */
export function stubLibrary({ list = LIBRARY, handlers = {} } = {}) {
  const byMethod = { POST: handlers.create, PATCH: handlers.update, DELETE: handlers.remove };
  return stubFetch(async (url, init = {}) => {
    const method = init.method ?? 'GET';
    if (method === 'GET') return jsonResponse(200, { data: list });
    return (byMethod[method] ?? NOT_HANDLED)(init, url);
  });
}
