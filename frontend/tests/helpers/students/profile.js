import { screen } from '@testing-library/react';
import { resetAuthStore } from '../auth/authStore';
import { calls } from '../shared/fetchMock';
import { TRAINER, renderRoute, setSession } from '../routes/renderRoute';
import { ATTENDANCE, attendanceResponse } from './attendance';
import { stubStudents } from './students';

/**
 * Sesión de entrenador + stub de la API + render de la ficha; espera al nombre en la topbar.
 * `attendance` contesta `/students/:id/attendance` (ver `attendanceResponse`); el resto va a `stubStudents`.
 */
export async function loadProfile({ path = '/pt/alumnos/st-1', detail, name = 'Ana Paz', attendance = ATTENDANCE, ...stub }) {
  resetAuthStore();
  setSession(TRAINER);
  const fetchMock = stubStudents({ detail, ...stub });
  const inner = fetchMock.getMockImplementation();
  fetchMock.mockImplementation(async (url, init) => attendanceResponse(url.replace(/^.*\/api/, ''), attendance) ?? inner(url, init));
  const utils = renderRoute(path);
  await screen.findByRole('heading', { level: 1, name });
  return { ...utils, fetchMock };
}

/** Llamadas `[path, init]` hechas con ese método. */
export const callsWith = (fetchMock, method) => calls(fetchMock).filter(([, init]) => init?.method === method);
