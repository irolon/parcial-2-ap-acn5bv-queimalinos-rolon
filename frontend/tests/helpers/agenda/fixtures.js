import { vi } from 'vitest';

/** "Ahora" de los tests: miércoles 04/11/2026 12:00 en Argentina. */
export const NOW = '2026-11-04T15:00:00.000Z';

/** Congela solo `Date` (los timers de React Query y testing-library siguen reales). */
export const freezeNow = () => vi.useFakeTimers({ toFake: ['Date'], now: new Date(NOW) });

/** Semana del lunes 02/11 al domingo 08/11 de 2026 (hora de Argentina). */
export const WEEK = { from: '2026-11-02', to: '2026-11-08' };

/** Turno: por defecto el viernes 06/11 a las 18:00 (21:00 UTC), pendiente. */
export const appt = (overrides = {}) => ({
  id: 'a-1',
  trainer_id: 't-1',
  student: { id: 's-1', name: 'Lucía QA', avatar_url: null },
  scheduled_at: '2026-11-06T21:00:00.000Z',
  duration_min: 60,
  status: 'pending',
  notes: null,
  created_at: '2026-11-01T12:00:00.000Z',
  ...overrides,
});

/** Lunes a viernes de 09:00 a 13:00. */
export const AVAILABILITY = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start_time: '09:00', end_time: '13:00' }));
