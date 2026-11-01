import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuthStore } from '@/hooks/auth/useAuthStore';
import { MY_ROUTINES_KEY, TODAY_ROUTINE_KEY, useMyRoutines, useTodayRoutine } from '@/hooks/routines/useStudentRoutines';
import { resetAuthStore } from '../../helpers/auth/authStore';
import { mineRoutine, stubStudentRoutines, todayRoutine } from '../../helpers/routines/studentRoutines';
import { calls } from '../../helpers/shared/fetchMock';

const TOMAS = { id: 's-1', name: 'Tomás Ruiz', role: 'student' };
const LUCIA = { id: 's-2', name: 'Lucía Gómez', role: 'student' };

const signIn = (user) =>
  useAuthStore.setState({ user, token: user ? 'access-1' : null, refreshToken: 'refresh-1', status: user ? 'authenticated' : 'anonymous' });

function renderQuery(hook) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, ...renderHook(hook, { wrapper }) };
}

beforeEach(() => {
  resetAuthStore();
  signIn(TOMAS);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('useTodayRoutine', () => {
  it('pide la rutina del día y la entrega con la forma normalizada', async () => {
    const fetchMock = stubStudentRoutines({ today: todayRoutine() });
    const { result } = renderQuery(() => useTodayRoutine());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/routines/today']);
    expect(result.current.data.routine_id).toBe('r-1');
    expect(result.current.data.exercises[0].last_session_kg).toBe(62.5);
    expect(result.current.data.exercises[1].last_session_kg).toBeNull();
  });

  it('un día de descanso es éxito con data en null, no un error', async () => {
    stubStudentRoutines({ today: null });
    const { result } = renderQuery(() => useTodayRoutine());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('un error del servidor queda como error para poder reintentar', async () => {
    stubStudentRoutines({ today: 500 });
    const { result } = renderQuery(() => useTodayRoutine());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error.status).toBe(500);
  });

  it('sin sesión iniciada no pide nada', async () => {
    signIn(null);
    const fetchMock = stubStudentRoutines({ today: todayRoutine() });
    const { result } = renderQuery(() => useTodayRoutine());
    await act(() => Promise.resolve());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('la caché es por alumno: otro alumno en la misma pestaña no ve la rutina del anterior', async () => {
    let answer = todayRoutine({ name: 'Rutina de Tomás' });
    stubStudentRoutines({ today: () => answer });
    const { result } = renderQuery(() => useTodayRoutine());
    await waitFor(() => expect(result.current.data?.name).toBe('Rutina de Tomás'));

    answer = todayRoutine({ name: 'Rutina de Lucía' });
    act(() => signIn(LUCIA));
    expect(result.current.data).toBeUndefined();
    await waitFor(() => expect(result.current.data?.name).toBe('Rutina de Lucía'));
  });

  it('invalidar TODAY_ROUTINE_KEY (sin el alumno) la vuelve a pedir', async () => {
    const fetchMock = stubStudentRoutines({ today: todayRoutine() });
    const { result, client } = renderQuery(() => useTodayRoutine());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(() => client.invalidateQueries({ queryKey: TODAY_ROUTINE_KEY }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});

describe('useMyRoutines', () => {
  it('pide las rutinas activas con la misma forma que la del día', async () => {
    const fetchMock = stubStudentRoutines({ mine: [mineRoutine(), mineRoutine({ routine_id: 'r-2', name: 'Pierna' })] });
    const { result } = renderQuery(() => useMyRoutines());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calls(fetchMock).map(([path]) => path)).toEqual(['/routines/mine']);
    expect(result.current.data.map((r) => r.routine_id)).toEqual(['r-1', 'r-2']);
    expect(result.current.data[0].exercises.map((e) => e.last_session_kg)).toEqual([null, null]);
  });

  it('un alumno sin rutinas asignadas es éxito con una lista vacía', async () => {
    stubStudentRoutines({ mine: [] });
    const { result } = renderQuery(() => useMyRoutines());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('sin sesión iniciada no pide nada', async () => {
    signIn(null);
    const fetchMock = stubStudentRoutines({ mine: [mineRoutine()] });
    renderQuery(() => useMyRoutines());
    await act(() => Promise.resolve());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('la caché es por alumno y se invalida con MY_ROUTINES_KEY', async () => {
    const fetchMock = stubStudentRoutines({ mine: [mineRoutine()] });
    const { result, client } = renderQuery(() => useMyRoutines());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(client.getQueryData([...MY_ROUTINES_KEY, 's-1'])).toHaveLength(1);
    await act(() => client.invalidateQueries({ queryKey: MY_ROUTINES_KEY }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
