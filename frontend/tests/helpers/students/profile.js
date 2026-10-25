import { screen } from '@testing-library/react';
import { resetAuthStore } from '../auth/authStore';
import { TRAINER, renderRoute, setSession } from '../routes/renderRoute';
import { stubStudents } from './students';

/** Sesión de entrenador + stub de la API + render de la ficha; espera al nombre en la topbar. */
export async function loadProfile({ path = '/pt/alumnos/st-1', detail, name = 'Ana Paz', ...stub }) {
  resetAuthStore();
  setSession(TRAINER);
  stubStudents({ detail, ...stub });
  const utils = renderRoute(path);
  await screen.findByRole('heading', { level: 1, name });
  return utils;
}
