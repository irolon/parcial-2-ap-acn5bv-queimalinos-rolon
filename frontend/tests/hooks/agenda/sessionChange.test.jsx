import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { useClearCacheOnSessionChange } from '@/hooks/auth/useClearCacheOnSessionChange';
import { useAppointments, useAvailability } from '@/hooks/agenda/useAgenda';
import { configureClient } from '@/api/shared/client';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

const PT_A = { id: 't-a', name: 'A', role: 'trainer' };
const PT_B = { id: 't-b', name: 'B', role: 'trainer' };
const RANGE = ['2026-11-02', '2026-11-08'];

let queryClient;
const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

/** La agenda montada: turnos de la semana y disponibilidad, como en AgendaPage. */
const renderAgenda = () =>
  renderHook(() => ({ appts: useAppointments(...RANGE), avail: useAvailability() }), { wrapper });

beforeEach(() => {
  resetAuthStore();
  useAuthStore.setState({ user: PT_A, token: 'access-a', status: 'authenticated' });
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureClient({ getToken: () => useAuthStore.getState().token });
  renderHook(() => useClearCacheOnSessionChange(queryClient));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('agenda al cambiar de cuenta sin recargar', () => {
  it('B no ve los turnos ni la disponibilidad de A mientras carga los suyos', async () => {
    let user = 'A';
    stubFetch(async (url) => {
      if (user === 'B') return new Promise(() => {});
      if (url.includes('/appointments')) return jsonResponse(200, { data: [{ id: 'turno-de-A' }] });
      return jsonResponse(200, { data: [{ weekday: 1, start_time: '09:00', end_time: '12:00' }] });
    });
    const agendaA = renderAgenda();
    await waitFor(() => expect(agendaA.result.current.appts.data).toEqual([{ id: 'turno-de-A' }]));
    await waitFor(() => expect(agendaA.result.current.avail.data).toHaveLength(1));
    agendaA.unmount();

    user = 'B';
    act(() => useAuthStore.setState({ user: PT_B, token: 'access-b' }));
    const agendaB = renderAgenda();
    expect(agendaB.result.current.appts.data).toBeUndefined();
    expect(agendaB.result.current.appts.isPending).toBe(true);
    expect(agendaB.result.current.avail.data).toBeUndefined();
  });
});
