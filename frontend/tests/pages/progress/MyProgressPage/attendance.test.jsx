import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { currentMonth, monthName } from '@/utils/students/commitment';
import { shiftMonth } from '@/utils/students/attendanceCalendar';
import { gamificationResponse } from '../../../helpers/achievements/gamification';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { BODY, stubProgress } from '../../../helpers/progress/progress';
import { STUDENT, renderRoute, setSession } from '../../../helpers/routes/renderRoute';
import { calls, jsonResponse } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/shared/patience';
import { selfDetail } from '../../../helpers/students/self';

vi.mock('recharts', async (importOriginal) => (await import('../../../helpers/progress/recharts')).mockRecharts(importOriginal));

allowSlowScreens();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const CURRENT = currentMonth();
const PREV = shiftMonth(CURRENT, -1);

function load() {
  resetAuthStore();
  setSession(STUDENT);
  const profile = selfDetail({ created_at: `${PREV}-10T12:00:00Z` });
  const otherwise = (path) => (path === '/students/s-1' ? jsonResponse(200, { data: profile }) : gamificationResponse(path));
  const attendance = () => ({ month: CURRENT, sessions: 6, assigned_days: 9, prs: 2, days: [{ date: `${CURRENT}-01`, status: 'trained' }] });
  const fetchMock = stubProgress({ body: BODY, attendance, otherwise });
  renderRoute('/alumno/progreso');
  return fetchMock;
}

describe('MyProgressPage: calendario de asistencia', () => {
  it('va después de la comparada y el detalle, y antes del panel', async () => {
    load();
    const title = await screen.findByText(`Asistencia · ${monthName(CURRENT)}`);
    const detail = await screen.findByText('Por ejercicio');
    const panel = await screen.findByRole('img', { name: 'Progresión de Press banca' });
    expect(await screen.findByRole('img', { name: '1, entrenó' })).toBeInTheDocument();
    expect(detail.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('navega hasta el mes del alta del propio alumno', async () => {
    const fetchMock = load();
    await screen.findByText(`Asistencia · ${monthName(CURRENT)}`);
    const prev = screen.getByRole('button', { name: 'Mes anterior' });
    await waitFor(() => expect(prev).toBeEnabled());
    fireEvent.click(prev);
    expect(await screen.findByText(new RegExp(`^Asistencia · ${monthName(PREV)}`))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();
    expect(calls(fetchMock).map(([p]) => p)).toContain(`/students/s-1/attendance?month=${PREV}`);
  });
});
