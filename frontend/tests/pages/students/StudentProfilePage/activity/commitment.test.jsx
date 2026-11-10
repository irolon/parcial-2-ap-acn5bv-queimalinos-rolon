import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { currentMonth, monthName } from '@/utils/students/commitment';
import { sessionItem, sessionsPage } from '../../../../helpers/sessions/sessions';
import { calls } from '../../../../helpers/shared/fetchMock';
import { studentDetail } from '../../../../helpers/students/fixtures';
import { loadProfile } from '../../../../helpers/students/profile';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const NOW = new Date().toISOString();

describe('StudentProfilePage: compromiso del mes', () => {
  it('pide la asistencia del alumno de la URL y muestra sesiones sobre planificadas, racha, RPE y récords', async () => {
    const { fetchMock } = await loadProfile({
      detail: studentDetail({ id: 'st-1' }),
      sessions: sessionsPage([sessionItem({ started_at: NOW, finished_at: NOW, rpe: 8 })]),
    });
    const card = within(screen.getByRole('region', { name: `Compromiso · ${monthName(currentMonth())}` }));
    expect(await card.findByText('6/9')).toBeVisible();
    expect(await card.findByText('de 1 sesión')).toBeVisible();
    expect(card.getByText('8')).toBeVisible();
    const paths = calls(fetchMock).map(([path]) => path);
    expect(paths).toContain(`/students/st-1/attendance?month=${currentMonth()}`);
  });

  it('comparte la caché del historial de sesiones: un solo GET a /sessions', async () => {
    const { fetchMock } = await loadProfile({
      detail: studentDetail({ id: 'st-1' }),
      sessions: sessionsPage([sessionItem({ started_at: NOW, finished_at: NOW })]),
    });
    expect(await screen.findByText('Push · día 3')).toBeVisible();
    await screen.findByText('de 1 sesión');
    const sessionCalls = calls(fetchMock).filter(([path]) => /^\/students\/st-1\/sessions\?/.test(path));
    expect(sessionCalls).toHaveLength(1);
  });

  it('si falla la asistencia, el resto de la ficha se ve igual', async () => {
    await loadProfile({ detail: studentDetail({ id: 'st-1' }), attendance: 500 });
    expect(await screen.findByText('No pudimos cargar los indicadores.')).toBeVisible();
    expect(await screen.findByText('Todavía no entrenó')).toBeVisible();
  });
});
