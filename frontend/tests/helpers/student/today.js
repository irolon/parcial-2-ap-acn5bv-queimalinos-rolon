import { vi } from 'vitest';
import { resetWorkoutStore } from '@/hooks/workout/workoutStore';
import { resetAuthStore } from '../auth/authStore';
import { STUDENT, renderRoute, setSession } from '../routes/renderRoute';
import { stubStudentHome } from './home';
import './patience';

/** Domingo 1/11/2026, 10:00 en Argentina: la semana de Hoy va del lunes 26/10 a hoy. */
export const SUNDAY = new Date('2026-11-01T13:00:00Z');

/** Un alumno que recién abre la web: sesión iniciada, sin entrenamiento en curso y con la fecha fija en `now`. */
export function signInStudent(now = SUNDAY) {
  resetAuthStore();
  setSession(STUDENT);
  resetWorkoutStore();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
}

/** Deshace lo que dejó `signInStudent` y el stub de fetch. */
export function cleanUpStudent() {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
}

/** Abre una página del alumno con las respuestas de `options` (ver `studentHomeRoute`). */
export function openStudent(path, options) {
  const fetchMock = stubStudentHome(options);
  return { fetchMock, ...renderRoute(path) };
}
