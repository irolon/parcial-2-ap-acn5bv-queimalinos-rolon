import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentMetrics from '@/components/body-metrics/StudentMetrics';
import { bodyOf, calls, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/student/patience';
import { metric } from '../../../helpers/students/fixtures';
import { renderOwn, stubSelf } from '../../../helpers/students/self';

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BY_TRAINER = metric({ id: 'm-pt', recorded_at: '2026-09-05T12:00:00Z', weight_kg: 82, recorded_by: 'trainer' });
const BODY_KEY = ['progress', 'body', 's-1'];
const POSTS = (fetchMock) => calls(fetchMock).filter(([, init]) => init.method === 'POST');
const metricsGets = (fetchMock) =>
  calls(fetchMock).filter(([path, init]) => init.method === 'GET' && path === '/students/s-1/metrics');

// El servidor guarda lo que le llega como medida del alumno y la devuelve en el historial.
function server(initial) {
  const rows = [...initial];
  const createMetric = vi.fn(async (init) => {
    const saved = metric({ ...bodyOf(init), recorded_by: 'student' });
    rows.push(saved);
    return jsonResponse(201, { data: saved });
  });
  return { rows, createMetric };
}

async function open({ rows = [BY_TRAINER], createMetric } = {}) {
  const user = userEvent.setup();
  const fetchMock = stubSelf({ metrics: () => rows, createMetric });
  const utils = renderOwn(<StudentMetrics studentId="s-1" />);
  await user.click(await screen.findByRole('button', { name: 'Registrar medición' }));
  return { user, fetchMock, ...utils, dialog: await screen.findByRole('dialog', { name: 'Cargar medida' }) };
}

const save = (user, dialog, weight) =>
  user
    .type(within(dialog).getByLabelText(/Peso/), weight)
    .then(() => user.click(within(dialog).getByRole('button', { name: 'Guardar' })));

describe('StudentMetrics: Registrar medición', () => {
  it('abre el formulario de la medida y Cancelar lo cierra sin mandar nada', async () => {
    const { user, fetchMock, dialog } = await open();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(POSTS(fetchMock)).toHaveLength(0);
  });

  it('guarda en la ruta del alumno, con id del cliente y sin decir quién la cargó', async () => {
    const { rows, createMetric } = server([BY_TRAINER]);
    const { user, fetchMock, dialog } = await open({ rows, createMetric });
    await save(user, dialog, '81');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    const [[path, init]] = POSTS(fetchMock);
    expect(path).toBe('/students/s-1/metrics');
    expect(bodyOf(init)).toMatchObject({ weight_kg: 81 });
    expect(bodyOf(init).id).toMatch(UUID);
    expect(Object.keys(bodyOf(init))).not.toContain('recorded_by');
  });

  it('refresca las medidas: vuelve a pedirlas y la nueva aparece, con su ✕ porque la cargó el alumno', async () => {
    const { rows, createMetric } = server([BY_TRAINER]);
    const { user, fetchMock, dialog } = await open({ rows, createMetric });
    await save(user, dialog, '81');
    const table = await screen.findByRole('table', { name: 'Historial de medidas' });
    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(3));
    expect(metricsGets(fetchMock)).toHaveLength(2);
    expect(within(table).getAllByRole('button', { name: /^Borrar medida/ })).toHaveLength(1);
  });

  it('refresca también el progreso corporal de Mi progreso', async () => {
    const { rows, createMetric } = server([BY_TRAINER]);
    const { user, dialog, queryClient } = await open({ rows, createMetric });
    queryClient.setQueryData(BODY_KEY, { points: [], summary: {} });
    expect(queryClient.getQueryState(BODY_KEY).isInvalidated).toBe(false);
    await save(user, dialog, '81');
    await waitFor(() => expect(queryClient.getQueryState(BODY_KEY).isInvalidated).toBe(true));
  });

  it('desde el estado vacío, la primera medida cambia la pantalla a medidas, gráfico e historial', async () => {
    const { rows, createMetric } = server([]);
    const user = userEvent.setup();
    stubSelf({ metrics: () => rows, createMetric });
    renderOwn(<StudentMetrics studentId="s-1" />);
    await user.click(await screen.findByRole('button', { name: 'Registrar medición' }));
    await save(user, await screen.findByRole('dialog', { name: 'Cargar medida' }), '79.5');
    expect(await screen.findByText('Medidas actuales')).toBeVisible();
    expect(screen.getByRole('table', { name: 'Historial de medidas' })).toBeVisible();
    expect(screen.queryByText('Todavía no hay medidas. Registrá la primera.')).toBeNull();
  });

  it('si el servidor la rechaza, el formulario queda abierto con el motivo y no cambia nada', async () => {
    const createMetric = async () => errorResponse(500, 'INTERNAL', 'No pudimos guardar la medida');
    const { user, dialog, queryClient } = await open({ createMetric });
    queryClient.setQueryData(BODY_KEY, { points: [], summary: {} });
    await save(user, dialog, '81');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No pudimos guardar la medida');
    expect(screen.getByRole('dialog', { name: 'Cargar medida' })).toBeVisible();
    expect(queryClient.getQueryState(BODY_KEY).isInvalidated).toBe(false);
  });
});
