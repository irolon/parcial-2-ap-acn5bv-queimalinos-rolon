import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import MyProfilePage from '@/pages/student/MyProfilePage';
import { calls } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/shared/patience';
import { metric } from '../../../helpers/students/fixtures';
import { renderOwn, selfDetail, signInSelf, stubSelf } from '../../../helpers/students/self';

vi.mock('recharts', async (importOriginal) => {
  const { cloneElement } = await import('react');
  return {
    ...(await importOriginal()),
    ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 240 }),
  };
});

allowSlowScreens();

beforeEach(signInSelf);
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const ROUTINE = { id: 'r-1', name: 'Push/Pull', days: ['monday', 'thursday'] };
const METRICS = [
  metric({ id: 'm-pt', recorded_at: '2026-09-05T12:00:00Z', weight_kg: 82, recorded_by: 'trainer' }),
  metric({ id: 'm-st', recorded_at: '2026-10-05T12:00:00Z', weight_kg: 80.5, recorded_by: 'student' }),
];

function show(options = {}) {
  const fetchMock = stubSelf({ profile: selfDetail({ active_routine: ROUTINE }), metrics: METRICS, ...options });
  renderOwn(<MyProfilePage />);
  return fetchMock;
}

const precedes = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('MyProfilePage: lo que se ve', () => {
  it('junta los datos, la rutina activa y las medidas del alumno, en ese orden', async () => {
    show();
    const name = await screen.findByRole('heading', { level: 2, name: 'Tomás Ruiz' });
    expect(screen.getByText('tomas@fit.com')).toBeVisible();
    expect(screen.getByText('Objetivo').nextElementSibling).toHaveTextContent('Ganar masa muscular');
    expect(screen.getByText('Nivel').nextElementSibling).toHaveTextContent('Intermedio');
    expect(screen.getByText('Para cambiar tus datos, hablá con tu entrenador')).toBeVisible();
    const routine = screen.getByText('Rutina activa');
    expect(screen.getByText('Push/Pull')).toBeVisible();
    expect(screen.getByText('Lunes · Jueves')).toBeVisible();
    const current = await screen.findByText('Medidas actuales');
    const chart = await screen.findByRole('img', { name: 'Evolución del peso' });
    const history = screen.getByRole('table', { name: 'Historial de medidas' });
    expect([name, routine, current, chart, history].every((el, i, all) => !all[i + 1] || precedes(el, all[i + 1]))).toBe(true);
  });

  it('sin rutina asignada lo dice en la tarjeta de la rutina', async () => {
    show({ profile: selfDetail({ active_routine: null }) });
    expect(await screen.findByText('Rutina activa')).toBeVisible();
    expect(screen.getByText('Sin rutina asignada')).toBeVisible();
  });

  it('sin medidas invita a registrar la primera y la ficha se ve igual', async () => {
    show({ metrics: [] });
    expect(await screen.findByText('Todavía no hay medidas. Registrá la primera.')).toBeVisible();
    expect(screen.getByRole('heading', { level: 2, name: 'Tomás Ruiz' })).toBeVisible();
  });
});

describe('MyProfilePage: sin acciones del entrenador', () => {
  it('las únicas acciones son Registrar medición y borrar las medidas que cargó el alumno', async () => {
    show();
    await screen.findByRole('table', { name: 'Historial de medidas' });
    const names = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? button.textContent);
    expect(names.sort()).toEqual(['Borrar medida del 05/10/2026', 'Registrar medición']);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('solo pide datos del propio alumno y no manda nada que cambie su ficha', async () => {
    const fetchMock = show();
    await screen.findByRole('table', { name: 'Historial de medidas' });
    expect(calls(fetchMock).every(([, init]) => init.method === 'GET')).toBe(true);
    expect(calls(fetchMock).map(([path]) => path).sort()).toEqual(['/students/s-1', '/students/s-1/metrics']);
  });
});
