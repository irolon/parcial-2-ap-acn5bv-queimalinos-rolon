import { StrictMode } from 'react';
import { vi } from 'vitest';
import { screen } from '@testing-library/react';
import { resetWorkoutStore } from '@/hooks/workout/workoutStore';
import WorkoutPage from '@/pages/student/WorkoutPage';
import { saveWorkout } from '@/utils/workout/workoutStorage';
import { resetAuthStore } from '../auth/authStore';
import { STUDENT, setSession } from '../routes/renderRoute';
import { renderAt } from './router';
import { freshWorkout } from './workout';

export const STUDENT_ID = STUDENT.id;
export const MINUS = '−';

/** Deja el navegador como al cargar la página: alumno con sesión iniciada y `workout` (o nada) en localStorage. */
function prepareBrowser(workout) {
  resetAuthStore();
  setSession(STUDENT);
  localStorage.clear();
  resetWorkoutStore();
  if (workout) saveWorkout(STUDENT_ID, workout);
}

/**
 * Entra a /alumno/entrenar con `workout` en curso (por defecto, recién empezado) o sin ninguno (`null`).
 * Con `strict` monta la página en StrictMode, como en desarrollo (los efectos corren dos veces).
 */
export function renderWorkoutPage({ workout = freshWorkout(), strict = false } = {}) {
  prepareBrowser(workout);
  return renderAt(strict ? <StrictMode><WorkoutPage /></StrictMode> : <WorkoutPage />);
}

/** Recarga la página: se desmonta la anterior y la memoria queda vacía, así que lo único que sobrevive es localStorage. */
export function reloadWorkoutPage(previous) {
  previous.unmount();
  resetWorkoutStore();
  return renderAt(<WorkoutPage />);
}

/** Vuelve todo a cero entre tests. */
export function cleanUpBrowser() {
  localStorage.clear();
  resetWorkoutStore();
  resetAuthStore();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
}

/** Lo que quedó guardado en el navegador (o null). */
export const stored = () => JSON.parse(localStorage.getItem(`ft.workout.${STUDENT_ID}`));

// Los controles de la sesión activa.
export const registerButton = () => screen.getByRole('button', { name: 'Registrar serie' });
export const finishButton = () => screen.getByRole('button', { name: 'Terminar' });
