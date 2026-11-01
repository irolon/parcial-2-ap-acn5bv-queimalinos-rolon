import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentMetrics from '@/components/body-metrics/StudentMetrics';
import { calls } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/student/patience';
import { metric } from '../../../helpers/students/fixtures';
import { renderOwn, stubSelf } from '../../../helpers/students/self';

allowSlowScreens();

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const ONE = () => [metric({ id: 'm-st', recorded_at: '2026-10-05T12:00:00Z', recorded_by: 'student' })];
const metricsGets = (fetchMock) => calls(fetchMock).filter(([path]) => path === '/students/s-1/metrics');

function show(options) {
  const fetchMock = stubSelf(options);
  renderOwn(<StudentMetrics studentId="s-1" />);
  return fetchMock;
}

describe('StudentMetrics: carga, error y vacío', () => {
  it('mientras carga muestra el estado de carga y todavía no ofrece registrar', async () => {
    show({ metrics: () => new Promise(() => {}) });
    expect(await screen.findByRole('status')).toHaveTextContent('Cargando tus medidas…');
    expect(screen.queryByRole('button', { name: 'Registrar medición' })).toBeNull();
    expect(screen.queryByText(/Todavía no hay medidas/)).toBeNull();
  });

  it('si falla lo dice (no lo toma por "sin medidas") y Reintentar las vuelve a pedir', async () => {
    let attempts = 0;
    const fetchMock = show({ metrics: () => (attempts++ === 0 ? 500 : ONE()) });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('No pudimos cargar tus medidas.');
    expect(screen.queryByText(/Todavía no hay medidas/)).toBeNull();
    await userEvent.setup().click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('table', { name: 'Historial de medidas' })).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(metricsGets(fetchMock)).toHaveLength(2);
  });

  it('sin medidas invita a registrar la primera, con el botón, y no dibuja tarjetas vacías', async () => {
    show({ metrics: [] });
    expect(await screen.findByText('Todavía no hay medidas. Registrá la primera.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Registrar medición' })).toBeVisible();
    expect(screen.queryByText('Medidas actuales')).toBeNull();
    expect(screen.queryByText('Evolución del peso')).toBeNull();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('el botón del estado vacío abre el formulario de la medida', async () => {
    show({ metrics: [] });
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Registrar medición' }));
    expect(await screen.findByRole('dialog', { name: 'Registrar medición' })).toBeVisible();
  });
});
