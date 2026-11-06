import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIBRARY } from '../exercises/fixtures';
import { TRAINER, renderRoute, setSession } from '../routes/renderRoute';
import { calls, errorResponse, jsonResponse, stubFetch } from '../shared/fetchMock';
import { AI_STORAGE_KEY, SPLIT } from './fixtures';

const NOT_HANDLED = () => errorResponse(500, 'INTERNAL', 'Sin handler');

/** `userEvent` sin la pausa entre acciones (en Windows cada `setTimeout(0)` cuesta ~16 ms). */
export const setupUser = (options = {}) => userEvent.setup({ delay: null, ...options });

const answer = (value, ...args) => (typeof value === 'function' ? value(...args) : value);

/**
 * Stub de la API del asistente y lo que usa alrededor (alumnos, plantillas, biblioteca y rutinas del editor).
 * - `detail`: ficha de `GET /students/:id` (objeto, función `id => ficha` o un status de error).
 * - `students`: activos de `GET /students`; `templates`: `GET /routine-templates`; `exercises`: la biblioteca.
 * - `generate(init)`, `save(init)`, `create(init)`: POST de generar, guardar como plantillas y crear la rutina.
 */
export function stubAiApi({
  detail, students = [], templates = [], exercises = LIBRARY, routines = [],
  generate = () => jsonResponse(200, { data: SPLIT }), save = NOT_HANDLED, create = NOT_HANDLED,
} = {}) {
  return stubFetch(async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const path = url.replace(/^.*\/api/, '');
    const detailMatch = path.match(/^\/students\/([^/?]+)$/);
    if (method === 'GET' && detailMatch) {
      const data = answer(detail, detailMatch[1]);
      return typeof data === 'number' ? errorResponse(data, 'STUDENT_NOT_FOUND') : jsonResponse(200, { data });
    }
    if (method === 'GET' && path.startsWith('/students')) return jsonResponse(200, { data: path.includes('active=false') ? [] : students });
    if (method === 'GET' && path.startsWith('/routine-templates')) return jsonResponse(200, { data: templates });
    if (method === 'GET' && path.startsWith('/exercises')) return jsonResponse(200, { data: exercises });
    if (method === 'GET' && path.startsWith('/routines')) return jsonResponse(200, { data: routines });
    if (method === 'POST' && path === '/trainer-ai/generate-routine') return generate(init);
    if (method === 'POST' && path === '/trainer-ai/save-as-template') return save(init);
    if (method === 'POST' && path === '/routines') return create(init);
    return NOT_HANDLED();
  });
}

/** Sesión de entrenador, stub y render de la ruta (sin esperar nada). */
export function renderAi(path = '/pt/rutinas/ia', api = {}) {
  setSession(TRAINER);
  const fetchMock = stubAiApi(api);
  return { ...renderRoute(path), fetchMock };
}

/** Deja una propuesta guardada como la escribe la pantalla. */
export function storeProposal({ result = SPLIT, form = {}, student = { id: 'st-9', name: 'Ana Paz' }, ...rest } = {}) {
  const data = {
    form: {
      studentId: student?.id ?? '', goal: 'hypertrophy', level: 'beginner', frequency: '3', duration: '60',
      equipment: [], injuries: '', preferences: '', baseTemplateId: '', ...form,
    },
    student,
    generationId: result.generation_id,
    proposal: result.routine_proposal,
    assigned: {},
    saved: null,
    editing: null,
    ...rest,
  };
  sessionStorage.setItem(AI_STORAGE_KEY(TRAINER.id), JSON.stringify(data));
  return data;
}

/** Lo guardado en `sessionStorage` del entrenador de los tests. */
export const storedProposal = () => JSON.parse(sessionStorage.getItem(AI_STORAGE_KEY(TRAINER.id)));

/** POSTs a `path` hechos al stub. */
export const postsTo = (fetchMock, path) => calls(fetchMock).filter(([p, init]) => p === path && init?.method === 'POST');

/** Generar que queda colgado hasta que se aborte (y entonces rechaza como `fetch`). */
export const hangingGenerate = (seen = []) => (init) => new Promise((_, reject) => {
  seen.push(init.signal);
  init.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
});

/** Espera el formulario del asistente. */
export const findGenerateButton = () => screen.findByRole('button', { name: 'Generar propuesta' });
