import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { resetAuthStore } from '../auth/authStore';
import { STUDENT } from '../routes/renderRoute';
import { errorResponse, jsonResponse, reply, stubFetch } from '../shared/fetchMock';
import { studentDetail } from './fixtures';

/** El alumno que inició sesión en los tests de sus pantallas (el mismo `STUDENT` de las rutas). */
export const SELF = STUDENT;

/** Su ficha, como la devuelve `GET /students/s-1`. */
export const selfDetail = (overrides = {}) =>
  studentDetail({ id: SELF.id, name: SELF.name, email: SELF.email, goal: 'hypertrophy', level: 'intermediate', ...overrides });

/** Deja iniciada la sesión de `SELF` (y limpia lo que haya dejado otro test). */
export function signInSelf() {
  resetAuthStore();
  useAuthStore.setState({ user: SELF, token: 'access-1', refreshToken: 'refresh-1', status: 'authenticated' });
}

/** Su entrenador/a, como viene en el `counterpart` de `GET /messages/s-1?limit=1`. */
export const TRAINER = { id: 't-1', name: 'Laura Gómez', avatar_url: null };

/** Monta una pantalla sin rutas (un MemoryRouter para los links), con un QueryClient sin reintentos (que devuelve para mirar su caché). */
export function renderOwn(ui) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...utils, queryClient };
}

// La respuesta de `GET /messages/:id?limit=1`: el `counterpart` va al lado de `data`, no adentro.
async function replyCounterpart(answer) {
  const value = await (typeof answer === 'function' ? answer() : answer);
  if (typeof value === 'number') return errorResponse(value, 'INTERNAL');
  return jsonResponse(200, { data: [], meta: { next_before: null }, counterpart: value });
}

/**
 * Stub de fetch con lo que pide el alumno sobre sus datos y medidas. Todo lo demás da 500, así que un pedido que no
 * debería salir (un PATCH de la ficha, algo de otro alumno) se ve como error.
 * - `profile`, `metrics`, `progress`, `counterpart` (`TRAINER` por defecto): la respuesta de cada GET. Una función que
 *   nunca resuelve deja la carga a medias.
 * - `createMetric(init)` y `deleteMetric(init, path)`: los handlers de POST y DELETE de medidas.
 */
export function stubSelf({ profile, metrics = [], progress, counterpart = TRAINER, createMetric, deleteMetric } = {}) {
  const base = `/students/${SELF.id}`;
  return stubFetch(async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const path = url.replace(/^.*\/api/, '');
    if (method === 'GET' && path === base) return reply(profile);
    if (method === 'GET' && path === `${base}/metrics`) return reply(metrics);
    if (method === 'GET' && path === `/progress/body/${SELF.id}`) return reply(progress);
    if (method === 'GET' && path === `/messages/${SELF.id}?limit=1`) return replyCounterpart(counterpart);
    if (method === 'POST' && path === `${base}/metrics` && createMetric) return createMetric(init);
    if (method === 'DELETE' && path.startsWith(`${base}/metrics/`) && deleteMetric) return deleteMetric(init, path);
    return errorResponse(500, 'INTERNAL', `Sin handler: ${method} ${path}`);
  });
}
