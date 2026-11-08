import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { currentMonth } from '@/utils/students/commitment';
import { gamificationResponse } from '../../../helpers/achievements/gamification';
import { resetAuthStore } from '../../../helpers/auth/authStore';
import { BODY, progressUrls, stubProgress } from '../../../helpers/progress/progress';
import { STUDENT, renderRoute, setSession } from '../../../helpers/routes/renderRoute';
import { calls } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/shared/patience';

vi.mock('recharts', async (importOriginal) => {
  const { cloneElement } = await import('react');
  return {
    ...(await importOriginal()),
    ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 240 }),
  };
});

allowSlowScreens();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function load(stub) {
  resetAuthStore();
  setSession(STUDENT);
  const fetchMock = stubProgress({ body: BODY, ...stub, otherwise: (path) => gamificationResponse(path) });
  renderRoute('/alumno/progreso');
  return fetchMock;
}

const kpi = (label) => within(screen.getByText(label).closest('div[class*="rounded-xl"]'));

describe('MyProgressPage: indicadores', () => {
  it('pide la asistencia del mes del propio alumno y muestra los 4 indicadores', async () => {
    const fetchMock = load();
    await screen.findByText('Sesiones del mes');
    expect(kpi('Sesiones del mes').getByText('/9')).toBeVisible();
    expect(kpi('Racha').getByText('Tu mejor racha: 9 días')).toBeVisible();
    expect(kpi('Récords del mes').getByText('2')).toBeVisible();
    expect(screen.getByText('Volumen · 4 semanas')).toBeVisible();
    const paths = calls(fetchMock).map(([path]) => path);
    expect(paths).toContain(`/students/s-1/attendance?month=${currentMonth()}`);
    expect(progressUrls(fetchMock, 'overview').some((p) => /student_id=s-1&from=.*&to=/.test(p))).toBe(true);
  });

  it('los indicadores van arriba del panel de progreso', async () => {
    load();
    const chart = await screen.findByRole('img', { name: 'Progresión de Press banca' });
    const kpis = await screen.findByText('Sesiones del mes');
    expect(kpis.compareDocumentPosition(chart) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('sin entrenamientos los indicadores se ven en 0 y el estado vacío sigue siendo el del panel', async () => {
    load({ overview: { exercises: [], weekly_volume: [] }, attendance: { month: '2026-11', sessions: 0, assigned_days: 3, prs: 0, days: [] } });
    expect(await screen.findByText('Todavía no hay entrenamientos registrados')).toBeInTheDocument();
    await screen.findByText('Sesiones del mes');
    expect(kpi('Sesiones del mes').getByText('0')).toBeVisible();
    expect(screen.getByText('Todavía ninguno este mes')).toBeVisible();
  });
});
