import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { useActiveWorkout } from '@/hooks/workout/useActiveWorkout';
import { API_URL, errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';

export const STUDENT = 's-1';

/** Monta `useActiveWorkout` con su QueryClient. `rerender({ id })` cambia de alumno. */
export function renderActiveWorkout(studentId = STUDENT) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const view = renderHook(({ id }) => useActiveWorkout(id), { wrapper, initialProps: { id: studentId } });
  return { client, ...view };
}

/** La respuesta del backend cuando sale todo bien (sirve para armar respuestas demoradas). */
export const okUploadResponse = (path, body) => (path === '/sessions'
  ? jsonResponse(201, { data: { ...body, student_id: STUDENT, unlocked_achievements: [] } })
  : jsonResponse(200, {
    data: { saved: body.sets.map(({ id }) => ({ id, created: true })), failed: [], unlocked_achievements: [] },
  }));

/**
 * fetch falso para la subida (POST /sessions y POST /sessions/:id/sets), cada uno con su cola de respuestas:
 * un status de error, 'offline' (sin red) o una función `(path, body) => Response | Promise<Response>`.
 * Con la cola vacía sale todo bien. Devuelve el mock de fetch.
 */
export function stubUpload({ session = [], sets = [] } = {}) {
  return stubFetch(async (url, init) => {
    const path = url.replace(API_URL, '');
    const body = JSON.parse(init.body);
    const next = (path === '/sessions' ? session : sets).shift();
    if (next === 'offline') throw new TypeError('Failed to fetch');
    if (typeof next === 'number') return errorResponse(next, next === 404 ? 'SESSION_NOT_FOUND' : 'HTTP_ERROR');
    if (typeof next === 'function') return next(path, body);
    return okUploadResponse(path, body);
  });
}
