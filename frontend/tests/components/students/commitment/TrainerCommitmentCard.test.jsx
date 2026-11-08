import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import TrainerCommitmentCard from '@/components/students/commitment/TrainerCommitmentCard';
import { currentMonth, monthName } from '@/utils/students/commitment';
import { renderWithQuery } from '../../../helpers/progress/progress';
import { sessionItem, sessionsPage } from '../../../helpers/sessions/sessions';
import { ATTENDANCE, stubCommitment } from '../../../helpers/students/attendance';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const NOW = new Date().toISOString();
const withRpe = (rpes, options) =>
  sessionsPage(rpes.map((rpe, i) => sessionItem({ id: `s-${i}`, started_at: NOW, finished_at: NOW, rpe })), options);

/** La tarjeta del indicador con ese rótulo. */
const kpi = (label) => within(screen.getByText(label).closest('div[class*="rounded-xl"]'));

function load(stub = {}) {
  stubCommitment({ sessions: withRpe([8, 7, 7, 8, 7]), ...stub });
  renderWithQuery(<TrainerCommitmentCard studentId="st-1" />);
}

describe('TrainerCommitmentCard', () => {
  it('muestra el compromiso del mes: sesiones sobre planificadas, racha, RPE promedio y récords', async () => {
    load();
    const card = screen.getByRole('region', { name: `Compromiso · ${monthName(currentMonth())}` });
    expect(within(card).getByRole('status')).toHaveTextContent('Cargando indicadores…');
    await screen.findByText('Sesiones del mes');
    expect(kpi('Sesiones del mes').getByText('6/9')).toBeVisible();
    expect(kpi('Sesiones del mes').getByText('sobre planificadas')).toBeVisible();
    expect(kpi('Racha').getByText('6')).toBeVisible();
    expect(kpi('Racha').getByText('Mejor: 9')).toBeVisible();
    expect(await kpi('RPE promedio').findByText('7,4')).toBeVisible();
    expect(kpi('RPE promedio').getByText('de 5 sesiones')).toBeVisible();
    expect(kpi('Récords').getByText('2')).toBeVisible();
    expect(kpi('Récords').getByText('este mes')).toBeVisible();
  });

  it('sin RPE cargado muestra una raya y lo aclara', async () => {
    load({ sessions: withRpe([null, null]) });
    expect(await screen.findByText('Sin RPE cargado')).toBeVisible();
    expect(kpi('RPE promedio').getByText('—')).toBeVisible();
  });

  it('con más de 20 sesiones en el mes aclara que el promedio es de las últimas 20', async () => {
    load({ sessions: withRpe(Array(20).fill(7), { totalPages: 2, total: 25 }) });
    expect(await screen.findByText('de 20 sesiones')).toBeVisible();
    expect(kpi('RPE promedio').getByText('Promedio de las últimas 20 sesiones del mes')).toBeVisible();
  });

  it('sin días planificados no muestra "/0": deja las sesiones y aclara que no hay plan', async () => {
    load({ attendance: { ...ATTENDANCE, sessions: 6, assigned_days: 0 } });
    await screen.findByText('Sesiones del mes');
    expect(kpi('Sesiones del mes').getByText('6')).toBeVisible();
    expect(kpi('Sesiones del mes').getByText('Sin plan este mes')).toBeVisible();
    expect(screen.queryByText(/\/0/)).toBeNull();
    expect(screen.queryByText('sobre planificadas')).toBeNull();
  });

  it('mientras carga el historial el RPE dice "Cargando…", no una raya como si hubiera fallado', async () => {
    stubCommitment();
    const answered = globalThis.fetch;
    vi.stubGlobal('fetch', (url, init) => (String(url).includes('/sessions?') ? new Promise(() => {}) : answered(url, init)));
    renderWithQuery(<TrainerCommitmentCard studentId="st-1" />);
    await screen.findByText('Sesiones del mes');
    expect(kpi('RPE promedio').getByText('Cargando…')).toBeVisible();
    expect(kpi('RPE promedio').queryByText('—')).toBeNull();
  });

  it('si falla el historial el RPE muestra una raya y "No disponible"', async () => {
    load({ sessions: 500 });
    expect(await screen.findByText('No disponible')).toBeVisible();
    expect(kpi('RPE promedio').getByText('—')).toBeVisible();
  });

  it('si falla la racha muestra el error del bloque', async () => {
    load({ streak: 500 });
    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos cargar los indicadores.');
  });
});
