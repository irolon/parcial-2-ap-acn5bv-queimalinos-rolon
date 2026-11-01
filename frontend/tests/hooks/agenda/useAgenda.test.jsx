import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  APPOINTMENTS_KEY,
  AVAILABILITY_KEY,
  appointmentsKey,
  freeKey,
  useAppointments,
  useAvailability,
  useCreateAppointment,
  useFreeSlots,
  useSaveAvailability,
  useUpdateAppointmentStatus,
} from '@/hooks/agenda/useAgenda';
import { configureClient } from '@/api/shared/client';
import { calls, jsonResponse, stubFetch } from '../../helpers/shared/fetchMock';

let queryClient;
const wrapper = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
const RANGE = ['2026-11-02', '2026-11-08'];

beforeEach(() => {
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  configureClient({ getToken: () => 'access-1' });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('claves', () => {
  it('appointmentsKey y freeKey cuelgan de las raíces', () => {
    expect(APPOINTMENTS_KEY).toEqual(['appointments']);
    expect(AVAILABILITY_KEY).toEqual(['availability']);
    expect(appointmentsKey(...RANGE)).toEqual(['appointments', ...RANGE]);
    expect(freeKey(...RANGE).slice(0, 1)).toEqual(AVAILABILITY_KEY);
  });
});

describe('queries', () => {
  it('useAppointments, useAvailability y useFreeSlots devuelven data', async () => {
    stubFetch(async (url) => {
      if (url.includes('/appointments')) return jsonResponse(200, { data: [{ id: 'a-1' }] });
      if (url.includes('/free')) return jsonResponse(200, { data: [{ starts_at: 'x' }] });
      return jsonResponse(200, { data: [{ weekday: 1, start_time: '09:00', end_time: '10:00' }] });
    });
    const appts = renderHook(() => useAppointments(...RANGE), { wrapper });
    const avail = renderHook(() => useAvailability(), { wrapper });
    const free = renderHook(() => useFreeSlots(...RANGE), { wrapper });
    await waitFor(() => expect(appts.result.current.data).toEqual([{ id: 'a-1' }]));
    await waitFor(() => expect(avail.result.current.data).toHaveLength(1));
    await waitFor(() => expect(free.result.current.data).toEqual([{ starts_at: 'x' }]));
  });

  it('no consulta sin from/to', () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: [] }));
    renderHook(() => useAppointments(null, null), { wrapper });
    renderHook(() => useFreeSlots(undefined, undefined), { wrapper });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('mutaciones', () => {
  const seed = () => {
    queryClient.setQueryData(appointmentsKey(...RANGE), []);
    queryClient.setQueryData(freeKey(...RANGE), []);
    queryClient.setQueryData(AVAILABILITY_KEY, []);
  };
  const stale = (key) => queryClient.getQueryState(key).isInvalidated;

  it('useCreateAppointment invalida turnos y horarios libres', async () => {
    stubFetch(async () => jsonResponse(201, { data: { id: 'a-1' } }));
    seed();
    const { result } = renderHook(() => useCreateAppointment(), { wrapper });
    await act(() => result.current.mutateAsync({ student_id: 's-1', scheduled_at: 'x' }));
    expect(stale(appointmentsKey(...RANGE))).toBe(true);
    expect(stale(freeKey(...RANGE))).toBe(true);
  });

  it('useUpdateAppointmentStatus manda { id, status } e invalida', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, { data: { id: 'a-1' } }));
    seed();
    const { result } = renderHook(() => useUpdateAppointmentStatus(), { wrapper });
    await act(() => result.current.mutateAsync({ id: 'a-1', status: 'confirmed' }));
    expect(calls(fetchMock)[0][0]).toBe('/appointments/a-1');
    expect(stale(appointmentsKey(...RANGE))).toBe(true);
    expect(stale(freeKey(...RANGE))).toBe(true);
  });

  it('useSaveAvailability invalida disponibilidad y horarios libres, no los turnos', async () => {
    stubFetch(async () => jsonResponse(200, { data: [] }));
    seed();
    const { result } = renderHook(() => useSaveAvailability(), { wrapper });
    await act(() => result.current.mutateAsync([]));
    expect(stale(AVAILABILITY_KEY)).toBe(true);
    expect(stale(freeKey(...RANGE))).toBe(true);
    expect(stale(appointmentsKey(...RANGE))).toBe(false);
  });
});
