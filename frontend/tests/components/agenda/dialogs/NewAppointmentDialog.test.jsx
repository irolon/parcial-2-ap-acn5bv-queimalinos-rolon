import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewAppointmentDialog from '@/components/agenda/dialogs/NewAppointmentDialog';
import { appt, freezeNow } from '../../../helpers/agenda/fixtures';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../../helpers/shared/fetchMock';

beforeEach(freezeNow);
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// Hoy (congelado) es miércoles 04/11 12:00 AR. Libres a las 13 y 14; turno pendiente a las 15 (18:00Z).
const FREE = [{ starts_at: '2026-11-04T16:00:00.000Z' }, { starts_at: '2026-11-04T17:00:00.000Z' }];
const BUSY = appt({ scheduled_at: '2026-11-04T18:00:00.000Z' });
const CANCELLED = appt({ id: 'a-2', scheduled_at: '2026-11-04T19:00:00.000Z', status: 'cancelled' });

function setup({ post } = {}) {
  const fetchMock = stubFetch(async (url, init) => {
    const path = url.replace(/^.*\/api/, '');
    if (init?.method === 'POST') return post ? post(init) : jsonResponse(201, { data: BUSY });
    if (path.startsWith('/students')) {
      return jsonResponse(200, { data: [{ id: 's-1', name: 'Lucía QA' }], meta: { total_pages: 1 } });
    }
    if (path.startsWith('/availability/free')) return jsonResponse(200, { data: FREE });
    return jsonResponse(200, { data: [BUSY, CANCELLED] });
  });
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <NewAppointmentDialog open onClose={onClose} />
    </QueryClientProvider>,
  );
  return { fetchMock, onClose };
}

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const option = (name) => screen.findByRole('option', { name });

async function fill(u, hour) {
  await option('Lucía QA');
  await u.selectOptions(screen.getByLabelText('Alumno'), 's-1');
  await option('14:00 · disponible');
  await u.selectOptions(screen.getByLabelText('Hora'), hour);
}

describe('NewAppointmentDialog', () => {
  it('marca disponibles, deshabilita ocupadas y pasadas; el cancelado no ocupa', async () => {
    setup();
    expect(await option('13:00 · disponible')).not.toBeDisabled();
    expect(await option('15:00 · ocupado')).toBeDisabled();
    expect(screen.getByRole('option', { name: '12:00' })).toBeDisabled();
    expect(screen.getByRole('option', { name: '16:00' })).not.toBeDisabled();
  });

  it('crea el turno con scheduled_at en UTC y la nota', async () => {
    const u = user();
    const { fetchMock, onClose } = setup();
    await fill(u, '13');
    await u.type(screen.getByLabelText('Nota (opcional)'), ' Traer toalla ');
    await u.click(screen.getByRole('button', { name: 'Agendar turno' }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const post = calls(fetchMock).find(([, init]) => init?.method === 'POST');
    expect(bodyOf(post[1])).toEqual({ student_id: 's-1', scheduled_at: '2026-11-04T16:00:00.000Z', notes: 'Traer toalla' });
  });

  it('sin alumno ni hora no manda nada', async () => {
    const u = user();
    const { fetchMock } = setup();
    await option('13:00 · disponible');
    await u.click(screen.getByRole('button', { name: 'Agendar turno' }));
    expect(screen.getByText('Elegí el alumno del turno')).toBeInTheDocument();
    expect(screen.getByText('Elegí una hora libre')).toBeInTheDocument();
    expect(calls(fetchMock).some(([, init]) => init?.method === 'POST')).toBe(false);
  });

  it('409 SLOT_TAKEN muestra "Ese horario ya está ocupado" y no cierra', async () => {
    const u = user();
    const { onClose } = setup({ post: async () => errorResponse(409, 'SLOT_TAKEN', 'Slot taken') });
    await fill(u, '14');
    await u.click(screen.getByRole('button', { name: 'Agendar turno' }));
    expect(await screen.findByText('Ese horario ya está ocupado')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('403 muestra el mensaje del servidor', async () => {
    const u = user();
    setup({ post: async () => errorResponse(403, 'FORBIDDEN', 'No podés agendar a ese alumno') });
    await fill(u, '14');
    await u.click(screen.getByRole('button', { name: 'Agendar turno' }));
    expect(await screen.findByText('No podés agendar a ese alumno')).toBeInTheDocument();
  });
});
