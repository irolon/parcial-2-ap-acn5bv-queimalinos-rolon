import { API_URL, jsonResponse, stubFetch } from '../shared/fetchMock';

export const challenge = (overrides = {}) => ({
  id: 'c-1', trainer_id: 't-1', name: 'Mes de fuerza', description: null, goal_type: 'sessions_count', goal_value: 12,
  duration_days: 30, reward_achievement_id: null, assignments_count: 0, active_count: 0, ...overrides,
});

export const CHALLENGE_DONE = { id: 'a-done', code: 'CHALLENGE_DONE', name: 'Desafío cumplido' };

export const student = (id, name) => ({ id, name, active: true });

const notStubbed = (what) => () => {
  throw new Error(`${what} no está stubbeado`);
};

/**
 * Stub de la API de desafíos: `challenges` (GET /challenges), `students` (GET /students), `active` (ids de
 * active-students), `catalog` (GET /achievements), y `create`, `assign`, `remove` como `(init, url) => Response`.
 * `active` y `catalog` también pueden ser una función que devuelve la Response (para simular errores).
 */
export function stubChallengesApi({
  challenges = [],
  students = [],
  active = [],
  catalog = [CHALLENGE_DONE],
  create = notStubbed('POST /challenges'),
  assign = notStubbed('POST /assignments'),
  remove = notStubbed('DELETE /challenges/:id'),
} = {}) {
  return stubFetch(async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const path = url.replace(API_URL, '');
    if (method === 'DELETE') return remove(init, url);
    if (path.endsWith('/assignments')) return assign(init, url);
    if (method === 'POST') return create(init, url);
    if (path.startsWith('/students')) return jsonResponse(200, { data: students, meta: { total_pages: 1 } });
    if (path === '/achievements') return typeof catalog === 'function' ? catalog() : jsonResponse(200, { data: catalog });
    if (path.endsWith('/active-students')) return typeof active === 'function' ? active() : jsonResponse(200, { data: active });
    return jsonResponse(200, { data: challenges });
  });
}
