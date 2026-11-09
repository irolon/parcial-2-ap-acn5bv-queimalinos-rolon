import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentProgressKpis from '@/components/students/commitment/StudentProgressKpis';
import { STREAK } from '../../../helpers/achievements/gamification';
import { renderWithQuery } from '../../../helpers/progress/progress';
import { ATTENDANCE, stubCommitment } from '../../../helpers/students/attendance';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const weeks = (volumes) => volumes.map((v, i) => ({ week_start: `2026-09-${10 + i}`, volume_kg: v, sessions: 1 }));
const OVERVIEW = { exercises: [], weekly_volume: weeks([1000, 1000, 1000, 1000, 1200, 1000, 1000, 1160]) };

/** La tarjeta del indicador con ese rótulo. */
const kpi = (label) => within(screen.getByText(label).closest('div[class*="rounded-xl"]'));

function load(stub = {}) {
  const fetchMock = stubCommitment({ overview: OVERVIEW, ...stub });
  renderWithQuery(<StudentProgressKpis studentId="s-1" />);
  return fetchMock;
}

describe('StudentProgressKpis', () => {
  it('muestra sesiones del mes, racha, récords y volumen de 4 semanas con su contexto', async () => {
    load();
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tus indicadores…');
    await screen.findByText('Sesiones del mes');
    expect(kpi('Sesiones del mes').getByText('6')).toBeVisible();
    expect(kpi('Sesiones del mes').getByText('/9')).toBeVisible();
    expect(kpi('Sesiones del mes').getByText('de 9 días planificados')).toBeVisible();
    expect(kpi('Racha').getByText('6')).toBeVisible();
    expect(kpi('Racha').getByText('días')).toBeVisible();
    expect(kpi('Racha').getByText('Tu mejor racha: 9 días')).toBeVisible();
    expect(kpi('Récords del mes').getByText('2')).toBeVisible();
    expect(kpi('Récords del mes').getByText('sesiones con récord')).toBeVisible();
    expect(await kpi('Volumen · 4 semanas').findByText('4,4 t')).toBeVisible();
    expect(kpi('Volumen · 4 semanas').getByText('+9% vs. las 4 semanas anteriores')).toHaveClass('text-good');
  });

  it('sin días planificados dice "Sin plan este mes" y no muestra la unidad', async () => {
    load({ attendance: { ...ATTENDANCE, sessions: 1, assigned_days: 0 } });
    expect(await screen.findByText('Sin plan este mes')).toBeVisible();
    expect(screen.queryByText('/0')).toBeNull();
  });

  it('con racha y récords en 0 invita a arrancar', async () => {
    load({
      attendance: { ...ATTENDANCE, prs: 0 },
      streak: { ...STREAK, current_streak_days: 0 },
      overview: { exercises: [], weekly_volume: weeks([0, 0, 0, 0, 500, 0, 0, 0]) },
    });
    expect(await screen.findByText('Arrancá hoy')).toBeVisible();
    expect(screen.getByText('Todavía ninguno este mes')).toBeVisible();
    expect(await kpi('Volumen · 4 semanas').findByText('500 kg')).toBeVisible();
    expect(screen.queryByText(/vs\. las 4 semanas anteriores/)).toBeNull();
  });

  it('una baja de volumen se marca en coral', async () => {
    load({ overview: { exercises: [], weekly_volume: weeks([1000, 1000, 1000, 1000, 500, 500, 500, 500]) } });
    expect(await screen.findByText('−50% vs. las 4 semanas anteriores')).toHaveClass('text-hot');
  });

  it('si falla la asistencia muestra el error y Reintentar la vuelve a pedir', async () => {
    const user = userEvent.setup();
    let fail = true;
    const fetchMock = load({ attendance: () => (fail ? 500 : ATTENDANCE) });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos cargar los indicadores.');
    fail = false;
    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('de 9 días planificados')).toBeVisible();
    const streakCalls = fetchMock.mock.calls.filter(([url]) => url.endsWith('/streak'));
    expect(streakCalls).toHaveLength(1);
  });

  it('si falla solo el overview, el volumen queda en raya y el resto se ve', async () => {
    load({ overview: 500 });
    await screen.findByText('Sesiones del mes');
    await waitFor(() => expect(kpi('Volumen · 4 semanas').getByText('—')).toBeVisible());
    expect(kpi('Sesiones del mes').getByText('6')).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
