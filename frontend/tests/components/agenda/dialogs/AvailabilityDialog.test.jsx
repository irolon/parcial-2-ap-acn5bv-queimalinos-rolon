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

async function addSlot(user, day, from, to) {
  await user.click(screen.getByRole('button', { name: `Agregar franja al ${day}` }));
  await user.selectOptions(screen.getByLabelText(`Desde (${day})`), from);
  await user.selectOptions(screen.getByLabelText(`Hasta (${day})`), to);
  await user.click(screen.getByRole('button', { name: `Agregar franja del ${day}` }));
}

describe('AvailabilityDialog', () => {
  it('muestra las franjas guardadas en su día', async () => {
    setup();
    const monday = await screen.findByRole('region', { name: 'Lunes' });
    expect(within(monday).getByText('08:00 – 12:00')).toBeInTheDocument();
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
    await screen.findByText('08:00 – 12:00');
    await addSlot(user, 'martes', '14:00', '18:00');
    expect(screen.getByText('14:00 – 18:00')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(puts(fetchMock)).toHaveLength(1));
    expect(bodyOf(puts(fetchMock)[0][1]).slots).toEqual([
      { weekday: 1, start_time: '08:00', end_time: '12:00' },
      { weekday: 2, start_time: '14:00', end_time: '18:00' },
    ]);
  });

  it('inicio igual o posterior al fin no se agrega y muestra el mensaje', async () => {
    const user = userEvent.setup();
    setup();
    await screen.findByText('08:00 – 12:00');
    await addSlot(user, 'jueves', '09:00', '09:00');
    expect(screen.getByRole('alert')).toHaveTextContent('La hora de inicio tiene que ser anterior a la de fin');
  });

  it('franjas superpuestas: error junto a la franja y no se guarda', async () => {
    const user = userEvent.setup();
    const { fetchMock } = setup();
    await screen.findByText('08:00 – 12:00');
    await addSlot(user, 'lunes', '10:00', '14:00');
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

  it('400 sin details mapeables: mensaje general y no cierra', async () => {
    const user = userEvent.setup();
    const { onClose } = setup({ put: async () => errorResponse(400, 'VALIDATION_ERROR', 'Datos inválidos') });
    await user.click(await screen.findByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Datos inválidos')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
