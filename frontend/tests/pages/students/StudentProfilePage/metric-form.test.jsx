import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { bodyOf, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { metric, studentDetail } from '../../../helpers/students/fixtures';
import { callsWith, loadProfile } from '../../../helpers/students/profile';

vi.mock('recharts', async (importOriginal) => {
  const { cloneElement } = await import('react');
  return {
    ...(await importOriginal()),
    ResponsiveContainer: ({ children }) => cloneElement(children, { width: 600, height: 240 }),
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const created = () => jsonResponse(201, { data: metric() });

// La talla se precarga del historial: la última no nula, aunque la medida más nueva no la tenga.
const HISTORY = () => [
  metric({ recorded_at: '2026-09-01T10:00:00Z', height_cm: 178 }),
  metric({ recorded_at: '2026-10-01T10:00:00Z', height_cm: null }),
];

async function open(user, stub = {}) {
  const detail = studentDetail({ latest_metrics: metric({ height_cm: null }) });
  const ctx = await loadProfile({ detail, metrics: HISTORY(), ...stub });
  await screen.findByRole('table', { name: 'Historial de medidas' });
  await user.click(await screen.findByRole('button', { name: 'Cargar medida' }));
  return { ...ctx, dialog: await screen.findByRole('dialog', { name: 'Cargar medida' }) };
}

describe('StudentProfilePage: cargar medida', () => {
  it('manda números, recorded_at con zona e id UUID; la talla viene precargada', async () => {
    const user = userEvent.setup();
    const createMetric = vi.fn(async () => created());
    const { fetchMock, dialog } = await open(user, { handlers: { createMetric } });
    expect(within(dialog).getByLabelText(/Talla/)).toHaveValue(178);
    await user.type(within(dialog).getByLabelText(/Peso/), '80.5');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const posts = callsWith(fetchMock, 'POST');
    expect(posts).toHaveLength(1);
    expect(posts[0][0]).toBe('/students/st-1/metrics');
    const body = bodyOf(posts[0][1]);
    expect(body).toMatchObject({ weight_kg: 80.5, height_cm: 178 });
    expect(body.id).toMatch(UUID);
    expect(body.recorded_at).toMatch(/Z$/);
  });

  it('el doble click manda un solo POST y el reintento tras un error de red reusa el mismo id', async () => {
    const user = userEvent.setup();
    let fail;
    const createMetric = vi.fn(async () => {
      if (!fail) return new Promise((_, reject) => (fail = () => reject(new TypeError('Failed to fetch'))));
      return created();
    });
    const { fetchMock, dialog } = await open(user, { handlers: { createMetric } });
    await user.type(within(dialog).getByLabelText(/Peso/), '80');
    const save = within(dialog).getByRole('button', { name: 'Guardar' });
    await user.dblClick(save);
    await waitFor(() => expect(callsWith(fetchMock, 'POST')).toHaveLength(1));
    fail();
    expect(await within(dialog).findByRole('alert')).toBeVisible();
    expect(callsWith(fetchMock, 'POST')).toHaveLength(1);
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    const posts = callsWith(fetchMock, 'POST');
    expect(posts).toHaveLength(2);
    expect(bodyOf(posts[1][1]).id).toBe(bodyOf(posts[0][1]).id);
  });

  it('valida: al menos una medida y % grasa hasta 100, sin pedir nada', async () => {
    const user = userEvent.setup();
    const { fetchMock, dialog } = await open(user);
    await user.clear(within(dialog).getByLabelText(/Talla/));
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText('Cargá al menos una medida')).toBeVisible();
    await user.type(within(dialog).getByLabelText(/grasa/), '101');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText('Tiene que ser como máximo 100')).toBeVisible();
    expect(callsWith(fetchMock, 'POST')).toHaveLength(0);
  });

  it('un 400 del backend va al campo', async () => {
    const user = userEvent.setup();
    const createMetric = vi.fn(async () =>
      errorResponse(400, 'VALIDATION_ERROR', 'inválido', [{ field: 'weight_kg', message: 'Peso fuera de rango' }]),
    );
    const { dialog } = await open(user, { handlers: { createMetric } });
    await user.type(within(dialog).getByLabelText(/Peso/), '80');
    await user.click(within(dialog).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialog).findByText('Peso fuera de rango')).toBeVisible();
  });
});
