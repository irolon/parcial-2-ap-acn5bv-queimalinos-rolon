import { jsonResponse, stubFetch } from '../shared/fetchMock';

export const challenge = (overrides = {}) => ({
  id: 'c-1', trainer_id: 't-1', name: 'Mes de fuerza', description: null, goal_type: 'sessions_count', goal_value: 12,
  duration_days: 30, reward_achievement_id: null, assignments_count: 0, active_count: 0, ...overrides,
});

/** Stub de `/challenges`: `challenges` para el GET y `remove(init, url)` para el DELETE. */
export function stubChallengesApi({ challenges = [], remove } = {}) {
  return stubFetch(async (url, init = {}) => {
    const method = init.method ?? 'GET';
    if (method === 'DELETE') return remove(init, url);
    return jsonResponse(200, { data: challenges });
  });
}
