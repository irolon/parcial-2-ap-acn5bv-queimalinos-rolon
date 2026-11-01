import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { jsonResponse, stubFetch } from '../shared/fetchMock';

export const EXERCISES = [
  { id: 'ex-1', name: 'Press banca', muscle_group: 'pecho', days: 6, last_date: '2026-10-27' },
  { id: 'ex-2', name: 'Dominadas', muscle_group: 'espalda', days: 4, last_date: '2026-10-20' },
];

export const WEEKS = [
  { week_start: '2026-10-05', volume_kg: 3000, sessions: 2 },
  { week_start: '2026-10-12', volume_kg: 4000, sessions: 3 },
  { week_start: '2026-10-19', volume_kg: 5000, sessions: 3 },
];

export const OVERVIEW = { exercises: EXERCISES, weekly_volume: WEEKS };

const point = (day, kg, extra = {}) => ({
  date: `2026-10-${String(day).padStart(2, '0')}`,
  max_kg: kg,
  volume_kg: kg * 10,
  e1rm_kg: kg + 10,
  sets: 3,
  reps: 30,
  ...extra,
});

/** Respuesta de `/progress/exercise/:id`: con kg (default e1rm_kg) o de peso corporal (default reps). */
export function exerciseData(id, { bodyweight = false } = {}) {
  const days = [1, 5, 10, 15];
  const points = days.map((d, i) => (bodyweight ? point(d, 0, { e1rm_kg: null, volume_kg: 0, reps: 8 + i }) : point(d, 80 + i)));
  return {
    exercise: { id, name: bodyweight ? 'Dominadas' : 'Press banca', muscle_group: 'x' },
    points,
    pr: bodyweight ? { max_kg: null, e1rm_kg: null } : { max_kg: { value: 83, date: '2026-10-15' }, e1rm_kg: { value: 93, date: '2026-10-15' } },
    default_metric: bodyweight ? 'reps' : 'e1rm_kg',
  };
}

export const BODY = {
  points: [
    { recorded_at: '2026-09-01T12:00:00Z', weight_kg: 82, body_fat_pct: 22, waist_cm: 95 },
    { recorded_at: '2026-10-01T12:00:00Z', weight_kg: 80, body_fat_pct: 20, waist_cm: 92 },
  ],
  summary: {
    weight_kg: { first: 82, last: 80, delta: -2 },
    body_fat_pct: { first: 22, last: 20, delta: -2 },
    waist_cm: { first: 95, last: 92, delta: -3 },
  },
};

export const EMPTY_BODY = { points: [], summary: { weight_kg: null, body_fat_pct: null, waist_cm: null } };

/**
 * Stub de `/progress/*`; `exercise` es `(id) => data`. Lo que no es de `/progress` lo contesta `otherwise(path)`
 * (una Response, o `null` para pasar) y, si nadie lo contesta, da 500.
 */
export function stubProgress({ overview = OVERVIEW, exercise = exerciseData, body = EMPTY_BODY, otherwise } = {}) {
  return stubFetch(async (url) => {
    const path = url.replace(/^.*\/api/, '');
    if (path.startsWith('/progress/overview')) return jsonResponse(200, { data: overview });
    if (path.startsWith('/progress/body/')) return jsonResponse(200, { data: body });
    const match = /^\/progress\/exercise\/([^/?]+)/.exec(path);
    if (match) return jsonResponse(200, { data: exercise(match[1]) });
    return otherwise?.(path) ?? jsonResponse(500, { error: { code: 'INTERNAL', message: 'Sin handler' } });
  });
}

/** URLs (sin la base) de los GET a `/progress/<tipo>`. */
export const progressUrls = (fetchMock, kind) =>
  fetchMock.mock.calls.map(([url]) => url.replace(/^.*\/api/, '')).filter((p) => p.startsWith(`/progress/${kind}`));

/** Render de un componente con QueryClient nuevo. */
export function renderWithQuery(ui) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}
