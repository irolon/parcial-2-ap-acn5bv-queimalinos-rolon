import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppointmentDialog from '@/components/agenda/AppointmentDialog';
import { appt, freezeNow } from '../../helpers/agenda/fixtures';
import { bodyOf, calls, errorResponse, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

beforeEach(freezeNow);
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function setup(appointment, handler) {
  const fetchMock = stubFetch(handler ?? (async () => jsonResponse(200, { data: { ...appointment, status: 'confirmed' } })));
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AppointmentDialog appointment={appointment} onClose={onClose} />
    </QueryClientProvider>,
  );
  return { fetchMock, onClose, client };
}

const user = () => userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
const button = (name) => screen.queryByRole('button', { name });

describe('AppointmentDialog', () => {
  it('muestra alumno, horario, estado y nota', () => {
    setup(appt({ notes: 'Trae la rodillera' }));
    expect(screen.getByText('Lucía QA')).toBeInTheDocument();
    expect(screen.getByText('Vie 06/11 · 18:00–19:00')).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Trae la rodillera')).toBeInTheDocument();
  });

  it('pendiente y futuro: Confirmar y Cancelar turno', () => {
    setup(appt());
    expect(button('Confirmar')).toBeInTheDocument();
    expect(button('Cancelar turno')).toBeInTheDocument();
  });

  it('en la vista angosta los botones llegan a 44 px de toque', () => {
    setup(appt());
    for (const name of ['Confirmar', 'Cancelar turno']) expect(button(name)).toHaveClass('max-md:h-11', 'max-md:min-w-11');
  });

  it('confirmado y futuro: solo Cancelar turno', () => {
    setup(appt({ status: 'confirmed' }));
    expect(button('Confirmar')).not.toBeInTheDocument();
    expect(button('Cancelar turno')).toBeInTheDocument();
  });

  it('cancelado: sin acciones', () => {
    setup(appt({ status: 'cancelled' }));
    expect(button('Confirmar')).not.toBeInTheDocument();
    expect(button('Cancelar turno')).not.toBeInTheDocument();
  });

  it('pasado: sin acciones y con el aviso', () => {
    setup(appt({ scheduled_at: '2026-11-03T21:00:00.000Z' }));
    expect(screen.getByText('Este turno ya pasó')).toBeInTheDocument();
    expect(button('Confirmar')).not.toBeInTheDocument();
    expect(button('Cancelar turno')).not.toBeInTheDocument();
  });

  it('pasado y confirmado: sin acciones', () => {
    setup(appt({ status: 'confirmed', scheduled_at: '2026-11-03T21:00:00.000Z' }));
    expect(screen.getByText('Este turno ya pasó')).toBeInTheDocument();
    expect(button('Cancelar turno')).not.toBeInTheDocument();
  });

  it('deshabilita Cancelar turno mientras se confirma', async () => {
    setup(appt(), () => new Promise(() => {}));
    await user().click(button('Confirmar'));
    expect(await screen.findByRole('button', { name: 'Cancelar turno' })).toBeDisabled();
  });

  it('un error del servidor invalida los turnos para refrescar la grilla', async () => {
    const { client } = setup(appt(), async () => errorResponse(409, 'INVALID_STATUS_TRANSITION', 'x'));
    const spy = vi.spyOn(client, 'invalidateQueries');
    await user().click(button('Confirmar'));
    await screen.findByRole('alert');
    expect(spy).toHaveBeenCalledWith({ queryKey: ['appointments'] });
  });

  it('Confirmar hace el PATCH y cierra', async () => {
    const { fetchMock, onClose } = setup(appt());
    await user().click(button('Confirmar'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    const [[path, init]] = calls(fetchMock);
    expect(path).toBe('/appointments/a-1');
    expect(init.method).toBe('PATCH');
    expect(bodyOf(init)).toEqual({ status: 'confirmed' });
  });

  it('Cancelar pide confirmación con el texto de la spec y no cancela hasta aceptar', async () => {
    const { fetchMock, onClose } = setup(appt());
    const u = user();
    await u.click(button('Cancelar turno'));
    expect(screen.getByText('¿Cancelar el turno de Lucía del vie 06/11 a las 18:00? Le avisamos.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    await u.click(button('Volver'));
    expect(button('Cancelar turno')).toBeInTheDocument();
    await u.click(button('Cancelar turno'));
    await u.click(button('Sí, cancelar turno'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(bodyOf(calls(fetchMock)[0][1])).toEqual({ status: 'cancelled' });
  });

  it('muestra inline el error del servidor y no cierra', async () => {
    const { onClose } = setup(appt(), async () =>
      errorResponse(409, 'INVALID_STATUS_TRANSITION', 'No se puede pasar el turno a ese estado'),
    );
    await user().click(button('Confirmar'));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede pasar el turno a ese estado');
    expect(onClose).not.toHaveBeenCalled();
  });
});
