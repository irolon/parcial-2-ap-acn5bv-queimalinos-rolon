import { screen } from '@testing-library/react';
import { LIBRARY } from '../exercises/fixtures';
import { TRAINER, renderRoute, setSession } from '../routes/renderRoute';
import { errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';

export const EDIT_ID = 'r-edit';

const byId = new Map(LIBRARY.map((e) => [e.id, e]));
const embed = (id) => {
  const e = byId.get(id) ?? { id, name: 'Ejercicio propio', muscle_group: 'back', equipment: null, video_url: null };
  return { id: e.id, name: e.name, muscle_group: e.muscle_group, equipment: e.equipment, video_url: e.video_url };
};

/** Fila guardada con la forma de `GET /routines/:id`. */
export function savedRow(id, exerciseId, order, values = {}) {
  return {
    routine_exercise_id: id, exercise: embed(exerciseId), sets: 4, reps: 8, rest_seconds: 90, suggested_kg: 60,
    tempo: null, notes: null, order_index: order, ...values,
  };
}

/** Rutina guardada: Sentadilla (re-1) y Plancha (re-2). */
export function savedRoutine(overrides = {}) {
  return {
    id: EDIT_ID, trainer_id: 't-1', student_id: 'st-ana', template_id: null, name: 'Fuerza A', goal: 'strength',
    level: 'beginner', days: ['monday', 'thursday'], active: true, created_at: '2026-11-01T10:00:00Z',
    exercises: [savedRow('re-1', 'ex-squat', 0), savedRow('re-2', 'ex-plank', 1, { suggested_kg: null })],
    ...overrides,
  };
}

/**
 * Servidor falso de la edición: guarda la rutina en memoria y contesta `GET/PATCH /routines/:id` y las rutas de sus
 * ejercicios como el backend. `fail(method, pathRegex)` hace fallar una ruta (500) una vez, también un GET; `hold(method,
 * pathRegex)` demora la próxima respuesta de esa ruta hasta llamar a la función que devuelve; `routine` deja cambiarla
 * "desde afuera" (otro dispositivo). `log` lista `METHOD path` de cada escritura.
 */
export function stubEditServer(initial = savedRoutine()) {
  const server = { routine: structuredClone(initial), log: [], failures: [], holds: [], seq: 0 };
  server.fail = (method, pattern, status = 500) => server.failures.push({ method, pattern, status });
  server.hold = (method, pattern) => {
    let release;
    server.holds.push({ method, pattern, promise: new Promise((resolve) => { release = resolve; }) });
    return () => release();
  };
  const take = (list, method, path) => {
    const found = list.find((f) => f.method === method && f.pattern.test(path));
    if (found) list.splice(list.indexOf(found), 1);
    return found;
  };
  const rows = () => server.routine.exercises;
  const routes = {
    'PATCH /routines/:id': (body) => { Object.assign(server.routine, body); return jsonResponse(200, { data: server.routine }); },
    'POST /routines/:id/exercises': ({ exercises }) => {
      const offset = Math.max(-1, ...rows().map((r) => r.order_index)) + 1;
      const created = exercises.map((e) => {
        server.seq += 1;
        const { exercise_id: exerciseId, order, ...values } = e;
        return savedRow(`re-new-${server.seq}`, exerciseId, offset + order, values);
      });
      rows().push(...created);
      const data = created.map((r) => ({ id: r.routine_exercise_id, order_index: r.order_index }));
      return jsonResponse(201, { data });
    },
    'PATCH /routines/:id/exercises/:re': (body, re) => {
      Object.assign(rows().find((r) => r.routine_exercise_id === re), body);
      return jsonResponse(200, { data: server.routine });
    },
    'DELETE /routines/:id/exercises/:re': (_body, re) => {
      if (rows().length <= 1) return errorResponse(409, 'ROUTINE_NEEDS_EXERCISE', 'La rutina tiene que tener al menos un ejercicio');
      server.routine.exercises = rows().filter((r) => r.routine_exercise_id !== re);
      return jsonResponse(204);
    },
    'PUT /routines/:id/exercises/order': ({ routine_exercise_ids: ids }) => {
      ids.forEach((id, index) => { rows().find((r) => r.routine_exercise_id === id).order_index = index; });
      return jsonResponse(200, { data: server.routine });
    },
  };
  server.fetchMock = stubFetch(async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const path = url.replace(/^.*\/api/, '');
    const held = take(server.holds, method, path);
    if (held) await held.promise;
    const failure = take(server.failures, method, path);
    if (failure) return errorResponse(failure.status, 'INTERNAL', 'Error del servidor');
    if (method === 'GET' && path.startsWith('/exercises')) return jsonResponse(200, { data: LIBRARY });
    if (method === 'GET' && path === `/routines/${EDIT_ID}`) return jsonResponse(200, { data: structuredClone(server.routine) });
    if (method === 'GET') return jsonResponse(200, { data: [] });
    server.log.push(`${method} ${path}`);
    const re = path.match(/\/exercises\/([^/]+)$/)?.[1];
    const key = `${method} ${path.replace(EDIT_ID, ':id').replace(/\/exercises\/(?!order$)[^/]+$/, '/exercises/:re')}`;
    return routes[key](init.body ? JSON.parse(init.body) : undefined, re);
  });
  /** Filas guardadas, en orden: `[nombre, series, reps]`. */
  server.rows = () => [...rows()].sort((a, b) => a.order_index - b.order_index).map((r) => [r.exercise.name, r.sets, r.reps]);
  return server;
}

/** Abre el editor en modo edición con el servidor falso y espera la rutina y la biblioteca. */
export async function renderEdit(server) {
  setSession(TRAINER);
  const utils = renderRoute(`/pt/rutinas/${EDIT_ID}/editar`);
  await screen.findByDisplayValue('Fuerza A');
  await screen.findByRole('button', { name: 'Agregar Sentadilla' });
  return { ...utils, server };
}
