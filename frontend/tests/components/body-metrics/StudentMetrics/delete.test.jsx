import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StudentMetrics from '@/components/body-metrics/StudentMetrics';
import { calls, errorResponse, jsonResponse } from '../../../helpers/shared/fetchMock';
import { allowSlowScreens } from '../../../helpers/shared/patience';
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

const BY_TRAINER = metric({ id: 'm-pt', recorded_at: '2026-09-05T12:00:00Z', weight_kg: 82, recorded_by: 'trainer' });
const BY_STUDENT = metric({ id: 'm-st', recorded_at: '2026-10-05T12:00:00Z', weight_kg: 80.5, recorded_by: 'student' });
const BODY_KEY = ['progress', 'body', 's-1'];
const DELETE_BUTTON = { name: 'Borrar medida del 05/10/2026' };
const deletes = (fetchMock) => calls(fetchMock).filter(([, init]) => init.method === 'DELETE');

// Un servidor que quita la medida del historial al borrarla (o responde lo que diga `fail`).
async function open({ rows = [BY_TRAINER, BY_STUDENT], fail } = {}) {
  let current = rows;
  const deleteMetric = async (init, path) => {
    if (fail) return fail();
    current = current.filter((row) => !path.endsWith(`/${row.id}`));
    return jsonResponse(204);
  };
  const user = userEvent.setup();
  const fetchMock = stubSelf({ metrics: () => current, deleteMetric });
  const utils = renderOwn(<StudentMetrics studentId="s-1" />);
  await user.click(await screen.findByRole('button', DELETE_BUTTON));
  return { user, fetchMock, ...utils, dialog: await screen.findByRole('dialog') };
}

const confirm = (user, dialog) => user.click(within(dialog).getByRole('button', { name: 'Borrar' }));

describe('StudentMetrics: borrar una medida propia', () => {
  it('pide confirmar con la fecha de la medida y no borra hasta que se confirma', async () => {
    const { fetchMock, dialog } = await open();
    expect(dialog).toHaveAccessibleName('¿Borrar la medida del 05/10/2026?');
    expect(deletes(fetchMock)).toHaveLength(0);
  });

  it('Cancelar no borra nada', async () => {
    const { user, fetchMock, dialog } = await open();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(deletes(fetchMock)).toHaveLength(0);
    expect(screen.getByRole('button', DELETE_BUTTON)).toBeVisible();
  });

  it('Borrar manda el DELETE de esa medida y refresca el historial sin ella', async () => {
    const { user, fetchMock, dialog } = await open();
    await confirm(user, dialog);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(deletes(fetchMock).map(([path]) => path)).toEqual(['/students/s-1/metrics/m-st']);
    const table = await screen.findByRole('table', { name: 'Historial de medidas' });
    await waitFor(() => expect(within(table).getAllByRole('row')).toHaveLength(2));
    expect(within(table).queryByText('05/10/2026')).toBeNull();
    expect(within(table).getByText('05/09/2026')).toBeVisible();
  });

  it('refresca también el progreso corporal de Mi progreso', async () => {
    const { user, dialog, queryClient } = await open();
    queryClient.setQueryData(BODY_KEY, { points: [], summary: {} });
    await confirm(user, dialog);
    await waitFor(() => expect(queryClient.getQueryState(BODY_KEY).isInvalidated).toBe(true));
  });

  it('borrar la única medida deja el estado vacío, con el botón para registrar otra', async () => {
    const { user, dialog } = await open({ rows: [BY_STUDENT] });
    await confirm(user, dialog);
    expect(await screen.findByText('Todavía no hay medidas. Registrá la primera.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Registrar medición' })).toBeVisible();
  });

  it('si el servidor no la borra, el diálogo queda abierto con el motivo y el historial sigue igual', async () => {
    const fail = () => errorResponse(500, 'INTERNAL', 'No pudimos borrar la medida');
    const { user, dialog } = await open({ fail });
    await confirm(user, dialog);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No pudimos borrar la medida');
    expect(screen.getByRole('dialog')).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(await screen.findByRole('button', DELETE_BUTTON)).toBeVisible();
  });
});
