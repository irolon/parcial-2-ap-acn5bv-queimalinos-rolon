import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createElement } from 'react';
import { errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';

/** Resumen de sesión (§2.1); `routine`, `has_pr`, etc. se pisan por parámetro. */
export const sessionItem = (overrides = {}) => ({
  id: 's-1',
  started_at: new Date(2026, 3, 22, 18, 0).toISOString(),
  finished_at: new Date(2026, 3, 22, 18, 54).toISOString(),
  duration_min: 54,
  routine: { id: 'r-1', name: 'Push · día 3' },
  rpe: 7,
  notes: null,
  trainer_comment: null,
  has_modifications: false,
  sets: 12,
  volume_kg: 3000,
  has_pr: false,
  ...overrides,
});

export const setItem = (overrides = {}) => ({
  id: 'set-1',
  set_number: 1,
  actual_reps: 10,
  actual_kg: 60,
  completed: true,
  executed_at: new Date(2026, 3, 22, 18, 5).toISOString(),
  ...overrides,
});

export const exerciseItem = (overrides = {}) => ({
  exercise: { id: 'e-1', name: 'Press de banca' },
  original_exercise: null,
  planned: { sets: 3, reps: 10, suggested_kg: 60 },
  is_pr: false,
  sets: [setItem()],
  ...overrides,
});

export const sessionDetailItem = (overrides = {}) => ({ ...sessionItem(), exercises: [exerciseItem()], ...overrides });

/** Página `{ data, meta }` como la del backend. */
export const sessionsPage = (data, { page = 1, totalPages = 1, total = data.length } = {}) => ({
  data,
  meta: { total, page, limit: 20, total_pages: totalPages },
});

/**
 * Rutas de sesiones para `stubFetch`; devuelve `null` si el pedido no es de sesiones.
 * - `sessions`: página, o `(page) => página`, o status de error; por defecto, historial vacío.
 * - `details`: `{ [sessionId]: detalle }`, o función `(sessionId) => detalle`.
 * - `comment`: handler `(init, url)` del PATCH `/sessions/:id/comment`.
 */
export function sessionsRoute({ sessions, details = {}, comment } = {}) {
  return async (method, path, init, url) => {
    if (method === 'GET' && /^\/students\/[^/]+\/sessions\?/.test(path)) {
      if (typeof sessions === 'number') return errorResponse(sessions, 'INTERNAL');
      const page = Number(new URL(url).searchParams.get('page'));
      return jsonResponse(200, typeof sessions === 'function' ? sessions(page) : (sessions ?? sessionsPage([])));
    }
    const detail = path.match(/^\/students\/[^/]+\/sessions\/([^/?]+)$/);
    if (method === 'GET' && detail) {
      const value = typeof details === 'function' ? details(detail[1]) : details[detail[1]];
      if (typeof value === 'number') return errorResponse(value, 'INTERNAL');
      return value ? jsonResponse(200, { data: value }) : errorResponse(404, 'SESSION_NOT_FOUND');
    }
    if (method === 'PATCH' && /^\/sessions\/[^/]+\/comment$/.test(path)) {
      return comment ? comment(init, url) : errorResponse(500, 'INTERNAL', 'Sin handler');
    }
    return null;
  };
}

/** Stub de fetch solo con sesiones (para tests de componentes). */
export function stubSessions(options) {
  const route = sessionsRoute(options);
  return stubFetch(async (url, init = {}) => {
    const response = await route(init.method ?? 'GET', url.replace(/^.*\/api/, ''), init, url);
    return response ?? errorResponse(500, 'INTERNAL', 'Sin handler');
  });
}

/** Renderiza con un QueryClient sin reintentos. */
export function renderWithQuery(ui) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(createElement(QueryClientProvider, { client }, ui));
}
