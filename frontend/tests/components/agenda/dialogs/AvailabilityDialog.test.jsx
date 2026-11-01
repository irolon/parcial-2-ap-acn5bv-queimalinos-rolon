import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AvailabilityDialog from '@/components/agenda/dialogs/AvailabilityDialog';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

const SAVED = [{ weekday: 1, start_time: '08:00:00', end_time: '12:00:00' }];

function setup({ put } = {}) {
  const fetchMock = stubFetch(async (url, init) => {
    if (init?.method === 'PUT') return put ? put(init) : jsonResponse(200, { data: [] });
    return jsonResponse(200, { data: SAVED });
  });
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AvailabilityDialog open onClose={onClose} />
    </QueryClientProvider>,
  );
  return { fetchMock, onClose };
}

const puts = (fetchMock) => calls(fetchMock).filter(([, init]) => init?.method === 'PUT');

async function addSlot(user, day, from, to, position = 1) {
  await user.click(screen.getByRole('button', { name: `Agregar franja al ${day}` }));
  await user.selectOptions(screen.getByLabelText(`Desde, franja ${position} del ${day}`), from);
  await user.selectOptions(screen.getByLabelText(`Hasta, franja ${position} del ${day}`), to);
}

describe('AvailabilityDialog', () => {
  it('muestra las franjas guardadas en su día', async () => {
    setup();
    const monday = await screen.findByRole('region', { name: 'Lunes' });
    expect(within(monday).getByLabelText('Desde, franja 1 del lunes')).toHaveValue('8');
    expect(within(monday).getByLabelText('Hasta, franja 1 del lunes')).toHaveValue('12');
    expect(screen.getByRole('region', { name: 'Domingo' })).toBeInTheDocument();
  });

  it('quitar y guardar manda { slots } sin la franja', async () => {
    const user = userEvent.setup();
    const { fetchMock, onClose } = setup();
    await user.click(await screen.findByRole('button', { name: 'Quitar franja 08:00 a 12:00 del lunes' }));
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(bodyOf(puts(fetchMock)[0][1])).toEqual({ slots: [] });
  });

  it('agregar una franja y guardar manda HH:00', async () => {
    const user = userEvent.setup();
    const { fetchMock } = setup();
    await screen.findByLabelText('Desde, franja 1 del lunes');
    await addSlot(user, 'martes', '14:00', '18:00');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1));
    expect(bodyOf(puts(fetchMock)[0][1]).slots).toEqual([
      { weekday: 1, start_time: '08:00', end_time: '12:00' },
      { weekday: 2, start_time: '14:00', end_time: '18:00' },
    ]);
  });

  it('inicio igual al fin: error junto a la franja al guardar y no se guarda', async () => {
    const user = userEvent.setup();
    const { fetchMock } = setup();
    await screen.findByLabelText('Desde, franja 1 del lunes');
    await addSlot(user, 'jueves', '09:00', '09:00');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    const thursday = screen.getByRole('region', { name: 'Jueves' });
    expect(within(thursday).getByRole('alert')).toHaveTextContent('La hora de inicio tiene que ser anterior a la de fin');
    expect(puts(fetchMock)).toHaveLength(0);
  });

  it('editar una franja guardada con los selects', async () => {
    const user = userEvent.setup();
    const { fetchMock } = setup();
    await user.selectOptions(await screen.findByLabelText('Hasta, franja 1 del lunes'), '13:00');
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1));
    expect(bodyOf(puts(fetchMock)[0][1]).slots).toEqual([{ weekday: 1, start_time: '08:00', end_time: '13:00' }]);
  });

  it('agregar enfoca el Desde de la franja nueva y quitar devuelve el foco al "+ Agregar franja"', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByLabelText('Desde, franja 1 del lunes');
    await user.click(screen.getByRole('button', { name: 'Agregar franja al martes' }));
    expect(screen.getByLabelText('Desde, franja 1 del martes')).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Quitar franja 09:00 a 10:00 del martes' }));
    expect(screen.getByRole('button', { name: 'Agregar franja al martes' })).toHaveFocus();
  });

  it('reabrir arranca de nuevo desde lo guardado', async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    stubFetch(async () => jsonResponse(200, { data: SAVED }));
    const ui = (open) => (
      <QueryClientProvider client={client}>
        <AvailabilityDialog open={open} onClose={() => {}} />
      </QueryClientProvider>
    );
    const { rerender } = render(ui(true));
    await user.click(await screen.findByRole('button', { name: 'Quitar franja 08:00 a 12:00 del lunes' }));
    expect(screen.queryByLabelText('Desde, franja 1 del lunes')).not.toBeInTheDocument();
    rerender(ui(false));
    rerender(ui(true));
    expect(await screen.findByLabelText('Desde, franja 1 del lunes')).toHaveValue('8');
  });

  it('franjas superpuestas: error junto a la franja y no se guarda', async () => {
    const user = userEvent.setup();
    const { fetchMock } = setup();
    await screen.findByLabelText('Desde, franja 1 del lunes');
    await addSlot(user, 'lunes', '10:00', '14:00', 2);
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    expect(screen.getAllByText('La franja se superpone con otra del mismo día')).toHaveLength(2);
    expect(puts(fetchMock)).toHaveLength(0);
  });

  it('400 con details: el mensaje queda junto a la franja', async () => {
    const user = userEvent.setup();
    setup({
      put: async () =>
        errorResponse(400, 'VALIDATION_ERROR', 'Datos inválidos', [{ field: 'slots[0]', message: 'Franja rechazada' }]),
    });
    await user.click(await screen.findByRole('button', { name: 'Guardar' }));
    const monday = screen.getByRole('region', { name: 'Lunes' });
    expect(await within(monday).findByText('Franja rechazada')).toBeInTheDocument();
  });

  it('400 con details de campo (slots[0].end_time): queda junto a la franja', async () => {
    const user = userEvent.setup();
    setup({
      put: async () =>
        errorResponse(400, 'VALIDATION_ERROR', 'Datos inválidos', [{ field: 'slots[0].end_time', message: 'end_time inválido' }]),
    });
    await user.click(await screen.findByRole('button', { name: 'Guardar' }));
    const monday = screen.getByRole('region', { name: 'Lunes' });
    expect(await within(monday).findByText('end_time inválido')).toBeInTheDocument();
  });

  it('400 sin details mapeables: mensaje general y no cierra', async () => {
    const user = userEvent.setup();
    const { onClose } = setup({ put: async () => errorResponse(400, 'VALIDATION_ERROR', 'Datos inválidos') });
    await user.click(await screen.findByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Datos inválidos')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
