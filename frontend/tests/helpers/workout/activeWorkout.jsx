import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { SESSION_STORAGE_KEY, useAuthStore } from '@/hooks/auth/useAuthStore';
import { useActiveWorkout } from '@/hooks/workout/useActiveWorkout';
import { todayRoutine } from '../routines/studentRoutines';
import { API_URL, errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';

export const STUDENT = 's-1';

/**
 * Deja iniciada la sesión del alumno `id` (la subida solo sale con ese alumno adentro), sin dejarla en localStorage:
 * los tests de la sesión en curso miran lo que hay ahí (y algunos lo rompen a propósito).
 */
export function signInAs(id) {
  try {
    useAuthStore.setState({
      user: { id, role: 'student' }, token: `access-${id}`, refreshToken: `refresh-${id}`, status: 'authenticated',
    });
  } catch {
    // localStorage roto a propósito: el store ya cambió, solo falló la copia.
  }
  localStorage.removeItem(SESSION_STORAGE_KEY);
}

/** Monta `useActiveWorkout` con su QueryClient y ese alumno adentro. `rerender({ id })` cambia de alumno. */
export function renderActiveWorkout(studentId = STUDENT) {
  signInAs(studentId);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const view = renderHook(({ id }) => useActiveWorkout(id), { wrapper, initialProps: { id: studentId } });
  return { client, ...view };
}

/** Empieza la rutina de /today y registra dos series de Press banca: 62,5 kg × 10 y peso corporal × 12. */
export function train(view) {
  act(() => { view.result.current.start(todayRoutine()); });
  act(() => { view.result.current.register(62.5, 10); });
  act(() => { view.result.current.register(null, 12); });
}

/** Llama a `upload()` dentro de `act` y devuelve su resultado. */
export async function uploadNow(view) {
  let result;
  await act(async () => { result = await view.result.current.upload(); });
  return result;
}

/** La respuesta del backend cuando sale todo bien (sirve para armar respuestas demoradas). */
export const okUploadResponse = (path, body) => (path === '/sessions'
  ? jsonResponse(201, { data: { ...body, student_id: STUDENT, unlocked_achievements: [] } })
  : jsonResponse(200, {
    data: { saved: body.sets.map(({ id }) => ({ id, created: true })), failed: [], unlocked_achievements: [] },
  }));

/** Una respuesta que se queda esperando hasta `release()` (para simular un pedido en vuelo). */
export function heldResponse() {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  return { release, respond: (path, body) => gate.then(() => okUploadResponse(path, body)) };
}

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
