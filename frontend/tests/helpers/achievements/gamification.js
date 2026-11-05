import { API_URL, jsonResponse, stubFetch } from '../shared/fetchMock';

export const STREAK = { current_streak_days: 6, longest_streak_days: 9, last_session_date: '2026-10-30' };

/** Un logro del catálogo con su avance, como lo devuelve `GET /students/:id/achievements/progress`. */
export const achievement = (name, overrides = {}) => ({
  id: `a-${name}`,
  code: name.toUpperCase(),
  name,
  description: `Descripción de ${name}`,
  category: 'milestone',
  icon_url: null,
  criteria_type: 'sessions_count',
  current: 0,
  target: 10,
  unlocked_at: null,
  ...overrides,
});

/** Un logro ya desbloqueado (el avance de un desbloqueado vale el objetivo). */
export const unlocked = (name, unlockedAt, overrides = {}) =>
  achievement(name, { unlocked_at: unlockedAt, current: 10, target: 10, ...overrides });

/** El progreso entero con el catálogo dado. */
export const progressOf = (achievements = []) => ({
  streak: STREAK,
  facts: { sessions_count: 3, longest_streak: 9, pr_sessions: 1, full_weeks: 0 },
  assigned_days: ['monday', 'thursday'],
  achievements,
});

/** Un desafío del alumno; `status` es active, completed, failed o abandoned. */
export const assignment = (id, name, status, extra = {}) => ({
  id,
  status,
  started_at: '2026-10-01T12:00:00Z',
  ends_at: '2026-10-31T12:00:00Z',
  current_progress: 3,
  goal_value: 12,
  progress_pct: 25,
  completed_at: null,
  challenge: { id, name, goal_type: 'sessions_count', goal_value: 12, duration_days: 30 },
  ...extra,
});

const ROUTES = [
  [/^\/students\/[^/]+\/streak$/, 'streak'],
  [/^\/students\/[^/]+\/achievements\/progress$/, 'progress'],
  [/^\/students\/[^/]+\/challenges$/, 'challenges'],
];

/** Lo que contestan las tres rutas si el test no pide otra cosa. */
export const DEFAULT_DATA = { streak: STREAK, progress: progressOf(), challenges: [] };

/**
 * La respuesta de las tres rutas de racha y logros de un alumno, o `null` si el path es otro. Cada valor de `data`
 * (`streak`, `progress` y `challenges`) es el dato (200) o una función que devuelve la Response, para simular un
 * error o una espera.
 */
export function gamificationResponse(path, data = {}) {
  const found = ROUTES.find(([pattern]) => pattern.test(path));
  if (!found) return null;
  const value = { ...DEFAULT_DATA, ...data }[found[1]];
  return typeof value === 'function' ? value() : jsonResponse(200, { data: value });
}

/** Stub de `fetch` con solo esas tres rutas; cualquier otra da 500, así un pedido de más se ve como error. */
export function stubGamification(data) {
  return stubFetch(
    async (url) =>
      gamificationResponse(url.replace(API_URL, ''), data) ??
      jsonResponse(500, { error: { code: 'INTERNAL', message: 'Sin handler' } }),
  );
}
